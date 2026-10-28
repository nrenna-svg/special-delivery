import test from 'node:test';import assert from 'node:assert/strict';
import {Vector3} from '../dist/vendor/three.core.js';
import {RADIUS,newFlight,verticalSpeed,SLOW_SPEED} from '../dist/flight.js';
import {TIERS,ISLAND_TIER,JOB_ISLANDS,SITES,makeJob,jobRoute,jobBoard,objectivePay,settle,islandDistance} from '../dist/career.js';
import {rolloutPose,ROLLOUT_TIME,PHASES,GROUND_ALT,CRUISE_ALT,CRUISE_SPEED,HANDOFF_Z,applyRunwayPose,toRunway,runwayNormal,onRunway,gradeTouchdown,airfieldClear,RUNWAY_HALF,HANGAR} from '../dist/airfield.js';
import {landAt,terrainCheck} from '../dist/hazards.js';
import {newRoute,resolveDelivery,IMPACT_RADIUS,predictDrop} from '../dist/delivery.js';
import {boatNormal} from '../dist/challenges.js';

test('the planet grew 35% again',()=>assert.equal(RADIUS,270));
test('every job island has a tier, and harder tiers are farther from home on average',()=>{
 for(const l of JOB_ISLANDS)assert.ok(ISLAND_TIER[l]>=0&&ISLAND_TIER[l]<=3);
 const avg=t=>{const d=JOB_ISLANDS.filter(l=>ISLAND_TIER[l]===t).map(islandDistance);return d.reduce((a,b)=>a+b,0)/d.length;};
 assert.ok(avg(0)<avg(1)&&avg(1)<avg(2)&&avg(2)<avg(3));});
test('delivery sites sit on land, at least four per island, spread apart',()=>{for(const [l,sites] of Object.entries(SITES)){assert.ok(sites.length>=4,l);
 for(const s of sites){const a=landAt(s.normal);assert.equal(a?.island,l);assert.ok(a.r<.6);}}});
test('every job type builds a playable route on every island',()=>{for(const island of JOB_ISLANDS)for(const type of ['parcels','crate','mail','urgent','boat']){
 const j=makeJob(11,{type,island}),r=jobRoute(j);assert.ok(j.pay>0&&j.units>0);
 if(j.type==='mail')assert.ok(r.features.mail.length===j.units);
 if(j.type==='crate'){assert.equal(r.features.crates.length,1);assert.equal(r.stops[0].kind,'crate');}
 if(j.type==='boat'){const b=r.stops.find(s=>s.motion);for(let t=0;t<90;t+=3)assert.equal(landAt(boatNormal(b.motion,t)),null,`${island} boat aground`);}
 if(j.tier>=2)assert.ok(r.features.storms.length>=1);}});
test('harder islands pay more for the same job',()=>{const pay=l=>makeJob(3,{type:'urgent',island:l}).pay;assert.ok(pay('SUNSET ARCHIPELAGO')>pay('CORAL KEYS'));assert.ok(pay('CORAL KEYS')>pay('THE HOMEWARD ISLES'));});
test('the board offers four different jobs, at least one calm and at most one deadly',()=>{for(let s=1;s<40;s++){const b=jobBoard(s);assert.equal(b.length,4);assert.ok(b.some(j=>j.tier===0));assert.ok(b.filter(j=>j.tier===3).length<=1);}});
test('pay: accuracy and condition matter, the ledger adds bonuses and repairs',()=>{const j=makeJob(5,{type:'parcels',island:'EASTERN WILDS'});
 assert.ok(objectivePay(j,{accuracy:100,condition:100})>objectivePay(j,{accuracy:20,condition:60}));
 const full=settle(j,{earned:j.pay,done:j.units,crashes:1,landing:{label:'GREASED IT',bonus:.6}});
 assert.ok(full.lines.some(l=>l.label.includes('complete')));assert.ok(full.lines.some(l=>l.amount===-TIERS[j.tier].repair));
 assert.ok(full.total>settle(j,{earned:j.pay,done:j.units,crashes:1,landing:null}).total);});
