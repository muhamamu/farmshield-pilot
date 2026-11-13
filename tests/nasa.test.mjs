import assert from 'node:assert/strict';
import test from 'node:test';
import {createNasaService,buildNasaUrl,nasaDateRange,validateNasaQuery} from '../server/nasa.mjs';
import {createApi,createDataService} from '../server/providers.mjs';
const clock=Date.parse('2026-11-13T12:00:00Z');
// Binary transport fixture, not a rendered satellite image or provider evidence.
function png(width=768,height=768){const bytes=new Uint8Array(32);bytes.set([137,80,78,71,13,10,26,10]);const d=new DataView(bytes.buffer);d.setUint32(16,width);d.setUint32(20,height);return bytes;}
const pngResponse=()=>new Response(png(),{headers:{'content-type':'image/png'}});
test('NASA dates cover the past 30 days and exclude today',()=>{
 assert.deepEqual(nasaDateRange(clock),{min:'2026-10-14',max:'2026-11-12'});
 for(const date of ['2026-11-13','2026-10-13','2026-02-30','wrong','',null])assert.throws(()=>validateNasaQuery('kano',date,clock),e=>e.status===400);
 assert.doesNotThrow(()=>validateNasaQuery('kano','2026-11-12',clock));
});
test('NASA WMS uses documented axis order, fixed host and true-colour layer',()=>{
 const {url,bbox}=buildNasaUrl('kano','2026-11-12');assert.equal(url.hostname,'gibs.earthdata.nasa.gov');assert.equal(url.searchParams.get('VERSION'),'1.1.1');assert.equal(url.searchParams.get('SRS'),'EPSG:4326');assert.equal(url.searchParams.get('TIME'),'2026-11-12');assert.deepEqual(bbox,[8.092,11.5022,9.092,12.5022]);assert.equal(url.searchParams.get('WIDTH'),'768');
});
test('NASA metadata never serializes image bytes and labels requested day',async()=>{
 const s=createNasaService({now:()=>clock,fetchImpl:async()=>pngResponse()});const result=await s.describe('kano','2026-11-12');assert.equal(result.requestedDate,'2026-11-12');assert.equal(result.provider,'NASA GIBS');assert.equal(result.bytes,undefined);assert.equal(result.imageUrl,'/api/nasa-image?location=kano&date=2026-11-12');assert.equal(result.cached,false);
});
test('description and image endpoint reuse the same cached binary response',async()=>{
 let calls=0;const s=createNasaService({now:()=>clock,fetchImpl:async()=>{calls++;return pngResponse()}});await s.describe('kano','2026-11-12');assert.deepEqual(await s.image('kano','2026-11-12'),png());assert.equal((await s.describe('kano','2026-11-12')).cached,true);assert.equal(calls,1);
});
test('simultaneous NASA requests share one fetch and expired entries refresh',async()=>{
 let now=clock,calls=0;const s=createNasaService({now:()=>now,fetchImpl:async()=>{calls++;return pngResponse()}});await Promise.all([s.describe('kano','2026-11-12'),s.image('kano','2026-11-12')]);assert.equal(calls,1);now+=3600001;await s.image('kano','2026-11-12');assert.equal(calls,2);
});
test('NASA XML exceptions, HTTP errors, invalid signatures and wrong dimensions are rejected',async()=>{
 for(const make of [()=>new Response('<ServiceException>error</ServiceException>',{headers:{'content-type':'application/xml'}}),()=>new Response('no',{status:503}),()=>new Response('bad',{headers:{'content-type':'image/png'}}),()=>new Response(png(512,512),{headers:{'content-type':'image/png'}})]){
  await assert.rejects(createNasaService({now:()=>clock,fetchImpl:async()=>make()}).describe('kano','2026-11-12'),e=>e.code==='NASA_UNAVAILABLE');
 }
});
test('unknown reference points and dates are rejected before calling NASA',async()=>{
 const s=createNasaService({now:()=>clock,fetchImpl:async()=>assert.fail('Unexpected fetch')});for(const location of ['unknown','__proto__','https://example.com'])await assert.rejects(s.describe(location,'2026-11-12'),e=>e.status===400);
 await assert.rejects(s.describe('kano','2026-11-13'),e=>e.status===400);
});
test('NASA image HTTP route preserves raw PNG bytes and content type',async()=>{
 const s=createNasaService({now:()=>clock,fetchImpl:async()=>pngResponse()}),api=createApi(createDataService(),s);const r=await api(new Request('http://localhost/api/nasa-image?location=kano&date=2026-11-12'));assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/png');assert.deepEqual(new Uint8Array(await r.arrayBuffer()),png());
});
test('NASA routes reject duplicates, arbitrary provider URLs and missing dates',async()=>{
 const api=createApi(createDataService(),createNasaService({fetchImpl:async()=>assert.fail('Unexpected fetch')}));for(const query of ['?location=kano','?location=kano&date=2026-11-12&date=2026-11-11','?location=kano&date=2026-11-12&url=https://example.com'])assert.equal((await api(new Request('http://localhost/api/nasa-imagery'+query))).status,400);
});
test('NASA provider error body is not leaked',async()=>{
 const s=createNasaService({now:()=>clock,fetchImpl:async()=>{throw Error('provider sensitive internals')}}),api=createApi(createDataService(),s);const r=await api(new Request('http://localhost/api/nasa-imagery?location=kano&date=2026-11-12'));assert.equal(r.status,502);assert.equal((await r.text()).includes('sensitive'),false);
});
import {REGIONS,STATE_REGIONS,ZONE_REGIONS,NATIONAL_REGION} from '../shared/nigeria-regions.mjs';
test('Nigeria coverage includes 36 states, FCT, 6 zones and national view exactly once',()=>{
 assert.equal(STATE_REGIONS.length,37);assert.equal(ZONE_REGIONS.length,6);assert.equal(REGIONS.length,44);assert.equal(new Set(REGIONS.map(r=>r.id)).size,44);assert.equal(STATE_REGIONS.filter(r=>r.id==='state-fct').length,1);
});
test('every state bounding box is contained by its zone and national extent',()=>{
 for(const state of STATE_REGIONS){const zone=ZONE_REGIONS.find(z=>z.zone===state.zone);for(const parent of [zone,NATIONAL_REGION]){assert.ok(parent);assert.ok(parent.bbox[0]<=state.bbox[0]&&parent.bbox[1]<=state.bbox[1]&&parent.bbox[2]>=state.bbox[2]&&parent.bbox[3]>=state.bbox[3]);}}
});
test('all 44 NASA regional views generate bounded dimensions and valid extents',()=>{
 for(const region of REGIONS){validateNasaQuery(region.id,'2026-11-12',clock);const {url,width,height,bbox}=buildNasaUrl(region.id,'2026-11-12');assert.ok(width>=128&&width<=768&&height>=128&&height<=768);assert.ok(bbox.every(Number.isFinite));assert.ok(bbox[0]<bbox[2]&&bbox[1]<bbox[3]);assert.equal(url.searchParams.get('BBOX'),region.bbox.join(','));}
});
test('region catalogue API publishes full coverage with boundary attribution',async()=>{
 const r=await createApi(createDataService())(new Request('http://localhost/api/nasa-regions'));const body=await r.json();assert.equal(r.status,200);assert.equal(body.regions.length,44);assert.equal(body.zones.length,6);assert.ok(body.boundarySource.attribution.includes('CC BY 4.0'));
});
test('state imagery validates actual requested rectangular image dimensions',async()=>{
 const s=createNasaService({now:()=>clock,fetchImpl:async url=>new Response(png(Number(url.searchParams.get('WIDTH')),Number(url.searchParams.get('HEIGHT'))),{headers:{'content-type':'image/png'}})});
 const r=await s.describe('state-lagos','2026-11-12');assert.equal(r.location.name,'Lagos');assert.ok(r.width!==r.height);assert.equal(r.boundarySource.yearRepresented,'2022');assert.equal(r.bbox.length,4);
});
