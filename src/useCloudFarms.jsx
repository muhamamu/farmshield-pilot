import {useEffect,useRef,useState} from 'react';
import {supabase} from './supabase.mjs';
import {loadCloudFarms,saveCloudFarm} from './cloud-farms.mjs';
import {setFarmDeleted} from './farm-lifecycle.mjs';
export function useCloudFarms(owner){
 const [state,setState]=useState({owner:null,farms:[],loading:false,error:''}),[busy,setBusy]=useState(false);
 const generation=useRef(0),mutation=useRef(false),currentOwner=useRef(owner);currentOwner.current=owner;
 async function refresh(){
  if(!owner||!supabase||currentOwner.current!==owner)return;const ticket=++generation.current;
  setState(previous=>({owner,farms:previous.owner===owner?previous.farms:[],loading:true,error:''}));
  try{const farms=await loadCloudFarms(supabase,owner);if(currentOwner.current===owner&&generation.current===ticket)setState({owner,farms,loading:false,error:''});}
  catch(error){if(currentOwner.current===owner&&generation.current===ticket)setState(previous=>({...previous,owner,loading:false,error:error.message||'Unable to load your farms.'}));}
 }
 useEffect(()=>{
  ++generation.current;
  if(!owner){setState({owner:null,farms:[],loading:false,error:''});return;}
  refresh();const focus=()=>{if(!mutation.current)refresh();};window.addEventListener('focus',focus);return()=>{++generation.current;window.removeEventListener('focus',focus);};
 },[owner]);
 async function perform(action){
  if(!owner||!supabase)throw new Error('Sign in to save your farms.');
  if(mutation.current)throw new Error('A farm is being saved. Please wait.');
  const actor=owner;mutation.current=true;setBusy(true);++generation.current;
  try{const result=await action(actor);if(currentOwner.current!==actor)throw new Error('The account changed. Sign in again to reload your farms.');return result;}
  catch(error){if(currentOwner.current===actor)setState(previous=>({...previous,loading:false}));throw error;}
  finally{mutation.current=false;setBusy(false);}
 }
 async function save(farm){return perform(async actor=>{const saved=await saveCloudFarm(supabase,actor,farm);if(currentOwner.current===actor)setState(previous=>({owner:actor,farms:[saved,...(previous.owner===actor?previous.farms:[]).filter(item=>item.id!==saved.id)],loading:false,error:''}));return saved;});}
 async function availability(farm,deleted){return perform(async actor=>{const result=await setFarmDeleted(supabase,actor,farm.id,deleted);if(!result)throw new Error('Farm not found. Refresh your farms.');if(currentOwner.current===actor)setState(previous=>({...previous,farms:previous.farms.map(item=>item.id===farm.id?{...item,cloudDeleted:deleted,deletedAt:result.deleted_at}:item)}));return true;});}
 const visible=state.owner===owner?state.farms:[];
 return {farms:visible.filter(farm=>!farm.cloudDeleted),removedFarms:visible.filter(farm=>farm.cloudDeleted),allFarms:visible,loading:state.owner===owner?state.loading:Boolean(owner),error:state.owner===owner?state.error:'',busy,refresh,save,availability};
}
