import {NASA_REGIONS} from '../shared/nigeria-regions.mjs';
const cache=new Map();
export async function findFarmLocations(query){
 const name=query.trim();if(name.length<2)throw new Error('Enter a village or town in Kano.');
 const key=name.toLowerCase();if(cache.has(key))return cache.get(key);
 const url=new URL('https://geocoding-api.open-meteo.com/v1/search');url.search=new URLSearchParams({name:name.includes(',')?name:name+', Kano',countryCode:'NG',count:'10',language:'en',format:'json'});
 const response=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error('Location search is unavailable. Try again or use a map pin.');
 const body=await response.json(),[west,south,east,north]=NASA_REGIONS['state-kano'].bbox;
 const results=(body.results||[]).filter(p=>p.country_code==='NG'&&p.admin1==='Kano'&&p.latitude>=south&&p.latitude<=north&&p.longitude>=west&&p.longitude<=east).map(p=>({lat:p.latitude,lon:p.longitude,label:[p.name,p.admin2,p.admin1].filter(Boolean).join(', '),query:name}));
 cache.set(key,results);return results;
}
