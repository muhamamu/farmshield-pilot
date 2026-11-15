import test from 'node:test';
import assert from 'node:assert/strict';
import {registrationDetails} from '../src/farm-registration.mjs';
function data(extra={}){return new Map(Object.entries({farmName:'Test',crop:'Maize',size:'1.234',location:'',...extra}))}
test('a selected map pin saves without requiring a place name or lookup',()=>{const point={lat:12,lon:8.5},result=registrationDetails(data({usePin:'on'}),point);assert.equal(result.point,point);assert.equal(result.location,'Pinned map location');assert.equal(result.size,1.234)});
test('unticking the selected pin requires a place name',()=>{assert.throws(()=>registrationDetails(data(),{lat:12,lon:8.5}),/village/);assert.equal(registrationDetails(data({location:'Kura'}),null).point,null)});
test('area can be small or precise but must remain positive',()=>{assert.equal(registrationDetails(data({size:'.00123',usePin:'on'}),{lat:12,lon:8.5}).size,.00123);assert.throws(()=>registrationDetails(data({size:'0',usePin:'on'}),{lat:12,lon:8.5}),/greater than zero/)});
