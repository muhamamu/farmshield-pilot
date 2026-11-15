import {useEffect,useRef,useState} from 'react';
import {supabase} from './supabase.mjs';
import {loadFarmActivity,createJournalEntry,createFarmTask,updateActivity} from './farm-activity.mjs';
export function useFarmActivity(owner,farm){
 const scope=owner+':'+farm,current=useRef(scope);current.current=scope;
 const live=useRef(false),generation=useRef(0),mutation=useRef(false);
 const [state,setState]=useState({scope:null,journal:[],tasks:[],loading:true,error:''}),[busy,setBusy]=useState(false);
 const guard=()=>live.current&&current.current===scope;
 async function refresh(){
  if(!owner||!farm||!supabase||!guard()||mutation.current)return;const ticket=++generation.current;
  setState(previous=>({...previous,scope,loading:true,error:''}));
  try{const data=await loadFarmActivity(supabase,owner,farm);if(guard()&&ticket===generation.current)setState({scope,...data,loading:false,error:''});}
  catch(error){if(guard()&&ticket===generation.current)setState(previous=>({...previous,scope,loading:false,error:error.message||'Activity could not be loaded.'}));}
 }
 useEffect(()=>{live.current=true;refresh();const focus=()=>refresh();window.addEventListener('focus',focus);return()=>{live.current=false;++generation.current;window.removeEventListener('focus',focus);};},[owner,farm]);
 async function perform(list,action){
  if(!guard()||!supabase)throw Error('Sign in again before saving activity.');if(mutation.current)throw Error('Please wait for the current save.');
  mutation.current=true;setBusy(true);++generation.current;
  try{const row=await action();if(!guard())throw Error('The account or farm changed. Reload to see your saved activity.');
   setState(previous=>({...previous,scope,loading:false,[list]:[row,...(previous.scope===scope?previous[list]:[]).filter(item=>item.id!==row.id)]}));return row;
  }finally{mutation.current=false;if(guard())setBusy(false);}
 }
 const visible=state.scope===scope?state:{journal:[],tasks:[],loading:true,error:''};
 return {...visible,busy,refresh,guard,addEntry:(draft,photos)=>perform('journal',()=>createJournalEntry(supabase,owner,farm,draft,photos,guard)),addTask:(draft,key)=>perform('tasks',()=>createFarmTask(supabase,owner,farm,draft,key)),change:(type,row,patch)=>perform(type,()=>updateActivity(supabase,type==='journal'?'farmshield_journal':'farmshield_tasks',owner,farm,row,patch))};
}
