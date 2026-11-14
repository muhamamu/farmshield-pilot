import React,{useEffect,useState} from 'react';
import {supabase} from './supabase.mjs';
import {useAuth} from './AuthContext.jsx';
import {eligibleDeviceFarms,farmPayload} from './cloud-farms.mjs';
import {validateBackup} from './farm-backup.mjs';
export function FarmImport({onImported,disabled}){
 const {session}=useAuth(),owner=session?.user.id;
 const [device,setDevice]=useState(null),[backup,setBackup]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 useEffect(()=>{if(!owner)return;let active=true;setBackup(null);setDevice(null);setError('');try{setDevice(eligibleDeviceFarms(localStorage,owner));}catch{setError('Some older device records could not be read. They have been kept unchanged.');}
 supabase.from('farmshield_backups').select('payload').eq('user_id',owner).maybeSingle().then(({data,error})=>{if(!active)return;if(error)setError('Older cloud backups could not be checked. You can retry after reloading.');else if(data){try{setBackup(validateBackup(data.payload));}catch{setError('The older backup could not be imported. It remains stored unchanged.');}}}).catch(()=>{if(active)setError('Unable to check older cloud backups.');});return()=>{active=false;};},[owner]);
 if(!owner)return null;
 const count=payload=>(payload?.farms.length||0)+(payload?.removedFarms.length||0);
 if(!count(device)&&!count(backup)&&!error&&!message)return null;
 async function run(payload,source){
  setBusy(true);setError('');setMessage('');let imported=0,skipped=0;const importedIds=new Set();
  try{
   for(const [records,deleted] of [[payload.farms,false],[payload.removedFarms,true]])for(const farm of records){
    if(farm.cloudOwnerId&&farm.cloudOwnerId!==owner){skipped++;continue;}
    const {data,error}=await supabase.rpc('farmshield_import_farm',{farm_data:{...farmPayload(farm),_importOwner:owner},was_deleted:deleted});if(error)throw error;if(data){imported++;importedIds.add(farm.id);}else skipped++;
   }
   if(source==='device'&&importedIds.size){
    for(const key of ['farmshield-farms-v1','farmshield-removed-farms-v1']){const previous=JSON.parse(localStorage.getItem(key)||'[]');const remaining=previous.filter(farm=>!importedIds.has(farm.id)||farm.cloudOwnerId&&farm.cloudOwnerId!==owner);if(remaining.length)localStorage.setItem(key,JSON.stringify(remaining));else localStorage.removeItem(key);}
    setDevice(eligibleDeviceFarms(localStorage,owner));
   }
   setMessage(`${imported} farms imported into your account. ${skipped} existing or changed records kept unchanged.`);
  }catch(err){setError(`${err.message||'Import stopped.'} ${imported} farms were saved before this error. Remaining source records have been kept.`);}
  finally{await onImported();setBusy(false);}
 }
 return <details className="farm-import"><summary>Bring in older farm records</summary><p>New farms save directly to your account. Import older device farms or your previous cloud backup here. Changed cloud records will be kept.</p>{count(device)>0&&<><p>{count(device)} device farms available for {session.user.email}:</p><ul>{[...device.farms,...device.removedFarms].map(farm=><li key={farm.id}>{farm.name}{device.removedFarms.some(item=>item.id===farm.id)?' · deleted':''}</li>)}</ul><button className="secondary wide" disabled={busy||disabled} onClick={()=>run(device,'device')}>{busy?'Importing…':'Import these device farms'}</button></>}{count(backup)>0&&<button className="secondary wide" disabled={busy||disabled} onClick={()=>run(backup,'backup')}>Import previous cloud backup ({count(backup)})</button>}{error&&<p role="alert" className="account-error">{error}</p>}{message&&<p role="status" className="account-success">{message}</p>}</details>;
}
