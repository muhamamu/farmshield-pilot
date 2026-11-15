import {validateBackup} from './farm-backup.mjs';
const fields=['id','name','crop','size','location','point','boundary','areaSource','enteredAreaHa','stage','status','day','temp','notes','soil','soilReading','soilEstimate','soilPreference','plantingPlan','plantingWeather','en','ha'];
export function farmPayload(farm){
 const payload=Object.fromEntries(fields.filter(key=>farm[key]!==undefined).map(key=>[key,farm[key]]));
 validateBackup({version:1,farms:[payload],removedFarms:[]});
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(payload.id))throw new Error('This farm has an invalid ID.');
 if(payload.name.length>80||!payload.crop.trim()||payload.crop.length>60||!payload.location.trim()||payload.location.length>300)throw new Error('Check the farm name, crop and location.');
 return payload;
}
export function cloudFarm(row){
 return {...row.payload,id:row.local_farm_id,cloudOwnerId:row.owner_id,revision:row.revision,createdAt:row.created_at,updatedAt:row.updated_at,cloudDeleted:Boolean(row.farmshield_farm_state?.deleted_at),deletedAt:row.farmshield_farm_state?.deleted_at||null};
}
export async function loadCloudFarms(client,owner){
 const rows=[];
 for(let offset=0;;offset+=500){const {data,error}=await client.from('farmshield_farms').select('*,farmshield_farm_state(deleted_at,deleted_by)').eq('owner_id',owner).order('updated_at',{ascending:false}).order('local_farm_id').range(offset,offset+499);if(error)throw error;rows.push(...data.map(cloudFarm));if(data.length<500)return rows;}
}
export async function saveCloudFarm(client,owner,farm){
 const payload=farmPayload(farm);
 const query=farm.revision?client.from('farmshield_farms').update({payload}).eq('owner_id',owner).eq('local_farm_id',farm.id).eq('revision',farm.revision):client.from('farmshield_farms').insert({owner_id:owner,local_farm_id:farm.id,payload});
 const {data,error}=await query.select('*,farmshield_farm_state(deleted_at,deleted_by)').maybeSingle();
 if(error)throw error;
 if(!data)throw new Error('This farm changed elsewhere. Refresh your farms before saving again.');
 return cloudFarm(data);
}
export function eligibleDeviceFarms(storage,owner){
 const read=key=>{const value=JSON.parse(storage.getItem(key)||'[]');if(!Array.isArray(value))throw new Error('Device farm data is invalid.');return value;};
 const farms=read('farmshield-farms-v1').filter(farm=>!farm.cloudOwnerId||farm.cloudOwnerId===owner),removedFarms=read('farmshield-removed-farms-v1').filter(farm=>!farm.cloudOwnerId||farm.cloudOwnerId===owner);
 return validateBackup({version:1,farms,removedFarms});
}
