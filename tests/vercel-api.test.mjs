import assert from 'node:assert/strict';
import test from 'node:test';
import api from '../api/index.js';

test('Vercel entrypoint serves the actual health API', async () => {
  const response = await api.fetch(new Request('https://farmshield.test/api/health'));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {status: 'ok', version: 1});
});

test('Vercel entrypoint preserves API errors and method restrictions', async () => {
  assert.equal((await api.fetch(new Request('https://farmshield.test/api/missing'))).status, 404);
  const response = await api.fetch(new Request('https://farmshield.test/api/health', {method:'POST'}));
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'GET');
});
