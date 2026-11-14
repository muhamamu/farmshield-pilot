import test from 'node:test';
import assert from 'node:assert/strict';
import {farmTotals,loadFarmRegistrations,reconcileLocalFarms,persistFarmLists} from '../src/farm-lifecycle.mjs';
const row=(farm,status,deleted=false,extra={})=>({owner_id:'owner',local_farm_id:farm,created_at:'2026-11-14',farmshield_reviews:status?{status}:null,farmshield_farm_state:{deleted_at:deleted?'2026-11-14':null},...extra});
test('deleting an approved farm reduces current totals but keeps lifetime approval',()=>{
 const rows=[row('a','approved'),row('b','approved',true),row('c','pending')];
 assert.deepEqual(farmTotals(rows),{currentApproved:1,totalApproved:2,deleted:1,deletedApproved:1});
});
test('restoration returns approval to current totals without duplicating lifetime count',()=>{
 const rows=[row('a','approved'),row('a','approved',false,{created_at:'2026-11-13'})];
 assert.deepEqual(farmTotals(rows),{currentApproved:1,totalApproved:1,deleted:0,deletedApproved:0});
});
test('a newer pending submission keeps prior approval only in lifetime totals',()=>{
 assert.deepEqual(farmTotals([row('a','approved',false,{created_at:'2026-11-13'}),row('a',null)]),{currentApproved:0,totalApproved:1,deleted:0,deletedApproved:0});
});
test('approvals belong to distinct owner and farm pairs',()=>{
 assert.equal(farmTotals([row('a','approved'),row('a','approved',true,{owner_id:'other'})]).totalApproved,2);
});
test('registration loading paginates beyond provider limits before counting',async()=>{
 const ranges=[];const client={from(){return {select(){return this},order(){return this},eq(){return this},async range(start,end){ranges.push([start,end]);return {data:start===0?Array.from({length:500},()=>row('a','approved')):[row('b','approved')],error:null}}}}};
 assert.equal((await loadFarmRegistrations(client,'owner')).length,501);
 assert.deepEqual(ranges,[[0,499],[500,999]]);
});
test('admin deletion moves a local farm to deleted; cloud restoration brings it back',()=>{
 const farm={id:'a',name:'Test',notes:'Keep these observations'};
 const deleted=reconcileLocalFarms({farms:[farm],removedFarms:[]},[{owner_id:'owner',local_farm_id:'a',deleted_at:'2026-11-14'}],'owner');
 assert.equal(deleted.farms.length,0);assert.equal(deleted.removedFarms[0].notes,farm.notes);
 const restored=reconcileLocalFarms(deleted,[{owner_id:'owner',local_farm_id:'a',deleted_at:null}],'owner');
 assert.equal(restored.farms.length,1);assert.equal(restored.removedFarms.length,0);assert.equal(restored.farms[0].notes,farm.notes);
});
test('another account cannot move a farm already linked to its owner',()=>{
 const farm={id:'a',cloudOwnerId:'owner'};
 const result=reconcileLocalFarms({farms:[farm],removedFarms:[]},[{owner_id:'other',local_farm_id:'a',deleted_at:'2026-11-14'}],'other');
 assert.deepEqual(result,{farms:[farm],removedFarms:[]});
});
test('a local deletion without a cloud acknowledgment is not silently restored',()=>{
 const result=reconcileLocalFarms({farms:[],removedFarms:[{id:'a'}]},[{owner_id:'owner',local_farm_id:'a',deleted_at:null}],'owner');
 assert.equal(result.farms.length,0);assert.equal(result.removedFarms.length,1);
});
test('partial browser storage failure rolls back both farm lists',()=>{
 const data=new Map([['farmshield-farms-v1','old-active'],['farmshield-removed-farms-v1','old-deleted']]);let failed=false;
 const storage={getItem:key=>data.get(key)||null,removeItem:key=>data.delete(key),setItem(key,value){if(key==='farmshield-removed-farms-v1'&&!failed){failed=true;throw new Error('Storage full');}data.set(key,value);}};
 assert.throws(()=>persistFarmLists(storage,{farms:[],removedFarms:[{id:'a'}]}),/Storage full/);
 assert.equal(data.get('farmshield-farms-v1'),'old-active');assert.equal(data.get('farmshield-removed-farms-v1'),'old-deleted');
});
