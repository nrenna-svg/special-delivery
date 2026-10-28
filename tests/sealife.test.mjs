import test from 'node:test';import assert from 'node:assert/strict';
import {Vector3} from '../dist/vendor/three.core.js';
import {RADIUS} from '../dist/flight.js';
import {SHIPS,STACKS,SPOUTS,shipMotion,spoutNormal,seaObstacles,spoutPull,SPOUT_CORE,SPOUT_PULL} from '../dist/sealife.js';
import {boatNormal,offsetNormal} from '../dist/challenges.js';
import {ISLANDS,dayStops,dayFeatures,islandNormal} from '../dist/days.js';
import {runwayNormal} from '../dist/landing.js';
const arc=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.dot(b))))*RADIUS;
const landGap=n=>Math.min(...ISLANDS.map(i=>arc(n,islandNormal(i.label))-i.size*1.12));
const protectedSpots=()=>{const p=[];for(let d=0;d<5;d++){for(const s of dayStops(d))p.push({n:s.motion?s.motion.center:s.normal,r:s.motion?s.motion.radius+8:10});const f=dayFeatures(d);for(const h of f.fuel)p.push({n:h.normal,r:9});for(const m of f.mail)p.push({n:m.normal,r:8});}for(let z=-20;z<=110;z+=6)p.push({n:runwayNormal(0,z,new Vector3()),r:12});return p;};

test('ships sail on open water for their whole loop',()=>{for(const s of SHIPS){const m=shipMotion(s);for(let t=0;t<s.period;t+=1)assert.ok(landGap(boatNormal(m,t))>4,`${s.type} runs aground`);}});
test('sea stacks and waterspouts keep clear of pads, fuel hoops, mail masts and the landing approach',()=>{const p=protectedSpots();
 for(const st of STACKS){const n=new Vector3(...st.normal).normalize();assert.ok(landGap(n)>1);for(const q of p)assert.ok(arc(n,q.n)>q.r,'stack too close');}
 SPOUTS.forEach((_,i)=>{for(let t=0;t<120;t+=2){const n=spoutNormal(i,t);assert.ok(landGap(n)>4,'spout on land');for(const q of p)assert.ok(arc(n,q.n)>q.r+SPOUT_PULL-6,'spout too close');}});});
test('obstacles include ships and stacks always, spouts only when switched on',()=>{const a=seaObstacles(0,false),b=seaObstacles(0,true);assert.equal(a.length,SHIPS.length+STACKS.length);assert.equal(b.length,a.length+SPOUTS.length);
 const c=spoutNormal(0,10);assert.equal(spoutPull(c,10),1);assert.equal(spoutPull(offsetNormal(c,SPOUT_PULL+1,0),10),0);});
