import test from 'node:test';
import assert from 'node:assert/strict';
import {approvedMapFarms,loadApprovedMapFarms} from '../src/approved-map.mjs';
const row=(id,status='approved',extra={})=>({id:'submission-'+id,owner_id:'owner',local_farm_id:id,created_at:'2026-11-14',farm_name:'Farm '+id,crop:'Maize',area_ha:2,location:'Kura',latitude:11.7,longitude:8.4,boundary:[],farmshield_reviews:{status},farmshield_farm_state:{deleted_at:null},...extra});
test('approved map excludes deleted, rejected and pending farms',()=>{
 const farms=approvedMapFarms([row('a'),row('b','approved',{farmshield_farm_state:{deleted_at:'2026-11-14'}}),row('c','pending'),row('d','rejected')]);assert.deepEqual(farms.map(farm=>farm.localFarmId),['a']);
});
test('newer pending submissions replace older approvals on the map',()=>{
 assert.equal(approvedMapFarms([row('a','approved',{created_at:'2026-11-13'}),row('a','pending')]).length,0);
});
test('approved farm markers preserve coordinates, separate owners and omit contact/private fields',()=>{
 const farms=approvedMapFarms([row('same','approved',{phone:'private',notes:'private'}),row('same','approved',{owner_id:'other'})]);assert.equal(farms.length,2);assert.notEqual(farms[0].id,farms[1].id);assert.deepEqual(farms[0].point,{lat:11.7,lon:8.4});assert.equal('phone' in farms[0],false);assert.equal('notes' in farms[0],false);
});
test('pin-only approved farms stay visible; malformed coordinates are excluded',()=>{
 assert.equal(approvedMapFarms([row('pin')])[0].boundary.length,0);assert.equal(approvedMapFarms([row('bad','approved',{latitude:NaN})]).length,0);
});
test('admin map loads only verification snapshots with no private payload or phone columns',async()=>{
 let fields,table;const query={select(value){fields=value;return this;},order(){return this;},async range(){return {data:[row('a')],error:null};}};
 const farms=await loadApprovedMapFarms({from(name){table=name;return query;}});assert.equal(table,'farmshield_registrations');assert.equal(farms.length,1);assert.doesNotMatch(fields,/phone|payload|notes/);
});
