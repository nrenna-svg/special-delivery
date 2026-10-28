import test from 'node:test';import assert from 'node:assert/strict';
import {Vector3} from '../dist/vendor/three.core.js';
import {GROUND_ALT} from '../dist/takeoff.js';
import {RADIUS} from '../dist/flight.js';
import {GATE_Z,GATE_ALT,TOUCH_Z,STOP_Z,toRunway,runwayNormal,gateCrossing,gradeLanding,landingPath} from '../dist/landing.js';
import {padAt,newRoute,IMPACT_RADIUS} from '../dist/delivery.js';
import {musicEvents,LOOP_STEPS} from '../dist/audio.js';
import {celebrationPhase,CELEBRATION_TIME} from '../dist/celebrate.js';

test('runway coordinates round-trip',()=>{for(const [x,z] of [[0,0],[3,48],[-5,-20],[2,8]]){const r=toRunway(runwayNormal(x,z,new Vector3()));assert.ok(Math.abs(r.x-x)<1e-9&&Math.abs(r.z-z)<1e-9);}});
test('gate captures a centered approach heading down the runway and rejects the rest',()=>{
 const fwd=z=>{const a=z/(RADIUS+GROUND_ALT);return new Vector3(0,Math.sin(a),-Math.cos(a));};
 const a=runwayNormal(1,GATE_Z+1,new Vector3()),b=runwayNormal(1,GATE_Z-1,new Vector3());
 assert.equal(gateCrossing(a,b,GATE_ALT,fwd(GATE_Z)).inside,true);
 assert.equal(gateCrossing(a,b,GATE_ALT+8,fwd(GATE_Z)).inside,false);
 assert.equal(gateCrossing(runwayNormal(9,GATE_Z+1,new Vector3()),runwayNormal(9,GATE_Z-1,new Vector3()),GATE_ALT,fwd(GATE_Z)).inside,false);
 assert.equal(gateCrossing(b,a,GATE_ALT,fwd(GATE_Z).negate()),null);
});
test('landing grades reward slow, centered approaches',()=>{
 assert.equal(gradeLanding(16,.5).stars,3);assert.equal(gradeLanding(16,.5).bonus,200);
 assert.equal(gradeLanding(19,3).stars,2);assert.equal(gradeLanding(25,3).bouncy,true);
});
test('landing path glides down smoothly, touches down on the runway and stops',()=>{
 for(const [speed,bouncy] of [[10,false],[18,false],[26,true]]){
  const path=landingPath({x:3,z:GATE_Z,altitude:GATE_ALT,speed},bouncy);let prev=path.pose(0);
  assert.ok(Math.abs(prev.altitude-GATE_ALT)<1e-9);
  for(let t=1/120;t<path.done;t+=1/120){const p=path.pose(t);assert.ok(p.z<=prev.z+1e-9);if(!(bouncy&&p.phase==='roll'))assert.ok(Math.abs(p.altitude-prev.altitude)<.12,'jump at '+t);assert.ok(p.altitude>=GROUND_ALT-1e-9);prev=p;}
  const touch=path.pose(path.touchdown+1e-6);assert.ok(Math.abs(touch.z-TOUCH_Z)<.05&&Math.abs(touch.x)<1e-9&&touch.altitude<GROUND_ALT+.5);
  const end=path.pose(path.done);assert.equal(end.speed,0);assert.ok(Math.abs(end.z-STOP_Z)<1e-9);
 }
});
test('on-target check matches pads without changing the route',()=>{const r=newRoute();const s=r.stops[2];assert.equal(padAt(r,s.normal.clone().multiplyScalar(IMPACT_RADIUS)),s);assert.equal(padAt(r,new Vector3(0,-1,0)),null);assert.equal(r.delivered,0);s.done=true;assert.equal(padAt(r,s.normal.clone()),null);});
test('music loop has a chord and bass note every bar and notes in a pleasant range',()=>{let bass=0;for(let i=0;i<LOOP_STEPS;i++)for(const e of musicEvents(i)){if(e.voice==='bass'&&i%8===0)bass++;if(e.voice==='lead'){assert.ok(e.midi>=60&&e.midi<=90);assert.ok(e.steps>=1&&e.steps<=16);}}assert.equal(bass,LOOP_STEPS/8);assert.equal(musicEvents(0).filter(e=>e.voice==='pad').length,1);assert.ok(musicEvents(0).some(e=>e.voice==='lead'&&e.midi===74&&e.steps===4));assert.ok(musicEvents(11).some(e=>e.voice==='lead'&&e.midi===78));});
test('celebration timeline runs in order and ends',()=>{const order=['run','pick','lift','wave','leave'];let last=0;for(let t=0;t<=CELEBRATION_TIME;t+=.05){const i=order.indexOf(celebrationPhase(t).phase);assert.ok(i>=last);last=i;}assert.equal(celebrationPhase(CELEBRATION_TIME).u,1);});
