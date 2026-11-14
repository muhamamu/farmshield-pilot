import test from 'node:test';
import assert from 'node:assert/strict';
import Module from 'node:module';
import {fileURLToPath} from 'node:url';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {build} from 'esbuild';
test('Data tools renders its forecast and satellite panels without requiring account hooks',async()=>{
 const bundle=await build({entryPoints:[fileURLToPath(new URL('../src/RegionalData.jsx',import.meta.url))],bundle:true,write:false,platform:'node',format:'cjs',external:['react']});
 const fixture=new Module('regional-render');fixture.paths=Module._nodeModulePaths(process.cwd());fixture._compile(bundle.outputFiles[0].text,'regional-render.cjs');
 const html=renderToStaticMarkup(React.createElement(fixture.exports.RegionalData,{expanded:true}));
 assert.match(html,/7-day weather forecast/);assert.match(html,/Recent Sentinel-2 scenes/);assert.match(html,/Connect sources/);
});
