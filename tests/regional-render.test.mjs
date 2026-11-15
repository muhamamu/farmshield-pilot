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
 assert.match(html,/Conditions &amp; imagery/);assert.match(html,/Start with a location/);assert.doesNotMatch(html,/Connect sources|Kano/);
 const farmHtml=renderToStaticMarkup(React.createElement(fixture.exports.RegionalData,{expanded:true,farms:[{id:'lagos',name:'My Lagos farm',location:'Lagos',point:{lat:6.52,lon:3.38}}]}));
 assert.match(farmHtml,/My Lagos farm/);assert.match(farmHtml,/6.52000/);assert.match(farmHtml,/7-day weather forecast/);assert.match(farmHtml,/Satellite image records/);assert.doesNotMatch(farmHtml,/Kano/);
 const pinHtml=renderToStaticMarkup(React.createElement(fixture.exports.RegionalData,{mapPoint:{lat:9.07,lon:7.4}}));assert.match(pinHtml,/Map pin/);assert.match(pinHtml,/9.07000/);
});
