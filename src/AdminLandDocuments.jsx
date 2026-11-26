import React,{useCallback,useEffect,useState} from 'react';
import {supabase} from './supabase.mjs';
import {documentState,documentTypes,rightsTypes,retentionTypes,reviewTypes} from './land-document.mjs';

const BUCKET='farmshield-land-documents';
const one=value=>Array.isArray(value)?value[0]||null:value||null;

export function AdminLandDocuments({registrationId,disabled=false}) {
  const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[links,setLinks]=useState({});
  const refresh=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const {data,error}=await supabase.from('farmshield_land_documents').select('*,farmshield_land_document_reviews(decision,notes,reviewed_at),farmshield_land_removal_requests(requested_at)').eq('registration_id',registrationId).order('submitted_at');
      if(error)throw error;
      setRows((data||[]).map(row=>({...row,farmshield_land_document_reviews:one(row.farmshield_land_document_reviews),farmshield_land_removal_requests:one(row.farmshield_land_removal_requests)})));
      setLinks({});
    }catch(err){setError(err.message||'Submitted documents could not be loaded.');}
    finally{setLoading(false);}
  },[registrationId]);
  useEffect(()=>{refresh();},[refresh]);
  async function openFile(row){
    setBusy(true);setError('');
    try{
      const {data,error}=await supabase.storage.from(BUCKET).createSignedUrl(row.object_path,120);
      if(error||!data?.signedUrl)throw error||new Error('A short-lived review link could not be created.');
      setLinks(current=>({...current,[row.id]:data.signedUrl}));
    }catch(err){setError(err.message||'Private document access failed.');}
    finally{setBusy(false);}
  }
  async function saveReview(event,row){
    event.preventDefault();const data=new FormData(event.currentTarget),decision=String(data.get('decision')||''),notes=String(data.get('notes')||'').trim();
    if(!Object.hasOwn(reviewTypes,decision)||!notes){setError('Choose a decision and add notes for the farmer.');return;}
    setBusy(true);setError('');
    try{
      const {error}=await supabase.from('farmshield_land_document_reviews').insert({document_id:row.id,decision,notes});
      if(error)throw error;
      await refresh();
    }catch(err){setError(err.code==='23505'?'This document has already been reviewed. Refresh to see its status.':err.message||'The document review could not be saved.');}
    finally{setBusy(false);}
  }
  return <section className="submitted-land-documents" aria-label="Submitted land documents">
    <h3>Submitted land documents</h3>
    {loading?<p role="status">Loading private documents…</p>:!rows.length?<p>No documents were attached to this submission.</p>:<ul>{rows.map(row=>{
      const state=documentState(row,true),reviewRow=row.farmshield_land_document_reviews,removal=row.farmshield_land_removal_requests;
      return <li key={row.id} className="submitted-land-document"><div><strong>{documentTypes[row.document_type]||'Land evidence'}</strong><span>{rightsTypes[row.rights_basis]||row.rights_basis} · {retentionTypes[row.retention_choice]||row.retention_choice}</span><small>Submitted {new Date(row.submitted_at).toLocaleDateString('en-GB')} · {state.label}</small>{removal&&<small>Removal requested {new Date(removal.requested_at).toLocaleDateString('en-GB')}</small>}</div><div className="submitted-land-document-actions">{links[row.id]?<a className="secondary" href={links[row.id]} target="_blank" rel="noreferrer">Open private file · link expires in 2 minutes</a>:<button className="secondary" disabled={busy||disabled} onClick={()=>openFile(row)}>Create private review link</button>}{reviewRow?<div className="review-feedback"><strong>{reviewTypes[reviewRow.decision]}</strong><p>{reviewRow.notes}</p><small>Reviewed {new Date(reviewRow.reviewed_at).toLocaleDateString('en-GB')}</small></div>:<form className="admin-review-form" onSubmit={event=>saveReview(event,row)}><label className="review-field">Document decision<select name="decision" required defaultValue=""><option value="" disabled>Choose a decision</option>{Object.entries(reviewTypes).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label className="review-field">Notes for the farmer<textarea name="notes" required maxLength={2000} rows={3} placeholder="Explain what is accepted or what is needed next."/></label><button className="primary" disabled={busy||disabled}>{busy?'Saving…':'Save document review'}</button></form>}</div></li>;
    })}</ul>}
    {error&&<p className="account-error" role="alert">{error}</p>}
    <button className="account-text-button" disabled={loading||busy} onClick={refresh}>Refresh documents</button>
  </section>;
}

