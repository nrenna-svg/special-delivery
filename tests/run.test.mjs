import test from 'node:test';import assert from 'node:assert/strict';
import {Vector3} from '../dist/vendor/three.core.js';
import {RADIUS} from '../dist/flight.js';
import {planDay,quotaFor,unlockedIslands,clockText,fuelHoopsFor,TANK_SECONDS} from '../dist/run.js';
import {newRoute,resolveDelivery,IMPACT_RADIUS} from '../dist/delivery.js';
import {terrainCheck} from '../dist/hazards.js';
const arc=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.dot(b))))*RADIUS;

test('day 1 is a gentle couple of parcels on Kestrel with calm skies',()=>{for(const seed of [1,2,3,99]){const p=planDay(1,seed);assert.equal(p.quota,2);assert.ok(p.stops.every(s=>s.island==='KESTREL ISLAND'));
 const f=p.features;assert.equal(f.wind,null);assert.equal(f.flocks.length+f.storms.length+f.mail.length,0);assert.equal(f.spouts,false);assert.ok(p.stops.every(s=>!s.urgent&&!s.motion));assert.ok(f.rings.length>0);}});
test('each day adds parcels and hazards on schedule, and fuel hoops thin out',()=>{const p=d=>planDay(d,7);
 for(let d=1;d<10;d++){assert.ok(quotaFor(d+1)>=quotaFor(d));assert.ok(fuelHoopsFor(d+1)<=fuelHoopsFor(d));}
 assert.equal(fuelHoopsFor(1),6);assert.equal(fuelHoopsFor(7),1);assert.equal(fuelHoopsFor(20),1);
 assert.ok(p(2).features.wind);assert.ok(p(3).stops.some(s=>s.urgent));assert.ok(p(3).features.flocks.length>0);
 assert.ok(p(4).stops.some(s=>s.motion));assert.ok(p(4).features.spouts);assert.ok(p(5).features.mail.length>0);
 assert.ok(p(9).features.wind.speed>p(3).features.wind.speed);assert.ok(unlockedIslands(6).length>unlockedIslands(2).length);});
test('plans are valid across many runs: unique, separated, reachable, fuel is possible, and the clock allows it',()=>{
 for(let seed=1;seed<=25;seed++)for(let d=1;d<=12;d++){const p=planDay(d,seed);const names=p.stops.map(s=>s.name);assert.equal(new Set(names).size,names.length);assert.equal(p.quota,quotaFor(d));
  for(let a=0;a<p.stops.length;a++)for(let b=a+1;b<p.stops.length;b++)assert.ok(arc(p.stops[a].normal,p.stops[b].normal)>18,`overlap d${d} s${seed}`);
  assert.ok(p.dayLength>=150&&p.dayLength>=p.estimate*1.3,`tight d${d} s${seed} ${p.dayLength} vs ${p.estimate}`);
  for(const s of p.stops)if(!s.motion)assert.equal(terrainCheck(s.normal,19).crash,false);
  for(const s of p.stops)if(s.urgent)assert.ok(s.urgent.seconds<p.dayLength);
  assert.equal(p.features.fuel.length,fuelHoopsFor(d));
  if(p.estimate>TANK_SECONDS*.8){const near=Math.min(...p.features.fuel.map(h=>Math.min(...p.stops.map(s=>arc(s.normal,h.normal)))));assert.ok(near<120,`no fuel near route d${d} s${seed}`);}
  const r=newRoute(p.stops);for(const s of r.stops)assert.ok(resolveDelivery(r,s.normal.clone().multiplyScalar(IMPACT_RADIUS)));assert.equal(r.complete,true);}});
test('same seed gives the same day, different seeds differ, and the clock runs 6 AM to 10 PM',()=>{assert.deepEqual(planDay(4,11).stops.map(s=>s.name),planDay(4,11).stops.map(s=>s.name));
 const variety=new Set();for(let s=1;s<=10;s++)variety.add(planDay(5,s).stops.map(x=>x.name).join());assert.ok(variety.size>5);
 assert.equal(clockText(0,300),'6:00 AM');assert.equal(clockText(150,300),'2:00 PM');assert.equal(clockText(300,300),'10:00 PM');});
test('later days can be planned from anywhere the plane happens to be',()=>{const r=(()=>{let a=5;return ()=>{a=(a*1664525+1013904223)>>>0;return a/4294967296;};})();
 for(let k=0;k<60;k++){const from=new Vector3(r()*2-1,r()*2-1,r()*2-1).normalize(),d=2+k%9,p=planDay(d,k+1,from),noMail=p.features.mail.length===0;
  assert.equal(p.quota,quotaFor(d));assert.ok(p.dayLength>=p.estimate*1.3);assert.ok(p.features.fuel.length>=1);
  const first=Math.min(...p.stops.map(s=>arc(s.normal,from)));const firstLeg=arc(from,p.stops[0].normal);if(noMail)assert.ok(Math.abs(firstLeg-first)<1e-6,'starts with the nearest stop');}});
