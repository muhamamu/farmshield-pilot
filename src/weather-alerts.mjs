import {validDate,todayWAT} from './farm-activity.mjs';
export function weatherAlerts(forecast,now=Date.now()){
 const fetched=Date.parse(forecast?.fetchedAt),generated=forecast?.generatedAt?Date.parse(forecast.generatedAt):fetched;
 if(!Number.isFinite(fetched)||!Number.isFinite(generated)||now-fetched>2*3600000||now-generated>24*3600000||fetched>now+300000||generated>now+300000)return {status:'stale',alerts:[]};
 if(!Array.isArray(forecast.days)||!forecast.days.length)return {status:'missing',alerts:[]};
 const days=forecast.days.filter(day=>validDate(day.date)&&day.date>=todayWAT(now)).sort((a,b)=>a.date.localeCompare(b.date));
 if(!days.length)return {status:'missing',alerts:[]};
 if(new Set(days.map(day=>day.date)).size!==days.length)return {status:'missing',alerts:[]};
 const alerts=[];
 for(const day of days){
  if(Number.isFinite(day.maxTemperatureC)&&day.maxTemperatureC>=35)alerts.push({key:'heat:'+day.date,date:day.date,type:'Heat signal',title:'Forecast temperatures reach 35 °C or higher',detail:day.maxTemperatureC+' °C in the forecast range. Check local conditions and plan field work with shade and drinking water available.',task:'Check field conditions during forecast heat'});
  if(Number.isFinite(day.precipitationMm)&&day.precipitationMm>=25)alerts.push({key:'rain:'+day.date,date:day.date,type:'Heavy-rain signal',title:'Forecast rain reaches 25 mm in a day',detail:day.precipitationMm+' mm over the stated forecast period. Check drainage and exposed inputs; this is not an official flood warning.',task:'Check drainage before forecast heavy rain'});
 }
 for(let i=0;i<=days.length-3;i++){const run=days.slice(i,i+3);if(run.every(day=>day.precipitationMm===0)&&run.every((day,index)=>!index||Date.parse(day.date)-Date.parse(run[index-1].date)===86400000)){alerts.push({key:'dry:'+run[0].date,date:run[0].date,type:'Dry-spell signal',title:'Three forecast days have no rain',detail:run[0].date+' to '+run[2].date+'. Check actual root-zone moisture. Forecast rainfall alone does not determine irrigation needs.',task:'Check soil moisture during forecast dry spell'});i+=2;}}
 return {status:'ready',alerts,provider:forecast.provider,fetchedAt:forecast.fetchedAt};
}