test('crates only land on crate pads, parcels only on parcel pads',()=>{const j=makeJob(9,{type:'crate',island:'WESTERN REACH'}),r=newRoute(jobRoute(j).stops);
 const at=r.stops[0].normal.clone().multiplyScalar(IMPACT_RADIUS);assert.equal(resolveDelivery(r,at,{broken:false}),null);assert.equal(resolveDelivery(r,at,{broken:false,kind:'crate'}).id,0);});
test('rollout: doors open, taxi out of the hangar onto the runway, take off and climb to cruise',()=>{
 const a=rolloutPose(0);assert.equal(a.speed,0);assert.equal(a.doors,0);assert.equal(rolloutPose(PHASES.doors).doors,1);
 let prev=a;for(let t=0;t<=ROLLOUT_TIME;t+=.05){const p=rolloutPose(t);assert.ok(Math.hypot(p.x-prev.x,p.z-prev.z)<1.6,`jump at ${t}`);if(!p.airborne)assert.equal(p.altitude,GROUND_ALT);prev=p;}
 const e=rolloutPose(ROLLOUT_TIME);assert.ok(Math.abs(e.altitude-CRUISE_ALT)<1e-6&&Math.abs(e.speed-CRUISE_SPEED)<1e-6&&Math.abs(e.z-HANDOFF_Z)<1e-6);
 for(let t=PHASES.taxi;t<PHASES.roll;t+=.1){const p=rolloutPose(t);assert.ok(onRunway(p.x,p.z));}});
test('runway frame round-trips and applied poses face the right way',()=>{const n=runwayNormal(3,-20);const r=toRunway(n);assert.ok(Math.abs(r.x-3)<1e-9&&Math.abs(r.z+20)<1e-9);
 const s=applyRunwayPose(newFlight(),{x:0,z:10,h:0,altitude:GROUND_ALT,speed:5,pitch:0});const ahead=s.normal.clone().addScaledVector(s.forward,.01).normalize();assert.ok(toRunway(ahead).z<10);
 const w=applyRunwayPose(newFlight(),{x:10,z:10,h:-Math.PI/2,altitude:GROUND_ALT,speed:5,pitch:0});assert.ok(toRunway(w.normal.clone().addScaledVector(w.forward,.01).normalize()).x<10);});
test('the runway, apron and hangar are on the home island and clear of terrain crashes',()=>{for(let z=-RUNWAY_HALF;z<=RUNWAY_HALF;z+=3){const n=runwayNormal(0,z);assert.equal(landAt(n)?.island,'KESTREL ISLAND');assert.equal(terrainCheck(n,GROUND_ALT).crash,false);assert.ok(airfieldClear(n));}
 assert.equal(landAt(runwayNormal(HANGAR.x,HANGAR.z))?.island,'KESTREL ISLAND');});
test('manual landings: gentle and slow greases it, hard or crooked crashes',()=>{
 assert.equal(gradeTouchdown({sink:.5,speed:12,bank:0,x:0,along:1}).stars,3);assert.ok(gradeTouchdown({sink:.5,speed:12,bank:0,x:0,along:1}).centered);
 assert.equal(gradeTouchdown({sink:1.5,speed:20,bank:0,x:2,along:1}).stars,2);
 assert.equal(gradeTouchdown({sink:3.5,speed:12,bank:0,x:0,along:1}).ok,false);assert.equal(gradeTouchdown({sink:.5,speed:30,bank:0,x:0,along:1}).ok,false);
 assert.equal(gradeTouchdown({sink:.5,speed:12,bank:.6,x:0,along:1}).ok,false);assert.equal(gradeTouchdown({sink:.5,speed:12,bank:0,x:0,along:.5}).ok,false);});
test('throttle back below cruise and the plane settles gently',()=>{const s=newFlight();s.pitch=0;s.speed=SLOW_SPEED+2;assert.equal(verticalSpeed(s),0);s.speed=10;const v=-verticalSpeed(s);assert.ok(v>.3&&v<.9);});
test('crates hang low, so their chute opens at once and they survive a low release',()=>{const s=newFlight();s.altitude=6;s.speed=18;assert.equal(predictDrop(s,null,0,{chuteDelay:.1}).broken,false);assert.equal(predictDrop(s).broken,true);});
