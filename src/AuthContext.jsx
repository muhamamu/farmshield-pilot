import React,{createContext,useContext,useEffect,useRef,useState} from 'react';
import {supabase} from './supabase.mjs';
const AuthContext=createContext(null);
export function AuthProvider({children}) {
  const [session,setSession]=useState(null),[loading,setLoading]=useState(Boolean(supabase)),[isAdmin,setIsAdmin]=useState(false),[error,setError]=useState(''),[recovery,setRecovery]=useState(false);
  const generation=useRef(0);
  useEffect(()=>{document.documentElement.dataset.reduceMotion=String(session?.user.user_metadata?.reduce_motion===true);},[session?.user.user_metadata?.reduce_motion]);
  useEffect(()=>{
    if(!supabase)return;
    let active=true,authEvent=false;
    function accept(next) {
      if(!active)return;
      const version=++generation.current;
      setSession(next);setIsAdmin(false);setLoading(Boolean(next?.user));setError('');
      if(next?.user) {
        // Do not await another Supabase call inside the auth event callback.
        Promise.resolve().then(()=>supabase.from('farmshield_admins').select('user_id').eq('user_id',next.user.id).maybeSingle()).then(({data,error})=>{
          if(active&&version===generation.current){setIsAdmin(Boolean(data)&&!error);setLoading(false);if(error)setError('Admin permissions could not be checked. Retry by reloading this page.');}
        }).catch(()=>{if(active&&version===generation.current){setError('Unable to check account permissions.');setLoading(false);}});
      }
    }
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,next)=>{authEvent=true;if(event==='PASSWORD_RECOVERY')setRecovery(true);if(event==='SIGNED_OUT')setRecovery(false);accept(next);});
    supabase.auth.getSession().then(({data,error})=>{if(!active||authEvent)return;if(error){setError(error.message);setLoading(false);}else accept(data.session);}).catch(()=>{if(active){setError('Unable to load your account. Please reload.');setLoading(false);}});
    return()=>{active=false;++generation.current;subscription.unsubscribe();};
  },[]);
  return <AuthContext.Provider value={{session,loading,isAdmin,error,recovery,finishRecovery:()=>setRecovery(false)}}>{children}</AuthContext.Provider>;
}
export function useAuth(){return useContext(AuthContext);}
