import React,{useEffect,useState} from 'react';
import {supabase} from './supabase.mjs';
import {documentSubmission,documentTypes,rightsTypes,retentionTypes} from './land-document.mjs';

const BUCKET='farmshield-land-documents';
const options=values=>Object.entries(values).map(([key,label])=><option key={key} value={key}>{label}</option>);
export const draftIntakeEnabled=import.meta.env.VITE_LAND_DOCUMENT_INTAKE_ENABLED==='true';

export function LandDocumentDrafts({owner,farm,onChange}){
 const [drafts,setDrafts]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[loaded,setLoaded]=useState(false);
 async function refresh(){setLoaded(false);onChange(null);setError('');try{const {data,error}=await supabase.from('farmshield_land_document_drafts').select('*').eq('owner_id',owner).eq('local_farm_id',farm.id).order('created_at');if(error)throw error;setDrafts(data);onChange(data.map(row=>row.id));setLoaded(true);}catch{setError('Private drafts could not load. Please refresh.');}}
 useEffect(()=>{if(draftIntakeEnabled)refresh();},[owner,farm.id]);
 async function upload(event){event.preventDefault();const form=event.currentTarget,values=new FormData(form),file=values.get('document');setBusy(true);onChange(null);setError('');try{
  const record=documentSubmission({id:farm.id,owner_id:owner},{file,kind:values.get('kind'),rights:values.get('rights'),retention:values.get('retention'),consent:values.has('consent')});
  const {registration_id,...draft}=record;draft.local_farm_id=farm.id;draft.object_path=record.object_path.replace(`${owner}/`,`${owner}/drafts/`);
  const uploaded=await supabase.storage.from(BUCKET).upload(draft.object_path,file,{contentType:file.type,upsert:false});if(uploaded.error)throw uploaded.error;
  const saved=await supabase.from('farmshield_land_document_drafts').insert(draft);if(saved.error){await supabase.storage.from(BUCKET).remove([draft.object_path]);throw saved.error;}
  form.reset();await refresh();
 }catch{setError('The draft could not be saved. Refresh before trying again.');setLoaded(false);}finally{setBusy(false);}}
 async function remove(row){setBusy(true);onChange(null);setError('');try{const removed=await supabase.storage.from(BUCKET).remove([row.object_path]);if(removed.error||!removed.data?.length)throw Error('File removal not confirmed');const result=await supabase.from('farmshield_land_document_drafts').delete().eq('id',row.id).eq('owner_id',owner);if(result.error)throw result.error;await refresh();}catch{setLoaded(false);setError('Draft removal could not be confirmed. Refresh and try again.');}finally{setBusy(false);}}
 if(!draftIntakeEnabled)return <section className="land-documents"><h3>Land documents</h3><p>Secure document intake is not enabled yet. Please do not upload real land papers.</p></section>;
 return <section className="land-documents" aria-label="Private land document drafts"><h3>Prepare land documents</h3><p className="calm-help">Drafts are private to your account until you send the application for review.</p>{error&&<p role="alert" className="account-error">{error}</p>}<button className="secondary wide" type="button" disabled={busy} onClick={refresh}>Refresh drafts</button>{loaded&&<><ul className="land-document-list">{drafts.map(row=><li key={row.id}><span>{documentTypes[row.document_type]} — private draft</span><button className="secondary" type="button" disabled={busy} onClick={()=>remove(row)}>Remove draft</button></li>)}</ul><form className="activity-form" onSubmit={upload}><label>Land rights<select name="rights" required><option value="">Choose land rights</option>{options(rightsTypes)}</select></label><label>Document type<select name="kind" required><option value="">Choose document type</option>{options(documentTypes)}</select></label><label>Photo or PDF<input name="document" type="file" accept="application/pdf,image/jpeg,image/png" required/></label><label>Retention preference<select name="retention" defaultValue="remove_after_review" required>{options(retentionTypes)}</select></label><label className="review-consent"><input name="consent" required type="checkbox"/>I agree to store this draft privately and share it with reviewers only when I submit the application.</label><button className="primary wide" disabled={busy}>Save private draft</button></form></>}</section>;
}
