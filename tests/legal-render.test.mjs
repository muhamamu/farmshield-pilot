import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';
import {fileURLToPath} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {build} from 'esbuild';
test('all policies render with navigation and the initial banner offers equal accept and reject choices',async()=>{
 const bundle=await build({entryPoints:[fileURLToPath(new URL('../src/CookieConsent.jsx',import.meta.url)),fileURLToPath(new URL('../src/LegalPage.jsx',import.meta.url))],bundle:true,write:false,outdir:'out',platform:'node',format:'cjs',external:['react'],define:{'import.meta.env':'{}'}});
 const modules=bundle.outputFiles.map(output=>{const m=new Module(output.path);m.paths=Module._nodeModulePaths(process.cwd());m._compile(output.text,output.path);return m.exports;});
 const legal=modules.find(m=>m.LegalPage),consent=modules.find(m=>m.LegalControls);
 for(const [path,title] of Object.entries(legal.POLICY_ROUTES)){const html=renderToStaticMarkup(React.createElement(legal.LegalPage,{path,navigate(){}}));assert.ok(html.includes(title));assert.match(html,/Contact FarmShield/);assert.match(html,/aria-current="page"/);}
 const banner=renderToStaticMarkup(React.createElement(consent.LegalControls,{navigate(){}}));for(const text of ['Reject optional','Accept all','Choose preferences','Cookie settings','Always active'])assert.ok(banner.includes(text));assert.doesNotMatch(banner,/type="checkbox" checked/);
});
