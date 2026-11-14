import {useEffect,useRef,useState} from 'react';
import {supabase} from './supabase.mjs';
import {loadApprovedMapFarms} from './approved-map.mjs';
const EMPTY=[];
export function useApprovedMapFarms(owner,isAdmin){
 const [state,setState]=useState({owner:null,farms:EMPTY,loading:false,error:''}),ticket=useRef(0),account=useRef({owner,isAdmin});account.current={owner,isAdmin};
 async function refresh(){
  if(!owner||!isAdmin||!supabase||account.current.owner!==owner||!account.current.isAdmin)return;
  const request=++ticket.current;setState(previous=>({owner,farms:previous.owner===owner?previous.farms:EMPTY,loading:true,error:''}));
  try{const farms=await loadApprovedMapFarms(supabase);if(request===ticket.current&&account.current.owner===owner&&account.current.isAdmin)setState({owner,farms,loading:false,error:''});}
  catch{if(request===ticket.current&&account.current.owner===owner&&account.current.isAdmin)setState({owner,farms:EMPTY,loading:false,error:'Approved farms could not be loaded. Try refreshing.'});}
 }
 useEffect(()=>{++ticket.current;if(!owner||!isAdmin){setState({owner:null,farms:EMPTY,loading:false,error:''});return;}refresh();window.addEventListener('focus',refresh);return()=>{++ticket.current;window.removeEventListener('focus',refresh);};},[owner,isAdmin]);
 return {farms:isAdmin&&state.owner===owner?state.farms:EMPTY,loading:isAdmin&&state.owner===owner?state.loading:Boolean(isAdmin),error:isAdmin&&state.owner===owner?state.error:'',refresh};
}
