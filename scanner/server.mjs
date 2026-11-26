import { createServer } from 'node:http';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import net from 'node:net';

const port = Number(process.env.PORT || 3000);
const maxBytes = 10 * 1024 * 1024;
const hmacSecret = process.env.LAND_SCAN_HMAC_SECRET || '';
const supabaseUrl = process.env.SUPABASE_URL || '';
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const scanPath = new RegExp(`^${uuid}/(?:${uuid}/|drafts/${uuid}/)(?:occupancy|assignment|lease|survey|other)-${uuid}\\.(?:pdf|jpg|png)$`, 'i');
const usedTickets = new Map();

function mac(value) {
  return createHmac('sha256', hmacSecret).update(value, 'utf8').digest('hex');
}

function equalHex(left, right) {
  if (!/^[0-9a-f]{64}$/i.test(left || '') || !/^[0-9a-f]{64}$/i.test(right || '')) return false;
  return timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

function ticketPayload(ticket) {
  return ['v1', ticket.kind, ticket.record_id, ticket.owner_id, ticket.object_path, String(ticket.expires_at)].join('\n');
}

function send(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body), 'cache-control': 'no-store' });
  res.end(body);
}

async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 24 * 1024) throw Object.assign(new Error('Request too large'), { status: 413 });
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function downloadFile(url, expectedPath) {
  const configured = new URL(supabaseUrl);
  const candidate = new URL(url);
  const prefix = '/storage/v1/object/sign/farmshield-land-documents/';
  if (candidate.origin !== configured.origin || candidate.username || candidate.password || !candidate.pathname.startsWith(prefix) || !candidate.searchParams.get('token')) {
    throw new Error('Invalid private storage URL');
  }
  let encodedPath = candidate.pathname.slice(prefix.length);
  let actualPath;
  try { actualPath = decodeURIComponent(encodedPath); } catch { throw new Error('Invalid object path'); }
  if (actualPath !== expectedPath || !scanPath.test(actualPath)) throw new Error('Storage URL does not match the scan ticket');

  const response = await fetch(candidate, { redirect: 'error', signal: AbortSignal.timeout(90_000) });
  if (!response.ok || !response.body) throw new Error('Private file could not be read');
  const length = Number(response.headers.get('content-length') || 0);
  if (length > maxBytes) throw new Error('File exceeds scan limit');
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error('File exceeds scan limit');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}

function checkFileSignature(path, bytes) {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  if (ext === 'pdf') return bytes.subarray(0, 1024).includes(Buffer.from('%PDF-'));
  if (ext === 'jpg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (ext === 'png') return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  return false;
}

function clamdCommand(command, file) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ host: '127.0.0.1', port: 3310 });
    const parts = [];
    let done = false;
    const finish = (error, result) => {
      if (done) return;
      done = true;
      socket.destroy();
      error ? reject(error) : resolve(result);
    };
    socket.setTimeout(110_000, () => finish(new Error('ClamAV scan timed out')));
    socket.on('error', error => finish(error));
    socket.on('data', chunk => {
      parts.push(chunk);
      const response = Buffer.concat(parts).toString('utf8');
      if (response.includes('\0')) finish(null, response.replace(/\0/g, '').trim());
    });
    socket.on('connect', () => {
      socket.write(Buffer.from(`z${command}\0`));
      if (command === 'VERSION') return;
      for (let offset = 0; offset < file.length; offset += 64 * 1024) {
        const chunk = file.subarray(offset, Math.min(offset + 64 * 1024, file.length));
        const header = Buffer.alloc(4);
        header.writeUInt32BE(chunk.length);
        socket.write(header);
        socket.write(chunk);
      }
      socket.end(Buffer.alloc(4));
    });
  });
}

async function waitForClamd() {
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const version = await clamdCommand('VERSION');
      if (version.includes('ClamAV')) return version.slice(0, 200);
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  throw new Error('ClamAV did not become ready');
}

let engineVersion = '';
let selfTestPassed = false;
const server = createServer(async (req, res) => {
  if (req.method === 'GET' && (req.url === '/healthz' || req.url === '/')) {
    return send(res, engineVersion && selfTestPassed ? 200 : 503, { ready: Boolean(engineVersion && selfTestPassed), self_test_passed: selfTestPassed, engine: engineVersion || undefined });
  }
  if (req.method !== 'POST' || req.url !== '/internal/malware-scan/scan') return send(res, 404, { error: 'Not found' });
  if (!hmacSecret || !supabaseUrl) return send(res, 503, { error: 'Scanner is not configured' });

  let body;
  try { body = await readJson(req); } catch (error) { return send(res, error.status || 400, { error: 'Invalid scan request' }); }
  const ticket = body?.ticket;
  if (!ticket || !['draft', 'document'].includes(ticket.kind) || !new RegExp(`^${uuid}$`, 'i').test(ticket.record_id || '') || !new RegExp(`^${uuid}$`, 'i').test(ticket.owner_id || '') || !scanPath.test(ticket.object_path || '')) {
    return send(res, 400, { error: 'Invalid scan ticket' });
  }
  if (Number(ticket.expires_at) < Math.floor(Date.now() / 1000) || Number(ticket.expires_at) > Math.floor(Date.now() / 1000) + 360) {
    return send(res, 401, { error: 'Scan ticket expired' });
  }
  if (!equalHex(mac(ticketPayload(ticket)), ticket.ticket_signature)) return send(res, 401, { error: 'Scan ticket rejected' });
  if (usedTickets.has(ticket.ticket_signature)) return send(res, 409, { error: 'Scan ticket already used' });
  usedTickets.set(ticket.ticket_signature, Date.now() + 6 * 60 * 1000);
  for (const [signature, expires] of usedTickets) if (expires < Date.now()) usedTickets.delete(signature);

  try {
    const bytes = await downloadFile(body.download_url, ticket.object_path);
    if (!bytes.length || !checkFileSignature(ticket.object_path, bytes)) return send(res, 422, { error: 'File content does not match its allowed document type' });
    const result = await clamdCommand('INSTREAM', bytes);
    let verdict;
    if (result.endsWith(' OK')) verdict = 'clean';
    else if (result.endsWith(' FOUND')) verdict = 'infected';
    else throw new Error('ClamAV returned an unknown result');

    const scannedAt = new Date().toISOString();
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    const receipt = {
      kind: ticket.kind,
      record_id: ticket.record_id,
      owner_id: ticket.owner_id,
      object_path: ticket.object_path,
      expires_at: Number(ticket.expires_at),
      ticket_signature: ticket.ticket_signature,
      verdict,
      sha256,
      engine_version: engineVersion,
      scanned_at: scannedAt,
    };
    const payload = ['v1', receipt.kind, receipt.record_id, receipt.owner_id, receipt.object_path, sha256, verdict, engineVersion, scannedAt].join('\n');
    return send(res, 200, { ...receipt, signature: mac(payload) });
  } catch (error) {
    console.error('ClamAV scan failed', error instanceof Error ? error.message : 'unknown error');
    return send(res, 503, { error: 'Malware scan failed' });
  }
});

waitForClamd().then(version => {
  engineVersion = version;
  return clamdCommand('INSTREAM', Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*', 'ascii'));
}).then(result => {
  if (!result.endsWith(' FOUND')) throw new Error('ClamAV EICAR self-test failed');
  selfTestPassed = true;
  server.listen(port, '0.0.0.0');
}).catch(error => {
  console.error(error.message);
  process.exit(1);
});

