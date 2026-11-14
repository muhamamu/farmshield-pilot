import React,{useEffect,useState} from 'react';
import {supabase} from './supabase.mjs';
import {useAuth} from './AuthContext.jsx';
import {decisionFor,latestSubmissions,reviewLabels,snapshotMatches,submissionSnapshot} from './registration-review.mjs';

export function FarmReview({farm,navigate}) {
  const {session}=useAuth(),[row,setRow]=useState(null),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState(''),[open,setOpen]=useState(false);
  const [refresh,setRefresh]=useState(0);
  const owner=session?.user.id;
  useEffect(()=>{
    let active=true;setRow(null);setError('');setMessage('');setOpen(false);
    if(!owner){setLoading(false);return;}
    setLoading(true);
    supabase.from('farmshield_registrations').select('*,farmshield_reviews(*)').eq('owner_id',owner).eq('local_farm_id',farm.id).order('created_at',{ascending:false}).limit(1).then(({data,error})=>{if(active){setRow(latestSubmissions(data||[])[0]||null);if(error)setError('Unable to load review status. Please refresh.');setLoading(false);}}).catch(()=>{if(active){setError('Unable to load review status.');setLoading(false);}});
    return()=>{active=false;};
  },[owner,farm.id,refresh]);
  const decision=row&&decisionFor(row),status=decision?.status||'pending',matches=row&&snapshotMatches(farm,row);
  async function submit(event) {
    event.preventDefault();const values=new FormData(event.currentTarget);setBusy(true);setError('');setMessage('');
    try{
      const payload=submissionSnapshot(farm,{farmerName:values.get('farmerName'),phone:values.get('phone')});
      const {data,error}=await supabase.from('farmshield_registrations').insert({...payload,owner_id:owner}).select('*,farmshield_reviews(*)').single();
      if(error)throw error;
      setRow(data);setOpen(false);setMessage('Submitted. An admin will review this copy of your farm details.');
    }catch(err){setError(err.message||'Unable to submit. Your local farm is still saved.');}finally{setBusy(false);}
  }
  return <section className="farm-review"><div className="review-heading"><strong>Farm verification</strong><span className={'verification-badge '+(row?status:'local')}>{loading?'Checking…':row?reviewLabels[status]:'Local draft'}</span></div>{row&&<><p>Submitted {new Date(row.created_at).toLocaleDateString('en-GB')} · {row.farmer_name}</p>{decision&&<div className="review-feedback"><strong>Reviewer’s notes</strong><p>{decision.notes}</p><small>{new Date(decision.created_at).toLocaleString('en-GB')}</small></div>}{!matches&&<p className="review-warning">Local details have changed. This review applies to the submitted copy. Submit the updated details for a new review.</p>}</>}{!session?<><p>Sign in to submit this farm for an admin review.</p><button className="secondary wide" onClick={()=>navigate('/signup')}>Create account / sign in</button></>:<>{(!row||!matches||status==='changes_requested'||status==='rejected')&&<button className="secondary wide" disabled={loading||Boolean(error)||busy} onClick={()=>setOpen(!open)}>{open?'Cancel submission':row?'Submit updated details':'Submit for verification'}</button>}{open&&<form className="review-submit-form" onSubmit={submit}><label>Farmer’s full name<input name="farmerName" autoComplete="name" defaultValue={row?.farmer_name||session.user.user_metadata?.full_name||''} minLength={2} maxLength={100} required/></label><label>Contact phone<input name="phone" type="tel" autoComplete="tel" defaultValue={row?.phone||''} maxLength={30} required/></label><label className="review-consent"><input type="checkbox" required/>I confirm these details are accurate and agree to share this farm’s location and contact details with FarmShield admins for review.</label><p>Your name, phone, crop, area, map pin and land outline will be submitted. Field notes and private backups stay separate.</p><button className="primary wide" disabled={busy}>{busy?'Submitting…':'Send for review'}</button></form>}</>}{error&&<div role="alert" className="account-error"><p>{error}</p><button className="secondary" disabled={loading||busy} onClick={()=>setRefresh(v=>v+1)}>Refresh review status</button></div>}{message&&<p role="status" className="account-success">{message}</p>}</section>;
}
