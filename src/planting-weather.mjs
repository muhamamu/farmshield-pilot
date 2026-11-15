export function plantingForecast(data,point){
 if(!Array.isArray(data?.days)||data.days.length!==7||!Number.isFinite(Date.parse(data.fetchedAt)))throw Error('Unexpected weather data.');
 return {provider:data.provider,periodLabel:data.periodLabel||null,temperatureBasis:data.temperatureBasis||'daily',fetchedAt:data.fetchedAt,point:{lat:point.lat,lon:point.lon},days:data.days.map(day=>({date:day.date,heat:typeof day.maxTemperatureC==='number'&&Number.isFinite(day.maxTemperatureC)?day.maxTemperatureC:null,rain:typeof day.precipitationMm==='number'&&Number.isFinite(day.precipitationMm)?day.precipitationMm:null}))};
}
