import test from 'node:test';
import assert from 'node:assert/strict';
import {findFarmLocations} from '../src/farm-location.mjs';
test('place lookup searches Nigeria without a Kano qualifier and excludes foreign or invalid results',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async url=>{assert.equal(url.hostname,'geocoding-api.open-meteo.com');assert.equal(url.searchParams.get('countryCode'),'NG');assert.equal(url.searchParams.get('name'),'Lagos');return Response.json({results:[{name:'Lagos',latitude:6.52,longitude:3.38,country_code:'NG',admin1:'Lagos'},{name:'Kano',latitude:12,longitude:8.5,country_code:'NG',admin1:'Kano'},{name:'Foreign',latitude:9,longitude:7,country_code:'NE'},{name:'Invalid',latitude:50,longitude:3,country_code:'NG'}]})};
 try{const results=await findFarmLocations('Lagos');assert.equal(results.length,2);assert.equal(results[0].lat,6.52);assert.equal(results[0].label,'Lagos, Lagos')}finally{globalThis.fetch=original}
});
test('provider failures are reported instead of returning a fabricated location',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response('',{status:503});
 try{await assert.rejects(findFarmLocations('Unknown test town'),/unavailable/)}finally{globalThis.fetch=original}
});
