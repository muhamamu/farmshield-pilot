import {boundaryError} from '../shared/farm-boundary.mjs';

export const reviewLabels = {pending:'Awaiting review',approved:'Approved',rejected:'Rejected',changes_requested:'Changes requested'};
export function submissionSnapshot(farm, contact) {
  const farmerName=String(contact.farmerName||'').trim(),phone=String(contact.phone||'').trim();
  if(farmerName.length<2||farmerName.length>100)throw new Error('Enter the farmer’s full name (2–100 characters).');
  if(!/^[+\d ()-]{7,30}$/.test(phone))throw new Error('Enter a valid contact phone number.');
  if(!farm.id||!farm.name?.trim()||farm.name.length>80||!farm.crop?.trim()||farm.crop.length>60||!farm.location?.trim()||farm.location.length>300||!Number.isFinite(farm.size)||farm.size<=0)throw new Error('Complete the farm details before submitting.');
  const {lat,lon}=farm.point||{};
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat< -90||lat>90||lon< -180||lon>180)throw new Error('Attach a valid map location before submitting.');
  const boundary=farm.boundary||[];
  if(boundary.length&&(boundaryError(boundary)||boundary.some(p=>Math.abs(p[0])>90||Math.abs(p[1])>180)))throw new Error('Fix the land outline before submitting.');
  return {local_farm_id:farm.id,farm_name:farm.name.trim(),crop:farm.crop.trim(),area_ha:farm.size,location:farm.location.trim(),latitude:lat,longitude:lon,boundary,farmer_name:farmerName,phone};
}
export function latestSubmissions(rows) {
  const latest=new Map();
  for(const row of rows) {
    const key=row.owner_id+':'+row.local_farm_id;
    if(!latest.has(key)||row.created_at>latest.get(key).created_at)latest.set(key,row);
  }
  return [...latest.values()].sort((a,b)=>b.created_at.localeCompare(a.created_at));
}
export function decisionFor(row) {return [...(row.farmshield_reviews||[])].sort((a,b)=>b.created_at.localeCompare(a.created_at))[0]||null;}
export function snapshotMatches(farm,row) {
  return farm.name.trim()===row.farm_name&&farm.crop.trim()===row.crop&&farm.location.trim()===row.location&&farm.size===Number(row.area_ha)&&farm.point?.lat===row.latitude&&farm.point?.lon===row.longitude&&JSON.stringify(farm.boundary||[])===JSON.stringify(row.boundary||[]);
}
export function validateReview(status,notes,checks) {
  if(!['approved','rejected','changes_requested'].includes(status))throw new Error('Choose a review decision.');
  if(!notes.trim()||notes.trim().length>2000)throw new Error('Add review notes (up to 2,000 characters).');
  if(status==='approved'&&!(checks.location&&checks.details&&checks.contact))throw new Error('Check the location, farm details and farmer contact before approval.');
}
