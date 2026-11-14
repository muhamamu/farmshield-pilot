import {NATIONAL_REGION} from '../shared/nigeria-regions.mjs';
export const NIGERIA_BOUNDS=NATIONAL_REGION.bbox;
export const NIGERIA_HOME={lat:NATIONAL_REGION.latitude,lon:NATIONAL_REGION.longitude,zoom:5};
export const NIGERIA_VIEW_KEY='farmshield.nigeria-map.v1';
export function isNigeriaPoint(lat,lon){return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=NIGERIA_BOUNDS[1]&&lat<=NIGERIA_BOUNDS[3]&&lon>=NIGERIA_BOUNDS[0]&&lon<=NIGERIA_BOUNDS[2];}
export function validNigeriaView(view){return Boolean(view&&isNigeriaPoint(view.lat,view.lon)&&Number.isFinite(view.zoom)&&view.zoom>=5&&view.zoom<=19);}
