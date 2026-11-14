import test from 'node:test';
import assert from 'node:assert/strict';
import {isNigeriaPoint,validNigeriaView,NIGERIA_HOME,NIGERIA_VIEW_KEY} from '../src/nigeria-map.mjs';
test('national map bounds include towns across Nigeria',()=>{for(const [lat,lon] of [[6.52,3.38],[12,8.5],[9.07,7.4],[6.45,7.5],[11.83,13.15],[13.06,5.24]])assert.ok(isNigeriaPoint(lat,lon));assert.ok(isNigeriaPoint(NIGERIA_HOME.lat,NIGERIA_HOME.lon));});
test('saved camera validates coordinates and national zoom range',()=>{assert.ok(validNigeriaView({...NIGERIA_HOME,zoom:5}));for(const value of [null,{lat:50,lon:3,zoom:9},{...NIGERIA_HOME,zoom:4},{...NIGERIA_HOME,zoom:20},{lat:'9',lon:7,zoom:9}])assert.equal(validNigeriaView(value),false);assert.match(NIGERIA_VIEW_KEY,/nigeria/);});
