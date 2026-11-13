import React,{useEffect,useRef,useState} from 'react';
import {ArrowClockwise,CloudSun,GlobeHemisphereWest as Satellite,Warning} from '@phosphor-icons/react';
const locations=[['kano','Kano'],['kaduna','Kaduna'],['ibadan','Ibadan'],['abuja','Abuja']];
const formatDate=value=>new Intl.DateTimeFormat('en-NG',{day:'numeric',month:'short',timeZone:'Africa/Lagos'}).format(new Date(value));
const formatTime=value=>new Intl.DateTimeFormat('en-NG',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Africa/Lagos'}).format(new Date(value));
const number=value=>value===null||value===undefined?'—':Number(value).toFixed(1);
export function RegionalData({expanded=false}){
 const [location,setLocation]=useState('kano'),[results,setResults]=useState({}),[loading,setLoading]=useState(false);
 const controller=useRef(null);
 useEffect(()=>()=>controller.current?.abort(),[]);
 function changeLocation(value){controller.current?.abort();setLoading(false);setResults({});setLocation(value)}
 async function connect(){
  controller.current?.abort();const c=new AbortController();controller.current=c;
  setLoading(true);setResults({});
  await Promise.allSettled(['weather','satellite-scenes'].map(async kind=>{
   try{
    const response=await fetch(`/api/${kind}?location=${encodeURIComponent(location)}`,{signal:c.signal,headers:{accept:'application/json'}});
    const json=await response.json();
    if(!response.ok)throw new Error(json.error?.message||'Source unavailable. Please try again.');
    if(!c.signal.aborted)setResults(previous=>({...previous,[kind]:{data:json}}));
   }catch(error){if(!c.signal.aborted)setResults(previous=>({...previous,[kind]:{error:error.message==='Failed to fetch'?'Cannot reach the FarmShield API. Please try again.':error.message}}));}
  }));
  if(!c.signal.aborted)setLoading(false);
 }
 const weather=results.weather, satellite=results['satellite-scenes'];
 return <details className="regional" open={expanded||undefined}><summary>Data tools <span>Weather forecast & satellite catalogue</span></summary><div className="regional-controls"><div><h3>Connect a live source.</h3><p>Public reference locations only. These results are not measurements from the sample advisory records.</p></div><div className="regional-location"><label htmlFor="reference-location">Reference location</label><select id="reference-location" value={location} onChange={e=>changeLocation(e.target.value)}>{locations.map(([id,name])=><option value={id} key={id}>{name}</option>)}</select><button className="secondary" onClick={connect} disabled={loading}><ArrowClockwise size={17}/>{loading?'Connecting…':Object.keys(results).length?'Refresh sources':'Connect sources'}</button></div></div>
 <div className="regional-sources" aria-live="polite">
 <section><div className="source-title"><CloudSun size={21}/><h4>7-day weather forecast</h4><span>{weather?.data?'Connected':weather?.error?'Unavailable':loading?'Loading':'Not connected'}</span></div>
 {weather?.error?<p className="source-error"><Warning size={17}/>{weather.error}</p>:weather?.data?<><p className="source-meta">{weather.data.location.name} · Retrieved {formatTime(weather.data.fetchedAt)} WAT{weather.data.cached?' · cached':''}</p><div className="weather-days">{weather.data.days.map(day=><div key={day.date}><span>{formatDate(day.date+'T12:00:00+01:00')}</span><strong>{number(day.maxTemperatureC)} °C</strong><small>Min {number(day.minTemperatureC)} °C</small><small>Rain {number(day.precipitationMm)} mm</small><small>ET₀ {number(day.referenceEt0Mm)} mm</small></div>)}</div><p className="source-note">Modelled regional forecast. ET₀ is reference water demand, not an irrigation prescription.</p><p className="source-meta">Weather data by <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a> · {weather.data.accessMode==='evaluation'?'Prototype evaluation access':'Commercial endpoint'}</p></>:<p className="source-empty">{loading?'Requesting modelled temperature, rainfall and reference evapotranspiration…':'Connect to retrieve a current forecast. Sample values will not be used as a fallback.'}</p>}
 </section>
 <section><div className="source-title"><Satellite size={21}/><h4>Recent Sentinel-2 scenes</h4><span>{satellite?.data?'Connected':satellite?.error?'Unavailable':loading?'Loading':'Not connected'}</span></div>
 {satellite?.error?<p className="source-error"><Warning size={17}/>{satellite.error}</p>:satellite?.data?<><p className="source-meta">Regional search · past 30 days · newest 5 matches</p>{satellite.data.scenes.length?<ul className="scene-list">{satellite.data.scenes.map(scene=><li key={scene.id}><div><strong>{formatDate(scene.acquiredAt)}</strong><span>{scene.cloudCoverPct===null?'Cloud data unavailable':`${number(scene.cloudCoverPct)}% whole-scene cloud`}</span></div><small>{scene.id}</small></li>)}</ul>:<p className="source-empty">No matching scenes returned for this region and period.</p>}<p className="source-note">Catalogue metadata only. No image pixels or crop-stress indices have been analysed. Scene cloud cover does not establish clear conditions over a field.</p><p className="source-meta"><a href="https://dataspace.copernicus.eu/" target="_blank" rel="noreferrer">Copernicus Data Space</a> · Retrieved {formatTime(satellite.data.fetchedAt)} WAT{satellite.data.cached?' · cached':''}</p></>:<p className="source-empty">{loading?'Searching Copernicus scene metadata…':'Connect to find dated satellite scenes. These catalogue results are separate from the satellite basemap.'}</p>}
 </section></div></details>
}

