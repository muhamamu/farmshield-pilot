import React,{useEffect,useState} from 'react';
import {supabase} from './supabase.mjs';
import {validateBackup} from './farm-backup.mjs';

export function CloudBackup({farms,removedFarms,onRestore}) {
 const [session,setSession]=useState(null),[email,setEmail]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState('');
 useEffect(()=>{
  if(!supabase)return;
  let active=true;
  supabase.auth.getSession().then(({data,error})=>{if(active){setSession(data.session);if(error)setStatus('Unable to load sign-in. Please try again.')}}).catch(()=>{if(active)setStatus('Unable to load sign-in. Please try again.')});
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,next)=>{if(active)setSession(next)});
  return()=>{active=false;subscription.unsubscribe()};
 },[]);
 if(!supabase)return null;
 async function perform(action){setBusy(true);setStatus('');try{await action()}catch(error){setStatus(error.message||'Cloud backup is unavailable. Please try again.')}finally{setBusy(false)}}
 async function signIn(event){event.preventDefault();await perform(async()=>{const {error}=await supabase.auth.signInWithOtp({email:email.trim(),options:{emailRedirectTo:window.location.origin}});if(error)throw error;setStatus('Check your email for the sign-in link. Your farms stay on this device until you choose Back up farms.')})}
 async function save(){await perform(async()=>{const payload=validateBackup({version:1,farms,removedFarms});const {error}=await supabase.from('farmshield_backups').upsert({user_id:session.user.id,payload,updated_at:new Date().toISOString()},{onConflict:'user_id'});if(error)throw error;setStatus('Your farms, outlines and observations are backed up to your account.')})}
 async function restore(){await perform(async()=>{const {data,error}=await supabase.from('farmshield_backups').select('payload').eq('user_id',session.user.id).maybeSingle();if(error)throw error;if(!data){setStatus('No backup saved for this account yet.');return}onRestore(validateBackup(data.payload));setStatus('Backup restored. Existing records on this device were kept.')})}
 return <details className="observation-details"><summary>Account & cloud backup</summary><p className="calm-help">Back up your registered farms, land outlines and observations to your private account. Local changes are saved here first; cloud backups are manual.</p>{session?<><p>Signed in as {session.user.email}</p><div className="calm-draft-actions"><button className="secondary" disabled={busy} onClick={save}>Back up farms</button><button className="secondary" disabled={busy} onClick={restore}>Restore backup</button></div><p className="calm-help">Restore adds missing farms and keeps existing local records, including deleted farms. Back up replaces your previous cloud snapshot.</p><button className="secondary" disabled={busy} onClick={()=>perform(async()=>{const {error}=await supabase.auth.signOut();if(error)throw error;setStatus('Signed out. Local farms remain on this device.')})}>Sign out</button></>:<form onSubmit={signIn}><label>Email address<input type="email" autoComplete="email" required value={email} onChange={event=>setEmail(event.target.value)}/></label><button className="secondary" disabled={busy}>{busy?'Please wait…':'Email me a sign-in link'}</button></form>}{status&&<p role="status" className="calm-help">{status}</p>}</details>;
}
