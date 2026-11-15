import test from 'node:test';
import assert from 'node:assert/strict';
import {farmPayload,cloudFarm,saveCloudFarm,loadCloudFarms,eligibleDeviceFarms} from '../src/cloud-farms.mjs';
const id='00000000-0000-4000-8000-000000000001';
const farm={id,name:'Actual farm',crop:'Maize',size:2.5,location:'Kura',point:{lat:11.7,lon:8.4},notes:'My field note',en:'My advisory draft',soilReading:{condition:'Moist'},revision:2,cloudOwnerId:'owner',deletedAt:'2026-11-14'};
test('cloud payload preserves field records and drafts without client ownership or lifecycle fields',()=>{
 const payload=farmPayload(farm);assert.equal(payload.notes,farm.notes);assert.deepEqual(payload.soilReading,farm.soilReading);assert.equal(payload.en,farm.en);for(const key of ['revision','cloudOwnerId','deletedAt'])assert.equal(key in payload,false);
});
test('invalid cloud records are rejected before sending a write',()=>{assert.throws(()=>farmPayload({...farm,id:'invalid'}),/ID/);assert.throws(()=>farmPayload({...farm,size:0}),/invalid/);assert.throws(()=>farmPayload({...farm,point:{lat:100,lon:8}}),/pin/);});
test('cloud results retain server revision and shared deletion state',()=>{
 const result=cloudFarm({owner_id:'owner',local_farm_id:id,payload:farmPayload(farm),revision:3,created_at:'created',updated_at:'updated',farmshield_farm_state:{deleted_at:'deleted'}});assert.equal(result.cloudDeleted,true);assert.equal(result.revision,3);assert.equal(result.updatedAt,'updated');
});
test('updating a farm requires the loaded revision and refuses a stale save',async()=>{
 const filters=[];const client={from(){return{update({payload}){assert.equal(payload.notes,farm.notes);return this;},eq(...pair){filters.push(pair);return this;},select(){return this;},async maybeSingle(){return{data:null,error:null};}};}};
 await assert.rejects(saveCloudFarm(client,'owner',farm),/changed elsewhere/);assert.deepEqual(filters,[['owner_id','owner'],['local_farm_id',id],['revision',2]]);
});
test('a failed cloud save is not reported as success',async()=>{
 const failure=new Error('Network unavailable');const query={update(){return this;},eq(){return this;},select(){return this;},async maybeSingle(){return{data:null,error:failure};}};
 await assert.rejects(saveCloudFarm({from:()=>query},'owner',farm),error=>error===failure);
});
test('cloud farm reads always filter the signed-in owner',async()=>{
 const owners=[];const client={from(){return{select(){return this;},eq(key,value){owners.push([key,value]);return this;},order(){return this;},async range(){return{data:[],error:null};}};}};
 await loadCloudFarms(client,'first');await loadCloudFarms(client,'second');assert.deepEqual(owners,[['owner_id','first'],['owner_id','second']]);
});
test('device import excludes records linked to another account',()=>{
 const other={...farm,id:'00000000-0000-4000-8000-000000000002',cloudOwnerId:'other'};const storage={getItem:key=>key==='farmshield-farms-v1'?JSON.stringify([farm,other]):'[]'};assert.deepEqual(eligibleDeviceFarms(storage,'owner').farms.map(item=>item.id),[id]);
});
