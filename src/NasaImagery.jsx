import React,{useEffect,useRef,useState} from 'react';
import {ArrowClockwise,GlobeHemisphereWest,Warning} from '@phosphor-icons/react';
import {NASA_REGIONS,ZONES,STATE_REGIONS,ZONE_REGIONS} from '../shared/nigeria-regions.mjs';
import {NasaCoverage} from './NasaCoverage.jsx';
const DAY=86400000;
const dayOffset=offset=>new Date(Date.now()-offset*DAY).toISOString().slice(0,10);
export function NasaImagery(){
 const [region,setRegion]=useState('nigeria');
 const [date,setDate]=useState(()=>dayOffset(1)),[data,setData]=useState(null),[loading,setLoading]=useState(false),[ready,setReady]=useState(false),[error,setError]=useState('');
 const controller=useRef(null);
 useEffect(()=>()=>controller.current?.abort(),[]);
 function changeDate(value){controller.current?.abort();setDate(value);setData(null);setReady(false);setError('');setLoading(false)}
 function changeRegion(value,existing){controller.current?.abort();setRegion(value);setReady(Boolean(existing&&existing.imageUrl===data?.imageUrl&&ready));setData(existing||null);setError('');setLoading(false);}
 async function load(){
  controller.current?.abort();const c=new AbortController();controller.current=c;
  setLoading(true);setReady(false);setError('');setData(null);
  try{
   const response=await fetch(`/api/nasa-imagery?location=${encodeURIComponent(region)}&date=${encodeURIComponent(date)}`,{signal:c.signal,headers:{accept:'application/json'}});
   const result=await response.json();
   if(!response.ok)throw new Error(result.error?.message||'NASA imagery could not be loaded.');
   if(!c.signal.aborted)setData(result);
  }catch(e){if(!c.signal.aborted){setError(e.message==='Failed to fetch'?'Cannot reach the imagery service. Please retry.':e.message);setLoading(false)}}
 }
 return <section className="nasa-panel" aria-labelledby="nasa-heading"><div className="nasa-heading"><div><p className="eyebrow">NASA · NIGERIA-WIDE COVERAGE</p><h3 id="nasa-heading"><GlobeHemisphereWest size={22}/>A real view from orbit.</h3><p>Browse all 36 states, the FCT and six geopolitical zones.</p></div><span className="badge">{error?'Unavailable':ready?'NASA image loaded':loading?'Loading imagery':'Not loaded'}</span></div>
 <div className="nasa-controls"><label htmlFor="nasa-region">Satellite region<select id="nasa-region" value={region} onChange={e=>changeRegion(e.target.value)}><option value="nigeria">All Nigeria</option><optgroup label="Geopolitical zones">{ZONE_REGIONS.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</optgroup>{ZONES.map(z=><optgroup key={z.id} label={z.name+' · states'}>{STATE_REGIONS.filter(r=>r.zone===z.id).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</optgroup>)}</select></label><label htmlFor="nasa-date">Requested imagery day<input id="nasa-date" type="date" min={dayOffset(30)} max={dayOffset(1)} value={date} onChange={e=>changeDate(e.target.value)}/></label><button className="secondary" onClick={load} disabled={loading||!date}><ArrowClockwise size={17}/>{loading?'Loading NASA image…':ready?'Reload NASA image':'Load NASA imagery'}</button><p>Choose a day in the past 30 days. Coverage may be incomplete.</p></div>
 {error&&<p role="alert" className="source-error"><Warning size={18}/>{error}</p>}
 <div className="nasa-content"><div className={'nasa-image '+(data&&!error?'has-image':'')} style={data?{aspectRatio:`${data.width}/${data.height}`}:undefined} aria-busy={loading}>
 {data&&!error?<><img src={data.imageUrl} alt={`NASA Terra MODIS regional true-colour view around ${data.location.name}; requested day ${data.requestedDate}`} onLoad={()=>{setReady(true);setLoading(false)}} onError={()=>{setError('The NASA image could not be displayed. Retry or choose another day.');setReady(false);setLoading(false)}}/>{!ready&&<span>Preparing image…</span>}</>:<p>{loading?'Requesting satellite imagery from NASA GIBS…':'Load a dated NASA image. This region viewer uses real satellite imagery, separate from the sample field map.'}</p>}
 </div><div className="nasa-explainer"><h4>{NASA_REGIONS[region]?.name} · regional view</h4><p>Nominal 250 m source imagery, downsampled for regional overviews. Bounding-box views include neighbouring land. Clouds, haze, sensor artefacts and missing data can obscure the ground; blank or black areas are not evidence of drought.</p><p>This is browse imagery, not a field diagnosis. No crop-health index, soil-moisture reading, temperature or harvest prediction has been calculated.</p>{data&&<dl className="nasa-facts"><div><dt>Region</dt><dd>{data.location.name}</dd></div><div><dt>Requested day</dt><dd>{data.requestedDate}</dd></div><div><dt>Image size</dt><dd>{data.width} × {data.height} pixels</dd></div><div><dt>Projection</dt><dd>EPSG:4326</dd></div></dl>}{data&&ready&&<a className="nasa-image-link" href={data.imageUrl} target="_blank" rel="noreferrer">Open regional image</a>}<p className="source-meta">Imagery provided by <a href="https://www.earthdata.nasa.gov/engage/open-data-services-software/earthdata-developer-portal/gibs-api" target="_blank" rel="noreferrer">NASA GIBS</a>, part of NASA ESDIS.{data&&` Retrieved ${new Intl.DateTimeFormat('en-NG',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Africa/Lagos'}).format(new Date(data.fetchedAt))} WAT${data.cached?' · cached':''}.`}</p></div></div><NasaCoverage key={date} date={date} onSelect={changeRegion}/></section>
}
