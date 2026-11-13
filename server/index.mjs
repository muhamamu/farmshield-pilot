import {createServer} from 'node:http';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createApi,createDataService} from './providers.mjs';
import {createNasaService} from './nasa.mjs';

export function startApi({port=Number(process.env.API_PORT||4180)}={}){
  const envFile=fileURLToPath(new URL('../.env',import.meta.url));
  if(existsSync(envFile))process.loadEnvFile(envFile);
  const handle=createApi(createDataService({apiKey:process.env.OPEN_METEO_API_KEY||'',mode:process.env.WEATHER_ACCESS_MODE||'evaluation',production:process.env.NODE_ENV==='production'}),createNasaService());
  const server=createServer(async(req,res)=>{
    try{
      const request=new Request(new URL(req.url,'http://127.0.0.1'),{method:req.method});
      const response=await handle(request);
      res.writeHead(response.status,Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
    }catch{
      res.writeHead(500,{'content-type':'application/json'});
      res.end(JSON.stringify({error:{code:'INTERNAL_ERROR',message:'Request could not be completed.'}}));
    }
  });
  server.requestTimeout=20000;
  return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>resolve(server));});
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  startApi().then(server=>console.log(`FarmShield API listening on http://127.0.0.1:${server.address().port}`)).catch(()=>{console.error('Cannot start API. Check whether API_PORT is already in use.');process.exitCode=1;});
}
