import test from 'node:test';
import assert from 'node:assert/strict';
import {boundaryError,boundaryAreaHa,withFarmBoundary} from '../shared/farm-boundary.mjs';
test('farm outline requires a usable non-crossing polygon',()=>{
 assert.ok(boundaryError([[12,8],[12.01,8]]));
 assert.ok(boundaryError([[12,8],[12.01,8.01],[12,8.01],[12.01,8]]));
 assert.ok(boundaryError([[12,8],[12,8],[12.01,8.01]]));
 assert.ok(boundaryError([[12,8],[12.01,8.01],[12.02,8.02]]));
 assert.equal(boundaryError([[12,8],[12.01,8],[12.01,8.01],[12,8.01]]),null);
});
test('saving a changed boundary updates area while preserving farm records',()=>{
 const small=[[12,8],[12.001,8],[12.001,8.001],[12,8.001]],large=[[12,8],[12.002,8],[12.002,8.002],[12,8.002]];
 const original={id:'test',name:'Test farm',size:2.6,soilReading:{condition:'Moist'}};
 const first=withFarmBoundary(original,small),second=withFarmBoundary(first,large);
 assert.ok(Math.abs(first.size-1.209)<.005);
 assert.ok(second.size>first.size*3.99&&second.size<first.size*4.01);
 assert.equal(second.soilReading,original.soilReading);
 assert.equal(second.areaSource,'outline');
 assert.equal(second.enteredAreaHa,2.6);
 assert.deepEqual(second.boundary,large);
 assert.ok(Math.abs(boundaryAreaHa([...small].reverse())-first.size)<1e-6);
});
test('invalid boundaries cannot update the farm area',()=>assert.throws(()=>withFarmBoundary({size:3},[[12,8],[12,8]])));
