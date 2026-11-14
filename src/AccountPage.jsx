import React,{useState} from 'react';
import {Leaf,ArrowLeft,ShieldCheck,MapPin,Plant} from '@phosphor-icons/react';
import {supabase} from './supabase.mjs';
import {useAuth} from './AuthContext.jsx';
export function AccountPage({mode='signup',navigate}) {
  const {session,recovery,finishRecovery}=useAuth();
  const actual=recovery?'update-password':mode;
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
  const signup=actual==='signup',reset=actual==='reset-password',update=actual==='update-password';
  async function submit(event) {
    event.preventDefault();const form=new FormData(event.currentTarget),email=String(form.get('email')||'').trim(),password=String(form.get('password')||'');
    setBusy(true);setError('');setMessage('');
    try {
      if(!supabase)throw new Error('Account service is not configured.');
      if((signup||update)&&password!==form.get('confirm'))throw new Error('The passwords do not match.');
      let result;
      if(update)result=await supabase.auth.updateUser({password});
      else if(reset)result=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin});
      else if(signup)result=await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin,data:{full_name:String(form.get('name')||'').trim()}}});
      else result=await supabase.auth.signInWithPassword({email,password});
      if(result.error)throw result.error;
      if(update){finishRecovery();navigate('/');}
      else if(reset)setMessage('If this address has an account, you’ll receive a password reset link.');
      else if(signup&&!result.data.session)setMessage('Check your email to confirm your account, then sign in.');
      else navigate('/');
    }catch(err){setError(err.message||'Unable to continue. Please try again.');}finally{setBusy(false);}
  }
  return <main className="account-layout"><section className="account-story"><a className="calm-brand" href="/" onClick={e=>{e.preventDefault();navigate('/');}}><Leaf size={30} weight="duotone"/>FarmShield</a><div><p className="account-eyebrow">GROW WITH CONFIDENCE</p><h1>A better home<br/>for your farm.</h1><p>Register your land. Keep your details together. Get a clearer path from the field to support.</p><ul><li><MapPin size={22}/>Put your farm on the map</li><li><ShieldCheck size={22}/>Submit details for a careful review</li><li><Plant size={22}/>Keep growing with your workspace</li></ul></div><small>Built for the Nigerian farming community.</small></section><section className="account-form-side"><button className="account-back" onClick={()=>navigate('/')}><ArrowLeft size={17}/>Back to the map</button><div className="account-form-wrap"><p className="calm-eyebrow">YOUR FARMS, TOGETHER</p><h2>{update?'Choose a new password.':reset?'Forgot your password?':signup?'Let’s get you growing.':'Welcome back.'}</h2><p>{update?'Set a secure password for your account.':reset?'We’ll email you a link to reset it.':signup?'Create your account to submit farms and track their review.':'Sign in to your FarmShield account.'}</p>{session&&!update?<><p>You’re signed in as {session.user.email}.</p><button className="primary wide" onClick={()=>navigate('/')}>Open your workspace</button><button className="account-text-button" disabled={busy} onClick={async()=>{setBusy(true);setError('');try{const {error}=await supabase.auth.signOut();if(error)throw error;}catch(err){setError(err.message);}finally{setBusy(false);}}}>Sign out</button>{error&&<p className="account-error" role="alert">{error}</p>}</>:<form onSubmit={submit} className="account-form">{signup&&<label>Full name<input name="name" autoComplete="name" required minLength={2} maxLength={100} placeholder="Your full name"/></label>}{!update&&<label>Email address<input name="email" type="email" autoComplete="email" required placeholder="you@example.com"/></label>}{!reset&&<label>{update?'New password':'Password'}<input name="password" type="password" autoComplete={signup||update?'new-password':'current-password'} minLength={signup||update?8:1} maxLength={128} required/>{(signup||update)&&<small>Use at least 8 characters.</small>}</label>}{(signup||update)&&<label>Confirm password<input name="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={128} required/></label>}{error&&<p className="account-error" role="alert">{error}</p>}{message&&<p className="account-success" role="status">{message}</p>}<button className="primary wide" disabled={busy||!supabase}>{busy?'Please wait…':update?'Save password':reset?'Send reset link':signup?'Create account':'Sign in'}</button></form>}{!signup&&!reset&&!update&&<button className="account-text-button" onClick={()=>navigate('/reset-password')}>Forgot password?</button>}{!update&&<p className="account-switch">{signup?'Already have an account?':'New to FarmShield?'} <a href={signup?'/signin':'/signup'} onClick={e=>{e.preventDefault();navigate(signup?'/signin':'/signup');}}>{signup?'Sign in':'Create an account'}</a></p>}<p className="account-fineprint">Farm reviews check the information submitted. Approval does not establish land ownership.</p></div></section></main>;
}
