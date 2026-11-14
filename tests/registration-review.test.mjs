import test from 'node:test';
import assert from 'node:assert/strict';
import {submissionSnapshot,latestSubmissions,decisionFor,snapshotMatches,validateReview} from '../src/registration-review.mjs';
const farm={id:'test',name:'Kura farm',crop:'Maize',size:2.5,location:'Kura',point:{lat:11.77,lon:8.43},notes:'private observation',soil:'Dry'};
const contact={farmerName:'Amina Musa',phone:'+234 800 123 4567'};
test('submission shares only farm identity, location and explicit contact details',()=>{
  const row=submissionSnapshot(farm,contact);
  assert.equal(row.latitude,11.77);assert.equal(row.area_ha,2.5);assert.equal(row.farmer_name,'Amina Musa');
  assert.equal('notes' in row,false);assert.equal('soil' in row,false);assert.equal('status' in row,false);assert.equal('owner_id' in row,false);
});
test('submission requires meaningful contact and valid coordinates',()=>{
  assert.throws(()=>submissionSnapshot({...farm,point:null},contact),/location/);
  assert.throws(()=>submissionSnapshot({...farm,point:{lat:91,lon:8}},contact),/location/);
  assert.throws(()=>submissionSnapshot(farm,{...contact,phone:'hi'}),/phone/);
  assert.throws(()=>submissionSnapshot({...farm,size:Infinity},contact),/details/);
  assert.throws(()=>submissionSnapshot({...farm,boundary:[[11,8],[11,8],[11,8]]},contact),/outline/);
});
test('newest submission is isolated by owner and local farm',()=>{
  const rows=[{id:'old',owner_id:'a',local_farm_id:'x',created_at:'2026-01-01'}, {id:'other-owner',owner_id:'b',local_farm_id:'x',created_at:'2026-01-02'}, {id:'new',owner_id:'a',local_farm_id:'x',created_at:'2026-01-03'}];
  assert.deepEqual(latestSubmissions(rows).map(r=>r.id),['new','other-owner']);
});
test('approval applies only to matching submitted details and outline',()=>{
  const row=submissionSnapshot(farm,contact);assert.equal(snapshotMatches(farm,row),true);
  assert.equal(snapshotMatches({...farm,crop:'Rice'},row),false);
  assert.equal(snapshotMatches({...farm,point:{lat:12,lon:8}},row),false);
  assert.equal(snapshotMatches({...farm,boundary:[[11,8],[12,8],[12,9]]},row),false);
  assert.equal(snapshotMatches({...farm,notes:'new private note'},row),true);
});
test('approval requires all review checks; every decision requires explanatory notes',()=>{
  assert.throws(()=>validateReview('approved','Checked',{location:true,details:true,contact:false}),/Check/);
  assert.throws(()=>validateReview('rejected',' ',{}),/notes/);
  assert.throws(()=>validateReview('pending','Test',{}),/decision/);
  assert.doesNotThrow(()=>validateReview('approved','Checked the location and contacted farmer',{location:true,details:true,contact:true}));
  assert.doesNotThrow(()=>validateReview('changes_requested','Move the pin to the actual field.',{}));
  assert.equal(decisionFor({farmshield_reviews:[]}),null);
});
