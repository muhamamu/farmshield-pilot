import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
test('Farm activity renders sign-in, no-farm and saved-farm screens',async()=>{
 const result=await build({entryPoints:['src/FarmActivity.jsx'],bundle:true,write:false,platform:'node',format:'esm',packages:'external',define:{'import.meta.env':'{}'}});
 const dir=await mkdtemp(join(process.cwd(),'.activity-render-'));
 try{const file=join(dir,'component.mjs');await writeFile(file,result.outputFiles[0].text);const {FarmActivity}=await import(pathToFileURL(file));const render=props=>renderToStaticMarkup(React.createElement(FarmActivity,props));
 assert.match(render({}),/Sign in/);assert.match(render({owner:'owner'}),/Go to My farms/);
 const html=render({owner:'11111111-1111-4111-8111-111111111111',farms:[{id:'22222222-2222-4222-8222-222222222222',name:'Real user farm'}]});
 for(const text of ['Real user farm','Journal','Tasks','Weather alerts','Field notes','Save journal entry','Photos','PRIVATE FARM RECORDS'])assert.ok(html.includes(text),text);
 assert.ok(!html.includes('sample farm'));
 }finally{await rm(dir,{recursive:true,force:true});}
});
