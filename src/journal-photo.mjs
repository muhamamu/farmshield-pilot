export async function prepareJournalPhoto(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024||file.size===0)throw Error('Choose JPEG, PNG or WebP photos up to 10 MB each.');
 const url=URL.createObjectURL(file),image=new Image();
 try{
  await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('This photo could not be opened. Try another image.'));image.src=url;});
  if(image.naturalWidth*image.naturalHeight>40000000)throw Error('This photo is too large. Choose a smaller image.');
  const scale=Math.min(1,1600/Math.max(image.naturalWidth,image.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
  const context=canvas.getContext('2d');if(!context)throw Error('Your browser could not prepare the photo.');context.fillStyle='#ffffff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);
  // Re-encoding strips original EXIF/GPS metadata; original files are never uploaded.
  const photo=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.82));if(!photo||photo.size>2097152)throw Error('The prepared photo is too large. Choose a smaller image.');return photo;
 }finally{URL.revokeObjectURL(url);}
}
