import React from 'react';
export function WeatherAttribution({provider}){
 return provider==='MET Norway'?<><a href="https://www.met.no/en" target="_blank" rel="noreferrer">MET Norway</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">CC BY 4.0</a> · Adapted into forecast summaries</>:<a href="https://open-meteo.com/" target="_blank" rel="noreferrer">Open-Meteo</a>;
}
