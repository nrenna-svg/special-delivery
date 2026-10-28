import test from 'node:test';import assert from 'node:assert/strict';
import {Vector3} from '../dist/vendor/three.core.js';
import {RADIUS} from '../dist/flight.js';
import {DAYS,ISLANDS,dayStops,islandNormal,loadProgress,saveResult} from '../dist/days.js';
import {newRoute,resolveDelivery,IMPACT_RADIUS} from '../dist/delivery.js';
const arc=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.dot(b))))*RADIUS;

test('every stop sits well inside its island and pads do not overlap',()=>{
 DAYS.forEach((d,i)=>{const stops=dayStops(i);assert.ok(stops.length>=5&&stops.length<=7);
  for(const s of stops.filter(s=>!s.motion)){const isl=ISLANDS.find(x=>x.label===s.island);const from=arc(s.normal,islandNormal(s.island));assert.ok(from<isl.size*.87-9||s.island==="KESTREL ISLAND",`${s.name} is ${from.toFixed(1)} from ${s.island} center`);}
  for(let a=0;a<stops.length;a++)for(let b=a+1;b<stops.length;b++)assert.ok(arc(stops[a].normal,stops[b].normal)>18,`${stops[a].name} too close to ${stops[b].name}`);
  for(const s of stops)assert.ok(arc(s.normal,new Vector3(0,1,0))>14||s.island!=='KESTREL ISLAND',`${s.name} on the runway`);
 });
});
test('day 1 keeps the original Kestrel stops and routes resolve for every day',()=>{
 assert.deepEqual(dayStops(0).map(s=>s.name),newRoute().stops.map(s=>s.name));
 DAYS.forEach((d,i)=>{const r=newRoute(dayStops(i));for(const s of r.stops)assert.ok(resolveDelivery(r,s.normal.clone().multiplyScalar(IMPACT_RADIUS)));assert.equal(r.complete,true);assert.equal(r.delivered,r.stops.length);});
});
test('progress unlocks the next day and keeps the best score',()=>{const store={};globalThis.localStorage={getItem:k=>store[k]??null,setItem:(k,v)=>{store[k]=v;}};
 let p=loadProgress();assert.equal(p.unlocked,1);saveResult(p,0,900);saveResult(p,0,700);p=loadProgress();assert.equal(p.unlocked,2);assert.equal(p.best[0],900);
 saveResult(p,4,2000);assert.equal(loadProgress().unlocked,DAYS.length);delete globalThis.localStorage;});
