import {decisionFor,latestSubmissions} from './registration-review.mjs';
import {farmDeleted} from './farm-lifecycle.mjs';
export function approvedMapFarms(rows){
 return latestSubmissions(rows).filter(row=>!farmDeleted(row)&&decisionFor(row)?.status==='approved'&&Number.isFinite(row.latitude)&&Number.isFinite(row.longitude)&&Math.abs(row.latitude)<=90&&Math.abs(row.longitude)<=180).map(row=>({
  id:'approved:'+row.owner_id+':'+row.local_farm_id,ownerId:row.owner_id,localFarmId:row.local_farm_id,registrationId:row.id,
  name:row.farm_name,crop:row.crop,size:Number(row.area_ha),location:row.location,point:{lat:row.latitude,lon:row.longitude},
  boundary:Array.isArray(row.boundary)&&row.boundary.every(corner=>Array.isArray(corner)&&corner.length===2&&corner.every(Number.isFinite)&&Math.abs(corner[0])<=90&&Math.abs(corner[1])<=180)?row.boundary:[],approved:true,
 }));
}
export async function loadApprovedMapFarms(client){
 const rows=[];
 for(let offset=0;;offset+=500){
  const {data,error}=await client.from('farmshield_registrations').select('id,owner_id,local_farm_id,farm_name,crop,area_ha,location,latitude,longitude,boundary,created_at,farmshield_reviews(status),farmshield_farm_state(deleted_at)').order('created_at',{ascending:false}).order('id').range(offset,offset+499);
  if(error)throw error;rows.push(...data);if(data.length<500)return approvedMapFarms(rows);
 }
}
