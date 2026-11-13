import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {REGIONS,BOUNDARY_SOURCE} from '../shared/nigeria-regions.mjs';
const date=process.argv[2]||new Date(Date.now()-86400000).toISOString().slice(0,10);
if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw Error('Use a YYYY-MM-DD date.');
const root=fileURLToPath(new URL('../data/nasa/',import.meta.url)),folder=join(root,date);
await mkdir(folder,{recursive:true});
const origin=`http://127.0.0.1:${Number(process.env.API_PORT||4180)}`;
const results=[];let next=0;
async function worker(){while(next<REGIONS.length){const region=REGIONS[next++];try{
 const response=await fetch(`${origin}/api/nasa-imagery?location=${region.id}&date=${date}`,{signal:AbortSignal.timeout(30000)});
 const metadata=await response.json();if(!response.ok)throw Error(metadata.error?.message||'Imagery metadata unavailable');
 if(!metadata.imageUrl?.startsWith('/api/nasa-image?'))throw Error('Unexpected image route');
 const image=await fetch(origin+metadata.imageUrl,{signal:AbortSignal.timeout(30000)});if(!image.ok||!image.headers.get('content-type')?.includes('image/png'))throw Error('Image unavailable');
 const bytes=new Uint8Array(await image.arrayBuffer());const filename=region.id+'.png';await writeFile(join(folder,filename),bytes);await writeFile(join(folder,region.id+'.json'),JSON.stringify(metadata,null,2)+'\n');
 results.push({id:region.id,name:region.name,type:region.type,status:'downloaded',filename,bytes:bytes.length,metadata});
 console.log(JSON.stringify({region:region.name,status:'downloaded',completed:results.length,total:REGIONS.length}));
 }catch(error){results.push({id:region.id,name:region.name,type:region.type,status:'error',error:error.message});console.log(JSON.stringify({region:region.name,status:'error',error:error.message}));}}}
await Promise.all([worker(),worker(),worker()]);
results.sort((a,b)=>a.id.localeCompare(b.id));
const downloaded=results.filter(r=>r.status==='downloaded').length;
const manifest={requestedDate:date,retrievedAt:new Date().toISOString(),provider:'NASA GIBS',boundarySource:BOUNDARY_SOURCE,total:REGIONS.length,downloaded,failed:REGIONS.length-downloaded,coverage:'36 states + FCT, 6 zones, country overview',limitations:'Dated regional bounding-box browse images. Clouds, haze, sensor artefacts and no-data areas may obscure the ground. No crop-health, temperature or yield estimates.',regions:results};
await writeFile(join(folder,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
console.log(JSON.stringify({folder,total:manifest.total,downloaded,failed:manifest.failed}));
if(manifest.failed)process.exitCode=1;
