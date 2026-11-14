import {useAuth} from './AuthContext.jsx';
import React,{useState} from 'react';
import {supabase} from './supabase.mjs';


import {validateBackup} from './farm-backup.mjs';

export function CloudBackup({farms,removedFarms,onRestore,navigate}) {
 const {session}=useAuth();
 const [busy,setBusy]=useState(false),[status,setStatus]=useState('');
 if(!supabase)return null;
 async function perform(action){setBusy(true);setStatus('');try{await action()}catch(error){setStatus(error.message||'Cloud backup is unavailable. Please try again.')}finally{setBusy(false)}}
 async function save(){await perform(async()=>{const payload=validateBackup({version:1,farms,removedFarms});const {error}=await supabase.from('farmshield_backups').upsert({user_id:session.user.id,payload,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)throw error;setStatus('Your farms, outlines and observations are backed up to your account.')})}
 async function restore(){await perform(async()=>{const {data,error}=await supabase.from('farmshield_backups').select('payload').eq('user_id',session.user.id).maybeSingle();if(error)throw error;if(!data){setStatus('No backup saved for this account yet.');return}onRestore(validateBackup(data.payload));setStatus('Backup restored. Existing records on this device were kept.')})}
 return <details className="observation-details"><summary>Account & cloud backup</summary><p className="calm-help">Back up your registered farms, land outlines and observations to your private account. Local changes are saved here first; cloud backups are manual.</p>{session?<><p>Signed in as {session.user.email}</p><div className="calm-draft-actions"><button className="secondary" disabled={busy} onClick={save}>Back up farms</button><button className="secondary" disabled={busy} onClick={restore}>Restore backup</button></div><p className="calm-help">Restore adds missing farms and keeps existing local records, including deleted farms. Back up replaces your previous cloud snapshot.</p><button className="secondary" disabled={busy} onClick={()=>perform(async()=>{const {error}=await supabase.auth.signOut();if(error)throw error;setStatus('Signed out. Local farms remain on this device.')})}>Sign out</button></>:<div className="calm-draft-actions"><button className="primary" onClick={()=>navigate('/signup')}>Create account</button><button className="secondary" onClick={()=>navigate('/signin')}>Sign in</button></div>}{status&&<p role="status" className="calm-help">{status}</p>}</details>;
}
