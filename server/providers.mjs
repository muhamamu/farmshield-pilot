import {REGIONS,ZONES,BOUNDARY_SOURCE} from '../shared/nigeria-regions.mjs';
export const LOCATIONS = Object.freeze({
  kano: {name:'Kano reference point', latitude:12.0022, longitude:8.5920},
  kaduna: {name:'Kaduna reference point', latitude:10.5105, longitude:7.4165},
  ibadan: {name:'Ibadan reference point', latitude:7.3775, longitude:3.9470},
  abuja: {name:'Abuja reference point', latitude:9.0765, longitude:7.3986},
});
export class ApiError extends Error {
  constructor(status, code, message){super(message);this.status=status;this.code=code;}
}
const finite = value => typeof value==='number'&&Number.isFinite(value)?value:null;
const isoDate = value => typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value);
function assertArray(value,length){if(!Array.isArray(value)||value.length!==length)throw new Error('Invalid provider series');}

export function normalizeWeather(raw, location, fetchedAt, mode){
  const daily=raw?.daily, dates=daily?.time;
  if(raw?.timezone!=='Africa/Lagos'||!Array.isArray(dates)||dates.length!==7||!dates.every(isoDate))throw new Error('Invalid weather response');
  const variables=['temperature_2m_max','temperature_2m_min','precipitation_sum','et0_fao_evapotranspiration'];
  for(const key of variables)assertArray(daily[key],dates.length);
  const expectedUnits={temperature_2m_max:'°C',temperature_2m_min:'°C',precipitation_sum:'mm',et0_fao_evapotranspiration:'mm'};
  if(Object.entries(expectedUnits).some(([key,unit])=>raw.daily_units?.[key]!==unit))throw new Error('Unexpected weather units');
  return {
    provider:'Open-Meteo',sourceUrl:'https://open-meteo.com/',accessMode:mode,
    fetchedAt, timezone:'Africa/Lagos',location,
    gridPoint:{latitude:finite(raw.latitude),longitude:finite(raw.longitude)},
    current:raw.current&&typeof raw.current.time==='string'?{
      validAt:raw.current.time,
      temperatureC:raw.current_units?.temperature_2m==='°C'?finite(raw.current.temperature_2m):null,
      relativeHumidityPct:raw.current_units?.relative_humidity_2m==='%'?finite(raw.current.relative_humidity_2m):null,
    }:null,
    days:dates.map((date,i)=>({date,maxTemperatureC:finite(daily.temperature_2m_max[i]),minTemperatureC:finite(daily.temperature_2m_min[i]),precipitationMm:finite(daily.precipitation_sum[i]),referenceEt0Mm:finite(daily.et0_fao_evapotranspiration[i])})),
    limitations:['Modelled regional weather, not a sensor reading from a farm.','Reference ET₀ is not a crop-specific irrigation dose.','Weather alone does not establish safe working conditions or diagnose crop stress.'],
  };
}

export function normalizeScenes(raw,location,fetchedAt,period,bbox){
  if(raw?.type!=='FeatureCollection'||!Array.isArray(raw.features))throw new Error('Invalid STAC response');
  const scenes=raw.features.slice(0,5).map(feature=>{
    const acquiredAt=feature.properties?.datetime;
    if(typeof feature.id!=='string'||typeof acquiredAt!=='string'||!Number.isFinite(Date.parse(acquiredAt)))throw new Error('Invalid scene metadata');
    const cloud=finite(feature.properties?.['eo:cloud_cover']);
    return {id:feature.id,acquiredAt,cloudCoverPct:cloud!==null&&cloud>=0&&cloud<=100?cloud:null,collection:'sentinel-2-l2a'};
  }).sort((a,b)=>Date.parse(b.acquiredAt)-Date.parse(a.acquiredAt));
  return {provider:'Copernicus Data Space',sourceUrl:'https://dataspace.copernicus.eu/',fetchedAt,location,period,bbox,collection:'sentinel-2-l2a',scenes,
    limitations:['Scene discovery only: imagery pixels and vegetation indices have not been processed.','Cloud cover describes the whole scene, not this location or a farm.','Search uses a regional box, not a registered farm boundary.']};
}

