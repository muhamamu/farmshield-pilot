import React,{useEffect,useRef,useState} from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {ArrowsOut,ArrowsIn,MapPin,Crosshair,Warning,Stack,Plus,Minus} from '@phosphor-icons/react';
import {NIGERIA_BOUNDS as BBOX,NIGERIA_HOME as HOME,NIGERIA_VIEW_KEY as STORE,validNigeriaView} from './nigeria-map.mjs';
import {mayRememberMap} from './consent.mjs';
import {MapPlaceSearch} from './MapPlaceSearch.jsx';
import {boundaryError,boundaryAreaHa,formatAreaHa} from '../shared/farm-boundary.mjs';
const IMAGERY='https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const LABELS='https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
function savedView(){if(!mayRememberMap())return null;try{const view=JSON.parse(localStorage.getItem(STORE));if(validNigeriaView(view))return view;}catch{}return null;}
export function SatelliteMap({onPick,clearPinKey=0,boundaryFarm,savedFarms=[],approvedFarms=[],allowGlobal=false,mapFocus,onBoundarySave,onBoundaryCancel}){
 const [ready,setReady]=useState(false);
 const drawing=useRef(null),outlineLayer=useRef(null),saveBoundary=useRef(onBoundarySave);
 const [corners,setCorners]=useState([]),[drawError,setDrawError]=useState('');
 const calculatedArea=corners.length>=3&&!boundaryError(corners)?boundaryAreaHa(corners):null;
 useEffect(()=>{saveBoundary.current=onBoundarySave},[onBoundarySave]);
 useEffect(()=>{drawing.current=boundaryFarm||null;setCorners(boundaryFarm?.boundary||[]);setDrawError('');if(marker.current&&map.current){map.current.removeLayer(marker.current);marker.current=null}if(boundaryFarm&&map.current){if(boundaryFarm.boundary?.length>=3)map.current.fitBounds(boundaryFarm.boundary,{paddingTopLeft:[55,100],paddingBottomRight:[75,235],maxZoom:18});else if(boundaryFarm.point)map.current.setView([boundaryFarm.point.lat,boundaryFarm.point.lon],17);map.current.doubleClickZoom.disable()}else map.current?.doubleClickZoom.enable()},[boundaryFarm?.id]);
 useEffect(()=>{if(!map.current)return;if(outlineLayer.current)map.current.removeLayer(outlineLayer.current);const group=L.layerGroup().addTo(map.current);outlineLayer.current=group;if(corners.length){(corners.length>=3?L.polygon(corners,{color:'#efff75',weight:3,fillColor:'#c8e774',fillOpacity:.2,interactive:false}):L.polyline(corners,{color:'#efff75',weight:3,interactive:false})).addTo(group);corners.forEach((point,index)=>{const dot=L.marker(point,{draggable:Boolean(boundaryFarm),icon:L.divIcon({className:'boundary-corner',html:`<span>${index+1}</span>`,iconSize:[26,26],iconAnchor:[13,13]})}).addTo(group);dot.on('dragend',()=>{const p=dot.getLatLng();setCorners(items=>items.map((value,i)=>i===index?[p.lat,p.lng]:value));setDrawError('')})})}return()=>{map.current?.removeLayer(group)}},[corners,boundaryFarm?.id,ready]);
 useEffect(()=>{
  if(!map.current)return;const group=L.layerGroup().addTo(map.current);
  const visibleApproved=approvedFarms.filter(farm=>!(boundaryFarm&&farm.ownerId===boundaryFarm.cloudOwnerId&&farm.localFarmId===boundaryFarm.id));
  const approvedKeys=new Set(visibleApproved.map(farm=>farm.ownerId+':'+farm.localFarmId));
  function popup(farm,approved){const card=document.createElement('section');card.className='approved-farm-popup';const heading=document.createElement('h3');heading.textContent=farm.name;card.appendChild(heading);for(const line of [approved?'Approved submission':'Your saved farm',farm.crop+' · '+formatAreaHa(farm.size)+' ha',farm.location]){const text=document.createElement('p');text.textContent=line;card.appendChild(text);}return card;}
  function add(farm,approved){
   const color=approved?'#6ce3ad':'#efff75';
   if(farm.boundary?.length>=3)L.polygon(farm.boundary,{color,weight:approved?3:2,fillColor:color,fillOpacity:.16,bubblingMouseEvents:false}).bindPopup(()=>popup(farm,approved)).addTo(group);
   if(farm.point&&Number.isFinite(farm.point.lat)&&Number.isFinite(farm.point.lon))L.circleMarker([farm.point.lat,farm.point.lon],{radius:approved?8:6,color:'#fffef9',weight:2,fillColor:approved?'#21774b':'#8b992c',fillOpacity:1,bubblingMouseEvents:false}).bindTooltip(()=>{const label=document.createElement('span');label.textContent=(approved?'Approved · ':'')+farm.name;return label;}).bindPopup(()=>popup(farm,approved)).addTo(group);
  }
  savedFarms.filter(farm=>farm.id!==boundaryFarm?.id&&!approvedKeys.has(farm.cloudOwnerId+':'+farm.id)).forEach(farm=>add(farm,false));visibleApproved.forEach(farm=>add(farm,true));
  return()=>map.current?.removeLayer(group);
 },[savedFarms,approvedFarms,boundaryFarm?.id,ready]);
 useEffect(()=>{if(!map.current)return;map.current.setMaxBounds(allowGlobal?[]:[[BBOX[1],BBOX[0]],[BBOX[3],BBOX[2]]]);map.current.setMinZoom(allowGlobal?3:5);},[allowGlobal,ready]);
 useEffect(()=>{if(!map.current||!mapFocus)return;if(mapFocus.bounds?.length)map.current.fitBounds(mapFocus.bounds,{padding:[60,60],maxZoom:16});else if(mapFocus.boundary?.length>=3)map.current.fitBounds(mapFocus.boundary,{padding:[70,70],maxZoom:18});else if(mapFocus.point)map.current.setView([mapFocus.point.lat,mapFocus.point.lon],15)},[mapFocus?.request,ready]);
 const host=useRef(null),canvas=useRef(null),map=useRef(null),pick=useRef(onPick),marker=useRef(null),labelsLayer=useRef(null),imageryLayer=useRef(null),options=useRef(null);
 const [view,setView]=useState(HOME),[labels,setLabels]=useState(true),[status,setStatus]=useState('Loading satellite imagery…'),[error,setError]=useState(false),[isFullscreen,setIsFullscreen]=useState(false);
 useEffect(()=>{const update=()=>setIsFullscreen(document.fullscreenElement===host.current);document.addEventListener('fullscreenchange',update);return()=>document.removeEventListener('fullscreenchange',update)},[]);
 useEffect(()=>{function close(event){if(options.current&&!options.current.contains(event.target))options.current.open=false}function escape(event){if(event.key==='Escape'&&options.current?.open){options.current.open=false;options.current.querySelector('summary').focus()}}document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape)}},[]);
 useEffect(()=>{pick.current=onPick},[onPick]);
 useEffect(()=>{if(marker.current&&map.current){map.current.removeLayer(marker.current);marker.current=null}},[clearPinKey]);
 useEffect(()=>{
  const saved=savedView(),initial=saved||HOME;
  const bounds=L.latLngBounds([[BBOX[1],BBOX[0]],[BBOX[3],BBOX[2]]]);
  const m=L.map(canvas.current,{center:[initial.lat,initial.lon],zoom:initial.zoom,minZoom:5,maxZoom:19,maxBounds:bounds,maxBoundsViscosity:1,zoomControl:false,preferCanvas:true,scrollWheelZoom:true});
  if(!saved)m.fitBounds(bounds,{padding:[24,24],maxZoom:6,animate:false});
  map.current=m;setReady(true);let loaded=0,failed=0;
  const imagery=L.tileLayer(IMAGERY,{maxZoom:19,maxNativeZoom:19,noWrap:true,attribution:'Imagery © <a href="https://www.esri.com/">Esri</a>, Vantor, Earthstar Geographics, GIS User Community'});
  imageryLayer.current=imagery;
  imagery.on('loading',()=>{loaded=0;failed=0;setStatus('Loading satellite imagery…');setError(false)});
  imagery.on('tileload',()=>{loaded++;setStatus('Satellite basemap');setError(false)});
  imagery.on('tileerror',()=>{failed++;setError(true);setStatus('Some map tiles could not load')});
  imagery.on('load',()=>{setError(failed>0);setStatus(loaded===0?'Satellite imagery unavailable':failed?'Some tiles unavailable · try another zoom':'Satellite basemap')});
  imagery.addTo(m);
  const labels=L.tileLayer(LABELS,{maxZoom:19,maxNativeZoom:18,noWrap:true,attribution:'Labels © Esri'}).addTo(m);labelsLayer.current=labels;
  L.control.scale({position:'bottomleft',imperial:false,maxWidth:120}).addTo(m);
  const update=()=>{const p=m.getCenter(),v={lat:p.lat,lon:p.lng,zoom:m.getZoom()};setView(v);try{if(mayRememberMap())localStorage.setItem(STORE,JSON.stringify(v))}catch{}};
  m.on('moveend zoomend',update);update();
  m.on('click',event=>{if(drawing.current){setCorners(items=>[...items,[event.latlng.lat,event.latlng.lng]]);setDrawError('');return}const point={lat:Number(event.latlng.lat.toFixed(6)),lon:Number(event.latlng.lng.toFixed(6))};if(marker.current)m.removeLayer(marker.current);marker.current=L.circleMarker(event.latlng,{radius:7,color:'#fff',weight:3,fillColor:'#16452b',fillOpacity:1}).addTo(m);pick.current?.(point);});
  const observer=new ResizeObserver(()=>m.invalidateSize({pan:false}));observer.observe(canvas.current);
  return()=>{observer.disconnect();m.remove();map.current=null;marker.current=null;};
 },[]);
 function home(){map.current?.fitBounds([[BBOX[1],BBOX[0]],[BBOX[3],BBOX[2]]],{padding:[24,24],maxZoom:6});if(options.current)options.current.open=false;}
 function choosePlace(point){if(!map.current)return;map.current.setView([point.lat,point.lon],14);if(marker.current)map.current.removeLayer(marker.current);marker.current=L.circleMarker([point.lat,point.lon],{radius:7,color:'#fff',weight:3,fillColor:'#16452b',fillOpacity:1}).addTo(map.current);pick.current?.(point);if(options.current)options.current.open=false;}
 function toggleLabels(){if(!map.current)return;if(labels)map.current.removeLayer(labelsLayer.current);else labelsLayer.current.addTo(map.current);setLabels(!labels);if(options.current)options.current.open=false;}
 async function fullscreen(){try{if(document.fullscreenElement===host.current)await document.exitFullscreen();else await host.current.requestFullscreen();}catch{setStatus('Full screen is unavailable in this browser.')}}
 return <section className="satellite-map" ref={host} aria-label={allowGlobal?'Interactive satellite map of approved farms':'Interactive satellite map of Nigeria'}><div className="satellite-toolbar"><div className="map-location"><MapPin size={16} weight="fill"/><strong>Nigeria</strong></div></div><div className="satellite-canvas" ref={canvas} aria-label="Drag to pan the map; use plus and minus to zoom"/><div className="map-control-rail" role="group" aria-label="Map controls"><div className="map-zoom-group"><button disabled={view.zoom>=19} onClick={()=>map.current?.zoomIn()} aria-label="Zoom in" title="Zoom in"><Plus size={21}/></button><button disabled={view.zoom<=(allowGlobal?3:5)} onClick={()=>map.current?.zoomOut()} aria-label="Zoom out" title="Zoom out"><Minus size={21}/></button></div><button onClick={()=>home()} aria-label="Show Nigeria overview" title="Show Nigeria overview"><Crosshair size={21}/></button><button onClick={fullscreen} aria-label={isFullscreen?'Exit full screen':'Expand map to full screen'} title={isFullscreen?'Exit full screen':'Full screen'}>{isFullscreen?<ArrowsIn size={21}/>:<ArrowsOut size={21}/>}</button></div><details className="map-options" ref={options}><summary><Stack size={18}/><span>Search Nigeria & layers</span></summary><div className="satellite-tools"><MapPlaceSearch onSelect={choosePlace}/><button onClick={home}>Nigeria overview</button><span className="map-menu-label">Map layer</span><button onClick={toggleLabels} aria-pressed={labels}>Place labels <span>{labels?'On':'Off'}</span></button></div></details>{boundaryFarm&&<section className="boundary-editor" aria-label="Draw farm outline"><strong>{boundaryFarm.name} · land outline</strong><p>Click or tap each corner of your land. Drag numbered corners to adjust them. Pan and zoom to get closer.</p><p className="boundary-area" role="status">{calculatedArea===null?'Add at least three corners to calculate area.':<>Estimated area: <strong>{formatAreaHa(calculatedArea)} ha</strong></>}</p><div className="boundary-actions"><button disabled={!corners.length} onClick={()=>{setCorners(items=>items.slice(0,-1));setDrawError('')}}>Undo corner</button><button disabled={!corners.length} onClick={()=>{setCorners([]);setDrawError('')}}>Start over</button><button onClick={onBoundaryCancel}>Cancel</button><button className="save-boundary" disabled={corners.length<3} onClick={()=>{const error=boundaryError(corners);if(error){setDrawError(error);return}saveBoundary.current(corners)}}>Save outline ({corners.length})</button></div>{drawError&&<p role="alert">{drawError}</p>}<small>Saving this outline updates the farm area. Approximate map measurement, not a land survey.</small></section>}<div className={'satellite-readout '+(error?'map-error':status==='Satellite basemap'?'map-ready':'')} role="status">{error&&<Warning size={15}/>}<span>{status}</span></div></section>
}



