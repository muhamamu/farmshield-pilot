import {NATIONAL_REGION} from './nigeria-regions.mjs';
export function resolveDataPoint(value){
 if(!value||typeof value!=='object')return null;
 const numeric=value=>typeof value==='number'?value:typeof value==='string'&&/^-?\d+(\.\d+)?$/.test(value)?Number(value):NaN;
 const lat=numeric(value.lat??value.latitude),lon=numeric(value.lon??value.longitude),[west,south,east,north]=NATIONAL_REGION.bbox;
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat<south||lat>north||lon<west||lon>east)return null;
 return {latitude:Number(lat.toFixed(5)),longitude:Number(lon.toFixed(5)),name:'Selected location'};
}