export function createDataService({fetchImpl=fetch,now=()=>Date.now(),apiKey='',mode='evaluation',production=false,timeoutMs=15000}={}){
  const cache=new Map(),pending=new Map();
  async function json(url){
    const response=await fetchImpl(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(timeoutMs)});
    if(!response.ok)throw new Error('Provider unavailable');
    return response.json();
  }
  async function get(kind,id){
    const location=LOCATIONS[id];
    if(!Object.hasOwn(LOCATIONS,id))throw new ApiError(400,'INVALID_LOCATION','Select a supported Nigerian reference point.');
    if(!['weather','satellite-scenes'].includes(kind))throw new ApiError(404,'NOT_FOUND','Endpoint not found.');
    if(kind==='weather'&&((mode!=='evaluation'&&mode!=='commercial')||((production||mode==='commercial')&&!apiKey)))throw new ApiError(503,'WEATHER_CONFIGURATION_REQUIRED','Commercial weather access requires a server-side Open-Meteo API key.');
    const key=kind+':'+id,ttl=kind==='weather'?15*60*1000:60*60*1000;
    const hit=cache.get(key);
    if(hit&&now()-hit.time<ttl)return {...hit.data,cached:true};
    if(pending.has(key))return pending.get(key);
    const task=(async()=>{
      try{
        const fetchedAt=new Date(now()).toISOString();let data;
        if(kind==='weather'){
          const paid=Boolean(apiKey),url=new URL(paid?'https://customer-api.open-meteo.com/v1/forecast':'https://api.open-meteo.com/v1/forecast');
          url.search=new URLSearchParams({latitude:String(location.latitude),longitude:String(location.longitude),timezone:'Africa/Lagos',current:'temperature_2m,relative_humidity_2m',daily:'temperature_2m_max,temperature_2m_min,precipitation_sum,et0_fao_evapotranspiration',forecast_days:'7',temperature_unit:'celsius',precipitation_unit:'mm'});
          if(paid)url.searchParams.set('apikey',apiKey);
          data=normalizeWeather(await json(url),location,fetchedAt,paid?'commercial':'evaluation');
        }else{
          const {latitude:lat,longitude:lon}=location;
          const bbox=[lon-.05,lat-.05,lon+.05,lat+.05].map(n=>Number(n.toFixed(5)));
          const period={from:new Date(now()-30*24*60*60*1000).toISOString(),to:fetchedAt};
          const url=new URL('https://stac.dataspace.copernicus.eu/v1/search');
          url.search=new URLSearchParams({collections:'sentinel-2-l2a',bbox:bbox.join(','),datetime:period.from+'/'+period.to,limit:'5',sortby:'-properties.datetime'});
          data=normalizeScenes(await json(url),location,fetchedAt,period,bbox);
        }
        cache.set(key,{time:now(),data});return {...data,cached:false};
      }catch(error){
        // Never expose provider URLs, credentials, error bodies or stack traces.
        if(error instanceof ApiError)throw error;
        throw new ApiError(502,'PROVIDER_UNAVAILABLE','The data provider could not be reached or returned an invalid response. Try again shortly.');
      }
    })();
    pending.set(key,task);
    try{return await task;}finally{pending.delete(key);}
  }
  return {get};
}

export function createApi(service,nasa){
  return async request=>{
    const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store'};
    try{
      const url=new URL(request.url);
      if(request.method!=='GET')return new Response(JSON.stringify({error:{code:'METHOD_NOT_ALLOWED',message:'Use GET.'}}),{status:405,headers:{...headers,allow:'GET'}});
      if(url.pathname==='/api/health')return Response.json({status:'ok',version:1},{headers});
      if(url.pathname==='/api/nasa-regions')return Response.json({regions:REGIONS,zones:ZONES.map(({id,name})=>({id,name})),boundarySource:BOUNDARY_SOURCE},{headers});
      if(['/api/nasa-imagery','/api/nasa-image'].includes(url.pathname)){
        if([...url.searchParams.keys()].some(key=>!['location','date'].includes(key))||url.searchParams.getAll('location').length!==1||url.searchParams.getAll('date').length!==1)throw new ApiError(400,'INVALID_QUERY','Provide one location and one date parameter.');
        if(!nasa)throw new ApiError(503,'NASA_NOT_CONFIGURED','NASA imagery service is not configured.');
        const location=url.searchParams.get('location'),date=url.searchParams.get('date');
        if(url.pathname==='/api/nasa-image')return new Response(await nasa.image(location,date),{headers:{'content-type':'image/png','cache-control':'private, max-age=3600','x-content-type-options':'nosniff'}});
        return Response.json(await nasa.describe(location,date),{headers});
      }
      const match=/^\/api\/(weather|satellite-scenes)$/.exec(url.pathname);
      if(!match)throw new ApiError(404,'NOT_FOUND','Endpoint not found.');
      if([...url.searchParams.keys()].some(key=>key!=='location')||url.searchParams.getAll('location').length!==1)throw new ApiError(400,'INVALID_QUERY','Provide one location parameter.');
      return Response.json(await service.get(match[1],url.searchParams.get('location')),{headers});
    }catch(error){
      const known=error instanceof ApiError;
      return Response.json({error:{code:known?error.code:'INTERNAL_ERROR',message:known?error.message:'Request could not be completed.'}},{status:known?error.status:500,headers});
    }
  };
}
