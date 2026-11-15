const HOUR=3600000,DAY=24*HOUR;
const finite=value=>typeof value==='number'&&Number.isFinite(value)?value:null;
export const MET_SOURCE='https://www.met.no/en';
export const MET_LICENSE='https://creativecommons.org/licenses/by/4.0/';
export const MET_AGENT='FarmShield/1.0 https://github.com/muhamamu/farmshield-pilot';
export function metPoint(location){return {latitude:Math.trunc(location.latitude*10000)/10000,longitude:Math.trunc(location.longitude*10000)/10000};}
export function normalizeMetWeather(raw,location,fetchedAt){
 const props=raw?.properties,units=props?.meta?.units,series=props?.timeseries;
 if(raw?.type!=='Feature'||units?.air_temperature!=='celsius'||units?.precipitation_amount!=='mm'||!Array.isArray(series)||!series.length)throw Error('Invalid MET forecast');
 const entries=series.map(row=>({...row,stamp:Date.parse(row.time)})).sort((a,b)=>a.stamp-b.stamp);
 if(entries.some((row,i)=>!Number.isFinite(row.stamp)||i>0&&row.stamp===entries[i-1].stamp))throw Error('Invalid forecast times');
 const now=Date.parse(fetchedAt),start=Math.floor(now/DAY)*DAY+DAY;
 const byTime=new Map(entries.map(row=>[row.stamp,row]));
 const days=Array.from({length:7},(_,i)=>{
  const from=start+i*DAY,to=from+DAY,samples=entries.filter(row=>row.stamp>=from&&row.stamp<to),temperatures=samples.map(row=>finite(row.data?.instant?.details?.air_temperature));
  let cursor=from,rain=0;
  while(cursor<to){const row=byTime.get(cursor);let step=null;
   for(const hours of [1,6,12]){const amount=finite(row?.data?.['next_'+hours+'_hours']?.details?.precipitation_amount);if(amount!==null&&amount>=0&&cursor+hours*HOUR<=to){step={hours,amount};break;}}
   if(!step){rain=null;break;}rain+=step.amount;cursor+=step.hours*HOUR;
  }
  // Sampled temperature ranges are not a daily extrema product.
  const usable=temperatures.length>=4&&temperatures.every(value=>value!==null)&&samples[0]?.stamp===from&&samples.at(-1)?.stamp>=to-6*HOUR;
  return {date:new Date(from).toISOString().slice(0,10),periodStart:new Date(from).toISOString(),periodEnd:new Date(to).toISOString(),maxTemperatureC:usable?Math.max(...temperatures):null,minTemperatureC:usable?Math.min(...temperatures):null,precipitationMm:rain,referenceEt0Mm:null};
 });
 if(!days.some(day=>day.maxTemperatureC!==null))throw Error('No usable forecast');
 const current=entries.find(row=>row.stamp>=now-HOUR&&row.stamp<=now+HOUR),details=current?.data?.instant?.details;
 const sixHourRain=finite(current?.data?.next_6_hours?.details?.precipitation_amount);
 const point=raw.geometry?.coordinates;
 return {provider:'MET Norway',sourceUrl:MET_SOURCE,licenseUrl:MET_LICENSE,accessMode:'open-data',fetchedAt,generatedAt:props.meta.updated_at,timezone:'Africa/Lagos',location:{...location,...metPoint(location)},gridPoint:{latitude:finite(point?.[1]),longitude:finite(point?.[0])},temperatureBasis:'sampled',periodLabel:'Forecast days run from 01:00 to 01:00 WAT. Temperature ranges use forecast samples; daily extremes may differ.',current:current?{validAt:current.time,temperatureC:finite(details?.air_temperature),relativeHumidityPct:units.relative_humidity==='%'?finite(details?.relative_humidity):null,precipitationNext6HoursMm:sixHourRain!==null&&sixHourRain>=0?sixHourRain:null}:null,days,limitations:['Model forecast, not a field sensor.','Daily rainfall is shown only when non-overlapping forecast windows cover the full 24 hours.','Reference evapotranspiration is not supplied by this provider.']};
}
export function createMetWeather({fetchImpl=fetch,now=()=>Date.now(),timeoutMs=15000}={}){
 const cache=new Map(),pending=new Map();
 async function get(location){
  const point=metPoint(location),key=point.latitude+','+point.longitude,hit=cache.get(key);
  if(hit&&now()<hit.expires)return {...hit.data,location:{...location,...point},cached:true};
  if(pending.has(key))return {...await pending.get(key),location:{...location,...point}};
  for(const [id,item] of cache)if(now()>item.expires+DAY)cache.delete(id);
  if(!hit&&cache.size>=128)throw Error('Forecast cache busy');
  const work=(async()=>{
   const url=new URL('https://api.met.no/weatherapi/locationforecast/2.0/compact');url.search=new URLSearchParams({lat:String(point.latitude),lon:String(point.longitude)});
   const headers={accept:'application/json','User-Agent':MET_AGENT};if(hit?.modified)headers['If-Modified-Since']=hit.modified;
   const response=await fetchImpl(url,{headers,signal:AbortSignal.timeout(timeoutMs)});
   const expires=Math.max(now()+15*60*1000,Date.parse(response.headers.get('expires'))||0);
   if(response.status===304&&hit){cache.set(key,{...hit,expires});return {...hit.data,cached:true};}
   if(!response.ok)throw Error('MET forecast unavailable');
   const data=normalizeMetWeather(await response.json(),location,new Date(now()).toISOString());
   cache.set(key,{data,expires,modified:response.headers.get('last-modified')});return {...data,cached:false};
  })();pending.set(key,work);try{return await work;}finally{pending.delete(key);}
 }
 return {get};
}
