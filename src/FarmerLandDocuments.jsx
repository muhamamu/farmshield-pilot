import React,{useCallback,useEffect,useState} from 'react';
import {supabase} from './supabase.mjs';
import {documentState,documentTypes,rightsTypes,retentionTypes,reviewTypes} from './land-document.mjs';

const one=value=>Array.isArray(value)?value[0]||null:value||null;

export function FarmerLandDocuments({registrationId}) {
  const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const refresh=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const {data,error}=await supabase.from('farmshield_land_documents').select('*,farmshield_land_document_reviews(decision,notes,reviewed_at),farmshield_land_removal_requests(requested_at)').eq('registration_id',registrationId).order('submitted_at');
      if(error)throw error;
      setRows((data||[]).map(row=>({...row,farmshield_land_document_reviews:one(row.farmshield_land_document_reviews),farmshield_land_removal_requests:one(row.farmshield_land_removal_requests)})));
    }catch(err){setError(err.message||'Submitted land documents could not be loaded.');}
    finally{setLoading(false);}
  },[registrationId]);
  useEffect(()=>{refresh();},[refresh]);
  async function requestRemoval(documentId){
    setBusy(true);setError('');setMessage('');
    try{
      const {error}=await supabase.from('farmshield_land_removal_requests').insert({document_id:documentId});
      if(error)throw error;
      await refresh();setMessage('Your removal request has been recorded.');
    }catch(err){setError(err.code==='23505'?'A removal request is already recorded for this file.':err.message||'The removal request could not be saved.');}
    finally{setBusy(false);}
  }
  return <section className="farmer-land-documents" aria-label="Submitted land documents"><h3>Submitted land documents</h3>{loading?<p role="status">Loading document status…</p>:!rows.length&&!error?<p>No land documents were attached to this submission.</p>:<ul>{rows.map(row=>{
    const status=documentState(row,true),review=row.farmshield_land_document_reviews,removal=row.farmshield_land_removal_requests;
    return <li key={row.id}><div><strong>{documentTypes[row.document_type]||'Land evidence'}</strong><span>{rightsTypes[row.rights_basis]||row.rights_basis} · {retentionTypes[row.retention_choice]||row.retention_choice}</span><small>{review?`${status.label} · ${review.notes}`:status.label}</small>{review&&<small>Reviewed {new Date(review.reviewed_at).toLocaleDateString('en-GB')} · {reviewTypes[review.decision]}</small>}{removal&&<small>Removal requested {new Date(removal.requested_at).toLocaleDateString('en-GB')}</small>}</div>{!removal&&<button className="secondary" disabled={busy} onClick={()=>requestRemoval(row.id)}>Request document removal</button>}</li>;
  })}</ul>}{error&&<p className="account-error" role="alert">{error}</p>}{message&&<p className="account-success" role="status">{message}</p>}<button className="account-text-button" disabled={loading||busy} onClick={refresh}>Refresh document status</button></section>;
}

