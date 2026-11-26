import React,{useState} from 'react';
import {supabase} from './supabase.mjs';

export const landGradeLabels={
  A:'Independent ownership confirmation recorded',
  B:'Independent land-use rights confirmation recorded',
  C:'Supporting documents reviewed',
  D:'Not independently verified'
};

export function LandAssessmentForm({row,assessment,onSaved,disabled=false}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  async function submit(event) {
    event.preventDefault();
    const form=event.currentTarget,data=new FormData(form);
    const grade=String(data.get('grade')||''),notes=String(data.get('notes')||'').trim();
    const rights=data.get('rights_basis'),registryStatus=data.get('registry_status');
    const authority=String(data.get('authority')||'').trim(),reference=String(data.get('authority_reference')||'').trim();
    const documentChecked=data.has('document_checked'),holderChecked=data.has('holder_checked'),boundaryChecked=data.has('boundary_checked');
    setBusy(true);setError('');setMessage('');
    try {
      if(!['A','B','C','D'].includes(grade))throw Error('Choose a land grade.');
      if(!notes||notes.length>2000)throw Error('Add a short note for the farmer.');
      if(['A','B'].includes(grade)&&row.boundary?.length<3)throw Error('Draw and save the land outline before recording an A or B grade.');
      if(grade==='A'&&(rights!=='owner'||registryStatus!=='confirmed'||!documentChecked||!holderChecked||!boundaryChecked||!authority||!reference))throw Error('Grade A needs confirmed ownership, checked documents, holder and boundary, and a recorded land authority and reference.');
      if(grade==='B'&&(rights==='owner'||rights==='unknown'||registryStatus!=='confirmed'||!documentChecked||!holderChecked||!boundaryChecked||!authority||!reference))throw Error('Grade B needs confirmed land-use rights, checked documents, holder and boundary, and a recorded land authority and reference.');
      if(grade==='C'&&!documentChecked)throw Error('Check the supporting documents before recording grade C.');
      const optional=value=>String(value||'').trim()||null;
      const {error}=await supabase.from('farmshield_land_assessments').insert({
        registration_id:row.id,grade,rights_basis:rights,
        document_checked:documentChecked,holder_checked:holderChecked,boundary_checked:boundaryChecked,
        registry_status:registryStatus,authority:optional(authority),authority_reference:optional(reference),
        registry_checked_on:optional(data.get('registry_checked_on')),expires_on:optional(data.get('expires_on')),notes
      });
      if(error)throw error;
      await onSaved();
      setMessage('Land grade and farmer notes saved.');
    } catch(err) {
      setError(err.message||'Unable to save the land assessment.');
    } finally {
      setBusy(false);
    }
  }
  return <form key={row.id+String(assessment?.created_at||'')} className="admin-review-form land-assessment-form" onSubmit={submit}>
    <h3>Land evidence assessment</h3>
    <p>A: independent ownership confirmation. B: independent land-use rights confirmation. C: supporting documents reviewed. D: not independently verified.</p>
    {assessment&&<div className="review-feedback"><strong>Latest grade {assessment.grade} · {landGradeLabels[assessment.grade]}</strong><p>{assessment.notes}</p><small>{assessment.expires_on?`Review expires ${assessment.expires_on}`:`Recorded ${new Date(assessment.created_at).toLocaleDateString('en-GB')}`}</small></div>}
    <label className="review-field">Grade<select name="grade" required defaultValue=""><option value="" disabled>Choose a grade</option>{Object.entries(landGradeLabels).map(([grade,label])=><option key={grade} value={grade}>{grade} · {label}</option>)}</select></label>
    <label className="review-field">Rights basis<select name="rights_basis" required defaultValue={assessment?.rights_basis||'unknown'}><option value="owner">Owner</option><option value="tenant">Tenant</option><option value="customary">Customary</option><option value="joint">Joint</option><option value="other">Other</option><option value="unknown">Unknown</option></select></label>
    <label className="review-field">Land register status<select name="registry_status" required defaultValue={assessment?.registry_status||'not_checked'}><option value="not_checked">Not checked</option><option value="pending">Pending</option><option value="inconclusive">Inconclusive</option><option value="confirmed">Confirmed</option><option value="disputed">Disputed</option></select></label>
    <label><input name="document_checked" type="checkbox" defaultChecked={assessment?.document_checked}/> Supporting document checked</label>
    <label><input name="holder_checked" type="checkbox" defaultChecked={assessment?.holder_checked}/> Rights holder checked</label>
    <label><input name="boundary_checked" type="checkbox" defaultChecked={assessment?.boundary_checked}/> Land outline checked</label>
    <label className="review-field">Land authority<input name="authority" maxLength={160} defaultValue={assessment?.authority||''} placeholder="Required for A or B"/></label>
    <label className="review-field">Registry reference<input name="authority_reference" maxLength={160} defaultValue={assessment?.authority_reference||''} placeholder="Required for A or B"/></label>
    <label className="review-field">Registry checked on<input name="registry_checked_on" type="date" defaultValue={assessment?.registry_checked_on||''}/></label>
    <label className="review-field">Review expiry<input name="expires_on" type="date" defaultValue={assessment?.expires_on||''}/></label>
    <label className="review-field">Notes and improvements for the farmer<textarea name="notes" required maxLength={2000} rows={4} placeholder="For C or D, explain what evidence is missing and what to do next."/></label>
    <p>These grades describe evidence reviewed; they do not decide legal ownership on their own. New assessments are retained in the review history.</p>
    {error&&<p className="account-error" role="alert">{error}</p>}{message&&<p className="account-success" role="status">{message}</p>}
    <button className="primary" disabled={disabled||busy}>{busy?'Saving assessment…':'Save land assessment'}</button>
  </form>;
}

