import {ApiError,LOCATIONS} from './providers.mjs';
import {NASA_REGIONS,BOUNDARY_SOURCE} from '../shared/nigeria-regions.mjs';
const validRegion=location=>Object.hasOwn(NASA_REGIONS,location)||Object.hasOwn(LOCATIONS,location);
const DAY=86400000;
const PNG=[137,80,78,71,13,10,26,10];
const LAYER='MODIS_Terra_CorrectedReflectance_TrueColor';
export function nasaDateRange(now=Date.now()){
  return {min:new Date(now-30*DAY).toISOString().slice(0,10),max:new Date(now-DAY).toISOString().slice(0,10)};
}
export function validateNasaQuery(location,date,now=Date.now()){
  if(!validRegion(location))throw new ApiError(400,'INVALID_LOCATION','Select a Nigerian state, zone or national view.');
  const range=nasaDateRange(now);
  if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date||date<range.min||date>range.max)throw new ApiError(400,'INVALID_DATE',`Choose an imagery day from ${range.min} to ${range.max}.`);
}
export function buildNasaUrl(location,date){
  const target=NASA_REGIONS[location]||LOCATIONS[location];
  const {latitude:lat,longitude:lon}=target;
  const bbox=(target.bbox||[lon-.5,lat-.5,lon+.5,lat+.5]).map(n=>Number(n.toFixed(6)));
  const ratio=(bbox[2]-bbox[0])/(bbox[3]-bbox[1]);
  const width=ratio>=1?768:Math.max(128,Math.round(768*ratio));
  const height=ratio>=1?Math.max(128,Math.round(768/ratio)):768;
  const url=new URL('https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi');
  url.search=new URLSearchParams({SERVICE:'WMS',REQUEST:'GetMap',VERSION:'1.1.1',LAYERS:LAYER,STYLES:'',FORMAT:'image/png',TRANSPARENT:'TRUE',WIDTH:String(width),HEIGHT:String(height),SRS:'EPSG:4326',BBOX:bbox.join(','),TIME:date});
  return {url,bbox,width,height};
}
export function createNasaService({fetchImpl=fetch,now=()=>Date.now(),timeoutMs=20000}={}){
  const cache=new Map(),pending=new Map();
  async function load(location,date){
    validateNasaQuery(location,date,now());
    const key=location+':'+date,hit=cache.get(key);
    if(hit&&now()-hit.time<60*60*1000)return {...hit.value,cached:true};
    if(pending.has(key))return pending.get(key);
    const task=(async()=>{
      try{
        const {url,bbox,width,height}=buildNasaUrl(location,date);
        const response=await fetchImpl(url,{headers:{accept:'image/png'},signal:AbortSignal.timeout(timeoutMs)});
        if(!response.ok||!response.headers.get('content-type')?.toLowerCase().includes('image/png'))throw Error('Not an image');
        if(Number(response.headers.get('content-length'))>4*1024*1024)throw Error('Image too large');
        const bytes=new Uint8Array(await response.arrayBuffer());
        const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
        if(bytes.length<24||bytes.length>4*1024*1024||PNG.some((b,i)=>bytes[i]!==b)||view.getUint32(16)!==width||view.getUint32(20)!==height)throw Error('Invalid image');
        const metadata={provider:'NASA GIBS',sourceUrl:'https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api',layer:LAYER,layerName:'Terra / MODIS true colour',requestedDate:date,fetchedAt:new Date(now()).toISOString(),location:NASA_REGIONS[location]||LOCATIONS[location],bbox,width,height,projection:'EPSG:4326',nominalResolutionMetres:250,boundarySource:NASA_REGIONS[location]?BOUNDARY_SOURCE:null,dateRange:nasaDateRange(now()),imageUrl:`/api/nasa-image?location=${encodeURIComponent(location)}&date=${date}`,
          limitations:['Regional browse imagery, not a measurement of an individual field.','Requested imagery day is not an exact acquisition timestamp; data coverage and availability vary.','Cloud, haze, sensor artefacts and no-data areas can obscure the surface. Blank or black areas do not establish drought.','No NDVI, soil moisture, land-surface temperature or yield estimate has been calculated.'],
          attribution:"Imagery provided by NASA's Global Imagery Browse Services (GIBS), part of NASA ESDIS."};
        const value={metadata,bytes};
        if(cache.size>=64)cache.delete(cache.keys().next().value);
        cache.set(key,{time:now(),value});return {...value,cached:false};
      }catch{throw new ApiError(502,'NASA_UNAVAILABLE','NASA imagery is unavailable for this request. Try another day or retry shortly.');}
    })();pending.set(key,task);
    try{return await task;}finally{pending.delete(key);}
  }
  return {describe:async(location,date)=>{const result=await load(location,date);return {...result.metadata,cached:result.cached};},image:async(location,date)=>(await load(location,date)).bytes};
}
