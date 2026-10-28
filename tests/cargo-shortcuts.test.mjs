import test from 'node:test';
import assert from 'node:assert/strict';
import {cargoFor,cargoEffect} from '../dist/cargo.js';
import {archCross} from '../dist/shortcuts.js';
test('cargo assignments are stable and medical parcels are fragile',()=>{assert.equal(cargoFor(4,'parcels'),'heavy');assert.equal(cargoFor(5,'parcels'),'live');assert.equal(cargoFor(8,'urgent'),'fragile');assert.equal(cargoFor(8,'mail'),'standard');});
test('heavy penalties end when unloaded; fragile wear requires rough flight',()=>{const s={time:0,bank:0};assert.equal(cargoEffect('heavy',s,true).speed,.88);assert.equal(cargoEffect('heavy',s,false).climb,1);assert.equal(cargoEffect('fragile',s,true).wear,0);assert.ok(cargoEffect('fragile',{...s,stunt:{}},true).wear>0);assert.equal(cargoEffect('fragile',s,false,true).wear,0);});
test('live cargo shifts briefly, stays bounded and stops after unloading',()=>{for(let time=0;time<36;time+=.1){const t=cargoEffect('live',{time},true).turn;assert.ok(Math.abs(t)<=.18);if(time%12<9)assert.equal(t,0);assert.equal(cargoEffect('live',{time},false).turn,0);}});
test('arch crossing distinguishes clear center, rock and safe detour at speed',()=>{assert.equal(archCross({x:0,y:0,z:-20},{x:0,y:0,z:20}),'clear');assert.equal(archCross({x:7,y:0,z:-20},{x:7,y:0,z:20}),'hit');assert.equal(archCross({x:15,y:0,z:-20},{x:15,y:0,z:20}),null);assert.equal(archCross({x:0,y:0,z:4},{x:0,y:0,z:8}),null);});
