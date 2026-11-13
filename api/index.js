import {createApi, createDataService} from '../server/providers.mjs';
import {createNasaService} from '../server/nasa.mjs';

const handle = createApi(createDataService({
  apiKey: process.env.OPEN_METEO_API_KEY || '',
  mode: process.env.WEATHER_ACCESS_MODE || 'evaluation',
  production: process.env.NODE_ENV === 'production',
}), createNasaService());

export default {fetch: handle};
