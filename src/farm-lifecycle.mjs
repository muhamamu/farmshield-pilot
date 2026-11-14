import {decisionFor,latestSubmissions} from './registration-review.mjs';
export function farmDeleted(row){return Boolean(row.farmshield_farm_state?.deleted_at);}
export function farmTotals(rows){
 const latest=latestSubmissions(rows),everApproved=new Set(rows.filter(row=>decisionFor(row)?.status==='approved').map(row=>row.owner_id+':'+row.local_farm_id));
 return {
  currentApproved:latest.filter(row=>!farmDeleted(row)&&decisionFor(row)?.status==='approved').length,
  totalApproved:everApproved.size,
  deleted:latest.filter(farmDeleted).length,
  deletedApproved:latest.filter(row=>farmDeleted(row)&&everApproved.has(row.owner_id+':'+row.local_farm_id)).length,
 };
}
export async function loadFarmRegistrations(client,ownerId){
 const rows=[];
 for(let offset=0;;offset+=500){
  let query=client.from('farmshield_registrations').select('*,farmshield_reviews(*),farmshield_farm_state(deleted_at,deleted_by)').order('created_at',{ascending:false}).order('id');
  if(ownerId)query=query.eq('owner_id',ownerId);
  const {data,error}=await query.range(offset,offset+499);
  if(error)throw error;
  rows.push(...data);
  if(data.length<500)return rows;
 }
}
export async function setFarmDeleted(client,ownerId,farmId,deleted){
 const {data,error}=await client.from('farmshield_farm_state').update({deleted_at:deleted?new Date().toISOString():null}).eq('owner_id',ownerId).eq('local_farm_id',farmId).select('owner_id,local_farm_id,deleted_at,deleted_by').maybeSingle();
 if(error)throw error;
 return data;
}
export function reconcileLocalFarms(local,states,ownerId){
 const stateById=new Map(states.filter(state=>state.owner_id===ownerId).map(state=>[state.local_farm_id,state]));
 const farms=[],removedFarms=[];
 for(const farm of local.farms){
  const state=(!farm.cloudOwnerId||farm.cloudOwnerId===ownerId)&&stateById.get(farm.id);
  if(state?.deleted_at)removedFarms.push({...farm,cloudOwnerId:ownerId,cloudDeleted:true,deletedAt:state.deleted_at});
  else farms.push(state?{...farm,cloudOwnerId:ownerId}:farm);
 }
 for(const farm of local.removedFarms){
  const state=(!farm.cloudOwnerId||farm.cloudOwnerId===ownerId)&&stateById.get(farm.id);
  if(state&&!state.deleted_at&&farm.cloudDeleted){const {cloudDeleted,deletedAt,...restored}=farm;farms.push({...restored,cloudOwnerId:ownerId});}
  else if(!removedFarms.some(item=>item.id===farm.id))removedFarms.push(state?.deleted_at?{...farm,cloudOwnerId:ownerId,cloudDeleted:true,deletedAt:state.deleted_at}:farm);
 }
 return {farms,removedFarms};
}
export function persistFarmLists(storage,local){
 const farmKey='farmshield-farms-v1',removedKey='farmshield-removed-farms-v1';
 const previous=[storage.getItem(farmKey),storage.getItem(removedKey)];
 try{storage.setItem(farmKey,JSON.stringify(local.farms));storage.setItem(removedKey,JSON.stringify(local.removedFarms));}
 catch(error){try{[farmKey,removedKey].forEach((key,index)=>{if(previous[index]===null)storage.removeItem(key);else storage.setItem(key,previous[index]);});}catch{}throw error;}
}
