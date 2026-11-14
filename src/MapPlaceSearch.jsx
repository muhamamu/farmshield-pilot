import React,{useEffect,useRef,useState} from 'react';
import {MagnifyingGlass} from '@phosphor-icons/react';
import {findFarmLocations} from './farm-location.mjs';
export function MapPlaceSearch({onSelect}){
 const [query,setQuery]=useState(''),[places,setPlaces]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState('');const request=useRef(0);
 useEffect(()=>()=>{++request.current;},[]);
 async function search(event){event.preventDefault();const ticket=++request.current;setBusy(true);setError('');setPlaces([]);try{const results=await findFarmLocations(query);if(ticket===request.current){setPlaces(results);if(!results.length)setError('No place found in Nigeria. Try a nearby town.');}}catch(error){if(ticket===request.current)setError(error.message);}finally{if(ticket===request.current)setBusy(false);}}
 return <section className="map-place-search"><form onSubmit={search}><label htmlFor="map-place-query">Find a place in Nigeria</label><div><input id="map-place-query" type="search" value={query} required minLength={2} maxLength={120} placeholder="e.g. Lagos or Jos" onChange={event=>{++request.current;setQuery(event.target.value);setPlaces([]);setBusy(false);setError('');}}/><button type="submit" disabled={busy} aria-label="Search Nigeria"><MagnifyingGlass size={17}/></button></div></form>{busy&&<p role="status">Searching Nigeria…</p>}{error&&<p role="status">{error}</p>}{places.length>0&&<div className="map-place-results">{places.map((place,index)=><button key={index} onClick={()=>{onSelect(place);setPlaces([]);}}>{place.label}</button>)}</div>}<small>Place search: Open-Meteo / GeoNames.</small></section>;
}
