export const CONSENT_KEY='farmshield.cookie-choice.v1';
export const MAP_VIEW_KEY='farmshield.nigeria-map.v1';
const MAX_AGE=180*24*60*60*1000;
export function readConsent(storage,now=Date.now()){
 try{const value=JSON.parse(storage.getItem(CONSENT_KEY));return value?.version===1&&typeof value.preferences==='boolean'&&Number.isFinite(value.savedAt)&&value.savedAt<=now&&now-value.savedAt<MAX_AGE?value:null;}catch{return null;}
}
export function saveConsent(storage,preferences,now=Date.now()){
 const value={version:1,preferences:Boolean(preferences),savedAt:now};
 // Remove optional data before storing a rejection, including an expired choice.
 if(!value.preferences)storage.removeItem(MAP_VIEW_KEY);
 storage.setItem(CONSENT_KEY,JSON.stringify(value));return value;
}
export function mayRememberMap(){try{return readConsent(localStorage)?.preferences===true;}catch{return false;}}
