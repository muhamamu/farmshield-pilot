import assert from 'node:assert/strict';
import test from 'node:test';
import {createDataService,createApi,LOCATIONS,normalizeWeather,normalizeScenes} from '../server/providers.mjs';
const now=Date.parse('2026-11-13T10:00:00Z');
const dates=Array.from({length:7},(_,i)=>`2026-11-${13+i}`);
const weather=()=>({timezone:'Africa/Lagos',latitude:12,longitude:8.6,current_units:{temperature_2m:'°C',relative_humidity_2m:'%'},current:{time:'2026-11-13T11:00',temperature_2m:30,relative_humidity_2m:20},daily_units:{temperature_2m_max:'°C',temperature_2m_min:'°C',precipitation_sum:'mm',et0_fao_evapotranspiration:'mm'},daily:{time:dates,temperature_2m_max:[30,null,32,33,34,35,36],temperature_2m_min:Array(7).fill(20),precipitation_sum:Array(7).fill(0),et0_fao_evapotranspiration:Array(7).fill(5)}});
const response=data=>new Response(JSON.stringify(data));
test('weather normalization retains missing temperature and true zero rainfall',()=>{
 const result=normalizeWeather(weather(),LOCATIONS.kano,new Date(now).toISOString(),'evaluation');
 assert.equal(result.days[1].maxTemperatureC,null);assert.equal(result.days[0].precipitationMm,0);assert.equal(result.current.temperatureC,30);
});
test('wrong provider units and mismatched arrays are rejected',()=>{
 const data=weather();data.daily_units.temperature_2m_max='°F';assert.throws(()=>normalizeWeather(data));
 const short=weather();short.daily.precipitation_sum=[0];assert.throws(()=>normalizeWeather(short));
});
test('missing current conditions remain unavailable rather than inferred',()=>{
 const data=weather();delete data.current;assert.equal(normalizeWeather(data,LOCATIONS.kano,'now','evaluation').current,null);
});
test('cache avoids upstream calls until TTL expires',async()=>{
 let clock=now,calls=0;const service=createDataService({now:()=>clock,fetchImpl:async()=>{calls++;return response(weather());}});
 assert.equal((await service.get('weather','kano')).cached,false);assert.equal((await service.get('weather','kano')).cached,true);assert.equal(calls,1);
 clock+=15*60*1000+1;await service.get('weather','kano');assert.equal(calls,2);
});
test('concurrent requests share one provider request',async()=>{
 let calls=0;const service=createDataService({now:()=>now,fetchImpl:async()=>{calls++;return response(weather());}});
 await Promise.all([service.get('weather','kano'),service.get('weather','kano')]);assert.equal(calls,1);
});
test('paid credentials stay upstream and never enter normalized results',async()=>{
 let upstream;const service=createDataService({mode:'commercial',apiKey:'test-secret',fetchImpl:async url=>{upstream=url;return response(weather());}});
 const result=await service.get('weather','kano');assert.equal(upstream.hostname,'customer-api.open-meteo.com');assert.equal(upstream.searchParams.get('apikey'),'test-secret');assert.equal(JSON.stringify(result).includes('test-secret'),false);
});
test('commercial and production weather access without a key is blocked',async()=>{
 for(const config of [{mode:'commercial'},{production:true}]){
  const service=createDataService({...config,fetchImpl:async()=>assert.fail('Must not call provider')});
  await assert.rejects(service.get('weather','kano'),e=>e.status===503);
 }
});
test('provider failures expose no secret URL and do not become sample weather',async()=>{
 const service=createDataService({apiKey:'secret',fetchImpl:async()=>{throw new Error('https://provider/?apikey=secret');}});
 const api=createApi(service),r=await api(new Request('http://localhost/api/weather?location=kano'));
 assert.equal(r.status,502);const body=await r.text();assert.equal(body.includes('secret'),false);assert.equal(body.includes('days'),false);
});
test('HTTP errors, malformed JSON and malformed payloads return provider unavailable',async()=>{
 for(const fetchImpl of [async()=>new Response('rate limit',{status:429}),async()=>new Response('invalid JSON'),async()=>response({})]){
  await assert.rejects(createDataService({fetchImpl}).get('weather','kano'),e=>e.code==='PROVIDER_UNAVAILABLE');
 }
});
test('failed refresh does not silently return an expired cache entry',async()=>{
 let clock=now,fail=false;const service=createDataService({now:()=>clock,fetchImpl:async()=>{if(fail)throw Error();return response(weather());}});
 await service.get('weather','kano');clock+=16*60*1000;fail=true;await assert.rejects(service.get('weather','kano'),e=>e.status===502);
});
test('invalid locations, prototype keys and extra query parameters cannot select upstream URLs',async()=>{
 const api=createApi(createDataService({fetchImpl:async()=>assert.fail('Must not call upstream')}));
 for(const query of ['', '?location=unknown','?location=__proto__','?location=kano&location=abuja','?location=kano&url=https://example.com']){
  assert.equal((await api(new Request('http://localhost/api/weather'+query))).status,400);
 }
});
test('routes reject writes and unknown resources',async()=>{
 const api=createApi(createDataService());assert.equal((await api(new Request('http://localhost/api/weather',{method:'POST'}))).status,405);
 assert.equal((await api(new Request('http://localhost/api/anything'))).status,404);
 assert.equal((await api(new Request('http://localhost/api/health'))).status,200);
});
test('scene metadata handles no results without inventing a clear image',()=>{
 const result=normalizeScenes({type:'FeatureCollection',features:[]},LOCATIONS.kano,'now',{},[]);assert.deepEqual(result.scenes,[]);
});
test('catalogue normalization sorts acquisitions and preserves unavailable cloud values',()=>{
 const scene=(id,date,cloud)=>({id,properties:{datetime:date,'eo:cloud_cover':cloud}});
 const result=normalizeScenes({type:'FeatureCollection',features:[scene('older','2026-11-11T10:00:00Z',0),scene('newer','2026-11-12T10:00:00Z',null)]},LOCATIONS.kano,'now',{},[]);
 assert.equal(result.scenes[0].id,'newer');assert.equal(result.scenes[0].cloudCoverPct,null);assert.equal(result.scenes[1].cloudCoverPct,0);
});
test('STAC requests use longitude-first regional bounding boxes and a bounded period',async()=>{
 let upstream;await createDataService({now:()=>now,fetchImpl:async url=>{upstream=url;return response({type:'FeatureCollection',features:[]});}}).get('satellite-scenes','kano');
 assert.equal(upstream.hostname,'stac.dataspace.copernicus.eu');assert.equal(upstream.searchParams.get('collections'),'sentinel-2-l2a');assert.equal(upstream.searchParams.get('limit'),'5');assert.deepEqual(upstream.searchParams.get('bbox').split(',').map(Number),[8.542,11.9522,8.642,12.0522]);assert.ok(upstream.searchParams.get('datetime').includes('/'));
});
