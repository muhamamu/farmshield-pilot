const DAY=86400000;
const day=value=>new Date(value).toISOString().slice(0,10);
const stamp=value=>{if(!/^\d{8}$/.test(value))return NaN;const iso=value.slice(0,4)+'-'+value.slice(4,6)+'-'+value.slice(6);const ms=Date.parse(iso+'T00:00:00Z');return Number.isFinite(ms)&&day(ms)===iso?ms:NaN;};
export function estimateCloudHistory(raw,location,fetchedAt){
 if(raw?.parameters?.CLOUD_AMT?.units!=='%'||!raw?.properties?.parameter?.CLOUD_AMT||typeof raw.properties.parameter.CLOUD_AMT!=='object')throw Error('Invalid historical cloud response');
 const today=Math.floor(Date.parse(fetchedAt)/DAY)*DAY;
 const history=Object.entries(raw.properties.parameter.CLOUD_AMT).map(([date,value])=>({stamp:stamp(date),cloudCoverPct:value})).filter(row=>Number.isFinite(row.stamp)&&row.stamp<today&&row.stamp>=today-21*DAY&&typeof row.cloudCoverPct==='number'&&Number.isFinite(row.cloudCoverPct)&&row.cloudCoverPct>=0&&row.cloudCoverPct<=100&&row.cloudCoverPct!==raw.header?.fill_value).sort((a,b)=>a.stamp-b.stamp);
 const latest=history.at(-1),ageDays=latest?Math.round((today-latest.stamp)/DAY):null;
 const recent=latest?history.filter(row=>row.stamp>=latest.stamp-6*DAY):[];
 const usable=recent.length>=5&&ageDays<=7;
 const weights=recent.map(row=>7-Math.round((latest.stamp-row.stamp)/DAY));
 const average=usable?recent.reduce((sum,row,i)=>sum+row.cloudCoverPct*weights[i],0)/weights.reduce((sum,value)=>sum+value,0):null;
 return {provider:'NASA POWER',sourceUrl:'https://power.larc.nasa.gov/',parameter:'CLOUD_AMT',fetchedAt,location,status:usable?'available':'insufficient-data',method:'Recency-weighted mean over the latest seven-calendar-day window; the same baseline is carried forward three days.',confidence:'Low; predictive accuracy has not been validated.',ageDays,history:recent.map(row=>({date:day(row.stamp),cloudCoverPct:row.cloudCoverPct})),basis:latest?{start:day(recent[0].stamp),end:day(latest.stamp),sampleCount:recent.length,observedMinPct:Math.min(...recent.map(row=>row.cloudCoverPct)),observedMaxPct:Math.max(...recent.map(row=>row.cloudCoverPct))}:null,estimates:usable?Array.from({length:3},(_,i)=>({date:day(today+(i+1)*DAY),cloudCoverPct:Math.round(average)})):[],reason:usable?null:!latest?'No valid recent historical cloud data was returned.':ageDays>7?'The latest historical cloud data is more than seven days old.':'Fewer than five valid days are available in the latest seven-day window.',limitations:['Experimental historical baseline, not a meteorological forecast.','Regional gridded cloud amount is not a measurement over an individual farm.','Cloud cover is not a probability of rain.','The observed historical range is not a prediction interval.']};
}
export function createCloudEstimateService({fetchImpl=fetch,now=()=>Date.now(),timeoutMs=20000}={}){
 const cache=new Map(),pending=new Map();
 async function get(location){
  // Use a regional point and cache by that region, not by private farm coordinates.
  const regional={name:'Regional cloud history',latitude:Math.round(location.latitude),longitude:Math.round(location.longitude)};
  const end=Math.floor(now()/DAY)*DAY-DAY,start=end-20*DAY,key=regional.latitude+','+regional.longitude+':'+day(end),hit=cache.get(key);
  if(hit&&now()<hit.expires)return {...hit.data,cached:true};
  if(pending.has(key))return pending.get(key);
  for(const [id,item] of cache)if(item.expires<now())cache.delete(id);
  if(cache.size>=128)throw Error('Cloud history cache busy');
  const task=(async()=>{
   const url=new URL('https://power.larc.nasa.gov/api/temporal/daily/point');url.search=new URLSearchParams({parameters:'CLOUD_AMT',community:'RE',latitude:String(regional.latitude),longitude:String(regional.longitude),start:day(start).replaceAll('-',''),end:day(end).replaceAll('-',''),format:'JSON','time-standard':'UTC'});
   const response=await fetchImpl(url,{headers:{accept:'application/json'},signal:AbortSignal.timeout(timeoutMs)});
   if(!response.ok)throw Error('Historical cloud source unavailable');
   const data=estimateCloudHistory(await response.json(),regional,new Date(now()).toISOString());
   cache.set(key,{data,expires:now()+6*3600000});return {...data,cached:false};
  })();pending.set(key,task);try{return await task;}finally{pending.delete(key);}
 }
 return {get};
}
