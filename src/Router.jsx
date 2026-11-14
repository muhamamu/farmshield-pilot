import React,{lazy,Suspense,useEffect,useState} from 'react';
import {App} from './App.jsx';
import {useAuth} from './AuthContext.jsx';
const AccountPage=lazy(()=>import('./AccountPage.jsx').then(m=>({default:m.AccountPage})));
const AdminPage=lazy(()=>import('./AdminPage.jsx').then(m=>({default:m.AdminPage})));
export function Router() {
  const [path,setPath]=useState(window.location.pathname),{recovery,session}=useAuth();
  useEffect(()=>{const pointer=()=>{document.documentElement.dataset.input='pointer';};const keyboard=()=>{document.documentElement.dataset.input='keyboard';};document.addEventListener('pointerdown',pointer,true);document.addEventListener('keydown',keyboard,true);return()=>{document.removeEventListener('pointerdown',pointer,true);document.removeEventListener('keydown',keyboard,true);};},[]);
  useEffect(()=>{const pop=()=>setPath(window.location.pathname);window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);},[]);
  function navigate(next){window.history.pushState({},'',next);setPath(next);window.scrollTo(0,0);}
  useEffect(()=>{document.title=(path==='/admin'?'Admin review':path==='/signup'?'Create account':path==='/signin'?'Sign in':'Explore Kano')+' · FarmShield';},[path]);
  let content;
  if(recovery||['/signup','/signin','/reset-password','/update-password'].includes(path))content=<AccountPage key={path} mode={path.slice(1)} navigate={navigate}/>;
  else if(path==='/admin')content=<AdminPage key={session?.user.id||'guest'} navigate={navigate}/>;
  else content=<App navigate={navigate}/>;
  return <Suspense fallback={<main className="access-page" role="status">Loading FarmShield…</main>}>{content}</Suspense>;
}
