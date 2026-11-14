export function registrationDetails(data,selectedPin){
 const name=String(data.get('farmName')||'').trim(),crop=String(data.get('crop')||'').trim(),size=Number(data.get('size'));
 const point=data.get('usePin')&&selectedPin&&Number.isFinite(selectedPin.lat)&&Number.isFinite(selectedPin.lon)?selectedPin:null;
 const place=String(data.get('location')||'').trim();
 if(!name||!crop||!Number.isFinite(size)||size<=0)throw new Error('Add a farm name, crop and an area greater than zero.');
 if(!place&&!point)throw new Error('Enter a village or area, or use a selected map pin.');
 return {name,crop,size,location:place||(point?'Pinned map location':''),point};
}
