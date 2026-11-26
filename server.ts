import {createServer} from 'node:http';
import {createApi, createDataService} from './server/providers.mjs';
import {createNasaService} from './server/nasa.mjs';

const handle = createApi(createDataService({
  weatherProvider: process.env.WEATHER_PROVIDER || 'met-norway',
  apiKey: process.env.OPEN_METEO_API_KEY || '',
  mode: process.env.WEATHER_ACCESS_MODE || 'evaluation',
  production: process.env.NODE_ENV === 'production',
}), createNasaService());

const server = createServer(async (incoming, outgoing) => {
  try {
    const host = incoming.headers.host || 'localhost';
    const forwardedProto = incoming.headers['x-forwarded-proto'];
    const protocol = Array.isArray(forwardedProto) ? forwardedProto[0] : forwardedProto || 'https';
    const headers = new Headers();
    for (const [name, value] of Object.entries(incoming.headers)) {
      if (typeof value === 'string') headers.set(name, value);
      else if (Array.isArray(value)) headers.set(name, value.join(', '));
    }

    const request = new Request(new URL(incoming.url || '/', protocol + '://' + host), {
      method: incoming.method || 'GET',
      headers,
    });
    const response = await handle(request);
    response.headers.forEach((value, name) => outgoing.setHeader(name, value));
    outgoing.statusCode = response.status;
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    outgoing.statusCode = 500;
    outgoing.setHeader('content-type', 'application/json; charset=utf-8');
    outgoing.end(JSON.stringify({error:{code:'INTERNAL_ERROR',message:'Request could not be completed.'}}));
  }
});

server.listen(Number(process.env.PORT) || 3000, '0.0.0.0');
