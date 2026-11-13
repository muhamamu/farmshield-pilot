import boundaries from './nigeria-boundaries.json' with {type:'json'};
export const ZONES=[
 {id:'north-central',name:'North Central',states:['Benue','Abuja Federal Capital Territory','Kogi','Kwara','Nasarawa','Niger','Plateau']},
 {id:'north-east',name:'North East',states:['Adamawa','Bauchi','Borno','Gombe','Taraba','Yobe']},
 {id:'north-west',name:'North West',states:['Jigawa','Kaduna','Kano','Katsina','Kebbi','Sokoto','Zamfara']},
 {id:'south-east',name:'South East',states:['Abia','Anambra','Ebonyi','Enugu','Imo']},
 {id:'south-south',name:'South South',states:['Akwa Ibom','Bayelsa','Cross River','Delta','Edo','Rivers']},
 {id:'south-west',name:'South West',states:['Ekiti','Lagos','Ogun','Ondo','Osun','Oyo']},
];
const slug=name=>name==='Abuja Federal Capital Territory'?'fct':name.toLowerCase().replaceAll(' ','-');
function combine(boxes){return [Math.min(...boxes.map(b=>b[0])),Math.min(...boxes.map(b=>b[1])),Math.max(...boxes.map(b=>b[2])),Math.max(...boxes.map(b=>b[3]))];}
function region(id,name,type,bbox,extra={}){return {id,name,type,bbox,latitude:(bbox[1]+bbox[3])/2,longitude:(bbox[0]+bbox[2])/2,...extra};}
export const STATE_REGIONS=boundaries.states.map(state=>{
 const zone=ZONES.find(zone=>zone.states.includes(state.name));
 if(!zone)throw Error('State is missing a geopolitical zone: '+state.name);
 return region('state-'+slug(state.name),state.name==='Abuja Federal Capital Territory'?'FCT Abuja':state.name,'state',state.bbox,{zone:zone.id});
});
export const ZONE_REGIONS=ZONES.map(zone=>region('zone-'+zone.id,zone.name,'zone',combine(STATE_REGIONS.filter(state=>state.zone===zone.id).map(state=>state.bbox)),{zone:zone.id}));
export const NATIONAL_REGION=region('nigeria','All Nigeria','country',combine(STATE_REGIONS.map(state=>state.bbox)));
export const REGIONS=[NATIONAL_REGION,...ZONE_REGIONS,...STATE_REGIONS];
export const NASA_REGIONS=Object.fromEntries(REGIONS.map(region=>[region.id,region]));
export const BOUNDARY_SOURCE={url:boundaries.source,downloadUrl:boundaries.downloadUrl,boundaryID:boundaries.boundaryID,yearRepresented:boundaries.yearRepresented,license:boundaries.license,attribution:boundaries.attribution};
