import {chooseSoil,farmCoordinate} from './soil-moisture.mjs';
export const CROPS=[
 {name:'Millet',drought:'Lower',source:'https://www.fao.org/4/t7202e/t7202e05.htm'},
 {name:'Sorghum',drought:'Lower',source:'https://www.fao.org/4/t7202e/t7202e05.htm'},
 {name:'Maize',drought:'Higher',source:'https://www.fao.org/4/S2022E/s2022e07.htm'},
 {name:'Groundnut',drought:'Moderate',source:'https://oar.icrisat.org/10832/1/562-ASHC-English-Groundnut-A4-bw-lowres.pdf'},
 {name:'Tomato',drought:'Higher',source:'https://www.fao.org/4/S2022E/s2022e07.htm'}
];
export function comparePlanting(plan,farm,now=Date.now()){
 const missing=[],blocks=[],limited=plan.water==='Limited irrigation',rainfed=plan.water==='Rainfed';
 const planting=Date.parse(plan.date+'T12:00:00+01:00');
 if(!Number.isFinite(planting))missing.push('Planned planting date');
 if(!plan.soilType||plan.soilType==='Unknown')missing.push('Soil type');
 if(!plan.drainage||plan.drainage==='Unknown')missing.push('Drainage condition');
 if(!plan.water||plan.water==='Unknown')missing.push('Water supply for the whole growing season');
 if(rainfed&&!plan.rainsEstablished)blocks.push('Confirm sustained seasonal rains and enough remaining growing season before sowing. One shower or a seven-day forecast is not enough.');
 if(plan.water==='Unavailable')blocks.push('Arrange a dependable water supply before planting any crop. Drought tolerance does not remove the need for water.');
 if(plan.drainage==='Poor')blocks.push('Resolve drainage or standing-water problems before choosing a crop for this field.');
 const soil=chooseSoil(farm,now),near=Number.isFinite(planting)&&planting-now<7*86400000&&planting-now>=-86400000;
 const forecast=farm.plantingWeather,point=farmCoordinate(farm),age=now-Date.parse(forecast?.fetchedAt);
 const freshForecast=forecast&&age>=0&&age<=6*3600000&&point&&Math.abs(point.lat-forecast.point?.lat)<.00001&&Math.abs(point.lon-forecast.point?.lon)<.00001;
 const startDays=freshForecast&&Number.isFinite(planting)?forecast.days.filter(day=>day.date>=plan.date&&day.date<new Date(planting+3*86400000).toISOString().slice(0,10)):[];
 let weatherContext='No current forecast for the planned establishment dates. Seasonal conditions remain unverified.';
 if(startDays.length===3&&startDays.every(day=>typeof day.rain==='number'&&Number.isFinite(day.rain))){const rain=startDays.reduce((sum,day)=>sum+day.rain,0);weatherContext=`Model forecast: ${rain.toFixed(1)} mm total rain across the first three planting dates. This is not a seasonal water budget.`;if(rainfed&&rain===0&&(soil.kind!=='manual'||soil.reading.method!=='Visual check'||soil.reading.condition==='Dry'))blocks.push('The first three planting dates have no forecast rain and moist root-zone conditions are not confirmed. Recheck the seedbed before rainfed sowing.');}
 if(near&&soil.kind==='manual'&&soil.reading.method==='Visual check'&&soil.reading.condition==='Waterlogged')blocks.push('Your recent field check reports waterlogging. Recheck the root zone and resolve drainage before planting.');
 const rows=CROPS.map(crop=>{
  const reasons=[],cautions=[];let fit='Possible option';
  if(blocks.length)fit='Wait / resolve conditions';else if(missing.length)fit='More information needed';
  else if(limited){if(crop.drought==='Lower'){fit='Consider first';reasons.push('Relatively less sensitive to drought than maize and many vegetables.')}else{fit='Higher water risk';cautions.push('Limited irrigation may not cover this crop through sensitive growth stages.')}}
  else reasons.push(rainfed?'Depends on established seasonal rains and the full growing season.':'Reliable irrigation makes this crop worth evaluating; check seasonal supply and delivery capacity.');
  if(crop.name==='Groundnut'){
   if(['Sandy','Loamy'].includes(plan.soilType))reasons.push('Loose, well-drained sandy soils are preferred; confirm the actual texture and compaction.');
   if(plan.soilType==='Clay'){cautions.push('Heavy or compacted clay makes groundnut a less favourable option; verify drainage and harvest conditions.');if(!blocks.length&&!missing.length)fit='Soil suitability check needed'}
   if(rainfed&&Number.isFinite(planting)&&![5,6].includes(new Date(planting).getUTCMonth()))cautions.push('Nigeria guidance gives late June to early July for Sudan Savanna groundnut. Confirm a local, variety-specific planting window.');
  }
  if(crop.name==='Maize'&&rainfed&&Number.isFinite(planting)&&new Date(planting).getUTCMonth()!==6)cautions.push('IITA guidance places Sudan Savanna maize sowing in early July. Confirm current rainfall onset and the variety with local extension.');
  if(crop.name==='Tomato')cautions.push('Needs dependable water management; check variety, heat at flowering, disease pressure and market access.');
  if(plan.soilType==='Sandy'&&crop.drought!=='Lower')cautions.push('Verify water-holding capacity and irrigation management on this sandy field.');
  return {...crop,fit,reasons,cautions};
 });
 const preferred=rows.find(row=>row.name.toLowerCase()===plan.desired?.trim().toLowerCase());
 const candidates=rows.filter(row=>row.fit==='Consider first');
 const headline=blocks.length?'Check these conditions before planting':missing.length?'Complete the field details first':candidates.length?'Millet and sorghum are the first options to investigate':'Several crops may fit — compare the trade-offs';
 return {headline,rows,preferred,candidates,blocks,missing,weatherContext,soilContext:soil.kind==='missing'?'No recent usable soil reading.':near?'Recent soil information is available for an establishment check.':'Current soil moisture cannot predict conditions on the planned planting date.',limitations:['Seasonal rainfall and irrigation capacity are not verified.','Soil pH, nutrients, salinity, crop rotation, pests, seed variety and market prices have not been assessed.','This is a rule-based shortlist for local review, not a yield or profit prediction.']};
}
