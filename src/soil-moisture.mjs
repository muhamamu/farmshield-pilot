export const SOIL_LAYERS=[['3–9 cm','soil_moisture_3_to_9cm'],['9–27 cm','soil_moisture_9_to_27cm'],['27–81 cm','soil_moisture_27_to_81cm']];
export function farmCoordinate(farm){
 if(farm.boundary?.length>=3){const points=farm.boundary;return {lat:points.reduce((sum,p)=>sum+p[0],0)/points.length,lon:points.reduce((sum,p)=>sum+p[1],0)/points.length}}
 return farm.point&&Number.isFinite(farm.point.lat)&&Number.isFinite(farm.point.lon)?farm.point:null;
}
export function normalizeSoil(raw,point,now=Date.now()){
 if(raw?.timezone!=='GMT'||!Array.isArray(raw.hourly?.time))throw new Error('Soil source returned an unexpected format.');
 const times=raw.hourly.time;let index=-1;
 times.forEach((time,i)=>{const ms=Date.parse(time+'Z');if(Number.isFinite(ms)&&ms<=now&&(index===-1||ms>Date.parse(times[index]+'Z')))index=i});
 if(index<0||now-Date.parse(times[index]+'Z')>24*3600000)throw new Error('No recent soil estimate is available. Enter a field reading instead.');
 const layers=SOIL_LAYERS.map(([depth,key])=>{if(raw.hourly_units?.[key]!=='m³/m³'||!Array.isArray(raw.hourly[key])||raw.hourly[key].length!==times.length)throw new Error('Soil source returned unexpected units or missing layers.');const value=raw.hourly[key][index];return {depth,vwcPct:typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1?value*100:null}});
 if(layers.every(layer=>layer.vwcPct===null))throw new Error('Soil estimates are missing. Enter a field reading instead.');
 return {source:'Open-Meteo model estimate',fetchedAt:new Date(now).toISOString(),validAt:times[index]+'Z',requestedPoint:{lat:point.lat,lon:point.lon},gridPoint:{lat:raw.latitude,lon:raw.longitude},layers};
}
export function chooseSoil(farm,now=Date.now()){
 const recent=time=>{const elapsed=now-Date.parse(time);return Number.isFinite(elapsed)&&elapsed>=-5*60000&&elapsed<=24*3600000};
 const manual=farm.soilReading,model=farm.soilEstimate,point=farmCoordinate(farm);
 const manualValid=manual&&recent(manual.observedAt)&&(manual.method==='Visual check'?['Dry','Moist','Wet','Waterlogged'].includes(manual.condition):typeof manual.vwcPct==='number'&&manual.vwcPct>=0&&manual.vwcPct<=100);
 const modelValid=model&&recent(model.validAt)&&point&&Math.abs(point.lat-model.requestedPoint?.lat)<.00001&&Math.abs(point.lon-model.requestedPoint?.lon)<.00001&&model.layers.some(layer=>layer.vwcPct!==null);
 if(farm.soilPreference!=='model'&&manualValid)return {kind:'manual',reading:manual};
 if(farm.soilPreference!=='manual'&&modelValid)return {kind:'model',reading:model};
 return {kind:'missing',reason:farm.soilPreference==='manual'?'Add a field reading from the past 24 hours.':farm.soilPreference==='model'?'Refresh the model estimate for this farm location.':'Add a recent field reading or load a model estimate.'};
}
