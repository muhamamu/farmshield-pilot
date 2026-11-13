import test from 'node:test';
import assert from 'node:assert/strict';
import {findFarmLocations} from '../src/farm-location.mjs';
test('place lookup constrains the provider query and rejects results outside Kano',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async url=>{assert.equal(url.hostname,'geocoding-api.open-meteo.com');assert.equal(url.searchParams.get('countryCode'),'NG');assert.equal(url.searchParams.get('name'),'Kura, Kano');return Response.json({results:[{name:'Kura',latitude:11.77,longitude:8.43,country_code:'NG',admin1:'Kano'},{name:'Kura',latitude:9,longitude:7,country_code:'NG',admin1:'Kaduna'}]})};
 try{const results=await findFarmLocations('Kura, Kano');assert.equal(results.length,1);assert.equal(results[0].lat,11.77);assert.equal(results[0].label,'Kura, Kano')}finally{globalThis.fetch=original}
});
test('provider failures are reported instead of returning a fabricated location',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response('',{status:503});
 try{await assert.rejects(findFarmLocations('Unknown test town'),/unavailable/)}finally{globalThis.fetch=original}
});
