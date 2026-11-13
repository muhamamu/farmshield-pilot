import React,{useEffect,useRef,useState} from 'react';
import {STATE_REGIONS,ZONES,BOUNDARY_SOURCE} from '../shared/nigeria-regions.mjs';
import {DownloadSimple,ArrowClockwise} from '@phosphor-icons/react';
export function NasaCoverage({date,onSelect}){
 const [results,setResults]=useState({}),[running,setRunning]=useState(false),[zone,setZone]=useState('all'),[cancelled,setCancelled]=useState(false);
 const controller=useRef(null);
 useEffect(()=>()=>controller.current?.abort(),[]);
 async function loadAll(){
  const c=new AbortController();controller.current=c;setRunning(true);setCancelled(false);setResults({});let next=0;
  async function worker(){while(!c.signal.aborted&&next<STATE_REGIONS.length){const region=STATE_REGIONS[next++];setResults(previous=>({...previous,[region.id]:{status:'loading'}}));
   try{const r=await fetch(`/api/nasa-imagery?location=${region.id}&date=${date}`,{signal:c.signal});const data=await r.json();if(!r.ok)throw Error(data.error?.message||'Image unavailable');if(!c.signal.aborted)setResults(previous=>({...previous,[region.id]:{status:'ready',data}}));}
   catch(error){if(!c.signal.aborted)setResults(previous=>({...previous,[region.id]:{status:'error',error:error.message}}));}
  }}
  await Promise.allSettled([worker(),worker(),worker()]);setRunning(false);
 }
 function cancel(){controller.current?.abort();setRunning(false);setCancelled(true);setResults(previous=>Object.fromEntries(Object.entries(previous).filter(([,value])=>value.status!=='loading')))}
 const complete=Object.values(results).filter(value=>value.status==='ready').length,failed=Object.values(results).filter(value=>value.status==='error').length;
 function download(){const blob=new Blob([JSON.stringify({requestedDate:date,provider:'NASA GIBS',boundarySource:BOUNDARY_SOURCE,complete,failed,regions:STATE_REGIONS.map(region=>({...region,...(results[region.id]||{status:'not-loaded'})}))},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`farmshield-nigeria-${date}.json`;a.click();URL.revokeObjectURL(url)}
 return <section className="coverage"><div className="coverage-top"><div><h3>Every state, one workspace.</h3><p>36 states + FCT · 6 zones · imagery requested for {date}</p></div><div className="coverage-actions"><button className="secondary" onClick={loadAll} disabled={running||!date}><ArrowClockwise size={17}/>{running?'Loading states…':complete?'Reload all 37 areas':'Load all 37 areas'}</button>{running&&<button className="secondary" onClick={cancel}>Cancel</button>}<button className="plain" disabled={!complete&&!failed} onClick={download}><DownloadSimple size={17}/>Export metadata</button></div></div>
 <div className="coverage-progress" role="status"><progress max={37} value={complete+failed}/><span>{complete} images fetched · {failed} errors · {37-complete-failed} remaining{cancelled?' · cancelled':''}</span></div>
 <div className="zone-tabs" role="group" aria-label="Filter state images by zone"><button className={zone==='all'?'active':''} onClick={()=>setZone('all')}>All Nigeria</button>{ZONES.map(z=><button key={z.id} className={zone===z.id?'active':''} onClick={()=>setZone(z.id)}>{z.name}</button>)}</div>
 <div className="coverage-grid">{STATE_REGIONS.filter(region=>zone==='all'||region.zone===zone).map(region=>{const result=results[region.id];return <article key={region.id} className="state-tile"><button className="state-open" onClick={()=>onSelect(region.id,result?.data)} aria-label={`View ${region.name} satellite imagery`}>{result?.status==='ready'?<img loading="lazy" src={result.data.imageUrl} alt={`NASA regional view of ${region.name}; requested ${date}`}/>:<span className="tile-status">{result?.status==='loading'?'Fetching image…':result?.status==='error'?'Image unavailable':'Select to view'}</span>}<strong>{region.name}</strong></button><small>{ZONES.find(z=>z.id===region.zone)?.name} · {result?.status==='ready'?'Fetched':result?.status==='error'?'Retry individually':'Not yet fetched'}</small></article>})}</div>
 <p className="source-meta">Area extents: <a href="https://www.geoboundaries.org/api/current/gbOpen/NGA/ADM1/" target="_blank" rel="noreferrer">geoBoundaries / GRID3</a> · 2022 boundary representation · CC BY 4.0. Views use bounding boxes and can include neighbouring land. A fetched image may still contain clouds or no-data areas.</p></section>
}
