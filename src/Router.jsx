import React,{lazy,Suspense,useEffect,useState} from 'react';
import {App} from './App.jsx';
import {useAuth} from './AuthContext.jsx';
import {LegalPage,POLICY_ROUTES} from './LegalPage.jsx';
import {LegalControls} from './CookieConsent.jsx';
const AccountPage=lazy(()=>import('./AccountPage.jsx').then(m=>({default:m.AccountPage})));
const AdminPage=lazy(()=>import('./AdminPage.jsx').then(m=>({default:m.AdminPage})));
const ProfilePage=lazy(()=>import('./ProfilePage.jsx').then(m=>({default:m.ProfilePage})));
export function Router() {
  const [path,setPath]=useState(window.location.pathname),{recovery,session}=useAuth();
  useEffect(()=>{if(session&&!recovery&&['/signin','/signup','/reset-password'].includes(path)){window.history.replaceState({},'', '/account');setPath('/account');}},[path,session?.user.id,recovery]);
  useEffect(()=>{const pointer=()=>{document.documentElement.dataset.input='pointer';};const keyboard=()=>{document.documentElement.dataset.input='keyboard';};document.addEventListener('pointerdown',pointer,true);document.addEventListener('keydown',keyboard,true);return()=>{document.removeEventListener('pointerdown',pointer,true);document.removeEventListener('keydown',keyboard,true);};},[]);
  useEffect(()=>{const pop=()=>setPath(window.location.pathname);window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);},[]);
  function navigate(next){window.history.pushState({},'',next);setPath(next);window.scrollTo(0,0);}
  useEffect(()=>{document.title=(POLICY_ROUTES[path]||(path==='/account'?'My account':path==='/admin'?'Admin review':path==='/signup'?'Create account':path==='/signin'?'Sign in':'Explore Nigeria'))+' · FarmShield';},[path]);
  let content;
  if(POLICY_ROUTES[path])content=<LegalPage path={path} navigate={navigate}/>;
  else if(recovery||path==='/update-password')content=<AccountPage key={path} mode="update-password" navigate={navigate}/>;
  else if(path==='/account'||(session&&['/signin','/signup','/reset-password'].includes(path)))content=<ProfilePage key={session?.user.id||'guest'} navigate={navigate}/>;
  else if(['/signup','/signin','/reset-password'].includes(path))content=<AccountPage key={path} mode={path.slice(1)} navigate={navigate}/>;
  else if(path==='/admin')content=<AdminPage key={session?.user.id||'guest'} navigate={navigate}/>;
  else content=<App navigate={navigate}/>;
  return <><Suspense fallback={<main className="access-page" role="status">Loading FarmShield…</main>}>{content}</Suspense><LegalControls navigate={navigate}/></>;
}
