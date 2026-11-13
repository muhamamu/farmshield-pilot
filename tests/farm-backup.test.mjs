import assert from 'node:assert/strict';
import test from 'node:test';
import {mergeBackup,validateBackup} from '../src/farm-backup.mjs';
const farm=(id,name=id)=>({id,name,crop:'Maize',location:'Kano',size:1});
test('restore keeps local edits and tombstones while adding missing cloud farms',()=>{
 const local={version:1,farms:[farm('a','Local')],removedFarms:[farm('b')]};
 const remote={version:1,farms:[farm('a','Cloud'),farm('b'),farm('c')],removedFarms:[farm('d')]};
 const result=mergeBackup(local,remote);
 assert.deepEqual(result.farms.map(f=>f.id),['a','c']); assert.equal(result.farms[0].name,'Local');
 assert.deepEqual(result.removedFarms.map(f=>f.id),['b','d']);
});
test('backup validation rejects malformed records before restore',()=>{
 for(const payload of [{version:2,farms:[],removedFarms:[]},{version:1,farms:[farm('a'),farm('a')],removedFarms:[]},{version:1,farms:[{...farm('a'),point:{lat:NaN,lon:8}}],removedFarms:[]}])assert.throws(()=>validateBackup(payload));
});
test('valid farm outlines survive a backup round trip',()=>{
 const payload={version:1,farms:[{...farm('a'),boundary:[[12,8],[12.01,8],[12,8.01]],notes:'Dry soil'}],removedFarms:[]};
 assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(payload))),payload);
});
