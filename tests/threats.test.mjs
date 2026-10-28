import test from 'node:test';import assert from 'node:assert/strict';
import {Vector3} from '../dist/vendor/three.core.js';
import {radarSees,newMissile,stepMissile,flareDecoys,canDodge,RADAR_RANGE,RADAR_FLOOR,MISSILE_HIT,DODGE_NEAR,DODGE_FAR} from '../dist/threats.js';
import {makeJob,jobRoute,jobBoard,ISLAND_TIER,CRATE_WEIGHTS} from '../dist/career.js';
import {landAt} from '../dist/hazards.js';
import {PART,newParts,stats,buy} from '../dist/upgrades.js';

test('radar: in range and above the radar floor only',()=>{const site={pos:new Vector3(0,0,0)};
 assert.ok(radarSees(site,new Vector3(30,10,0),RADAR_FLOOR+2,0));assert.ok(!radarSees(site,new Vector3(30,2,0),RADAR_FLOOR-1,0));assert.ok(!radarSees(site,new Vector3(RADAR_RANGE+5,10,0),20,0));});
test('a missile runs down a plane flying straight away from it',()=>{const P=new Vector3(0,20,0),V=new Vector3(18,0,0),m=newMissile(new Vector3(-50,0,15),new Vector3(0,1,0).add(new Vector3(50,20,-15).normalize()));let hit=false;
 for(let t=0;t<9&&!hit;t+=1/60){P.addScaledVector(V,1/60);stepMissile(m,P,1/60,V);hit=!m.lost&&m.pos.distanceTo(P)<MISSILE_HIT;}assert.ok(hit);});
test('flares decoy a closing missile, and only inside the dodge window does a roll shake it',()=>{const m={pos:new Vector3(10,0,0)};assert.ok(flareDecoys(m,new Vector3(0,0,0),()=>.1));assert.ok(!flareDecoys(m,new Vector3(0,0,0),()=>.99));
 assert.ok(canDodge({pos:new Vector3((DODGE_NEAR+DODGE_FAR)/2,0,0)},new Vector3()));assert.ok(!canDodge({pos:new Vector3(DODGE_FAR+10,0,0)},new Vector3()));assert.ok(!canDodge({pos:new Vector3(DODGE_NEAR/2,0,0)},new Vector3()));});
test('hard jobs span several islands and are defended; calm jobs are not',()=>{for(const [l,t] of Object.entries(ISLAND_TIER))for(const type of ['parcels','crate','mail','urgent']){const j=makeJob(21,{type,island:l});
  if(t>=2){assert.equal(j.islands.length,t);assert.equal(j.sams.length,t*(t>=3?2:1));assert.equal(j.flak.length,t>=3?t:0);const r=jobRoute(j);assert.equal(r.features.sams.length,j.sams.length);
   for(const s of j.sams)assert.ok(landAt(s.normal),'SAM on land');if(type==='parcels')assert.equal(new Set(j.stops.map(s=>s.island)).size,t);}
  else{assert.equal(j.islands.length,1);assert.equal(j.sams.length,0);}}});
test('crates have weights that rise with danger, and the winch must be strong enough',()=>{const w=l=>makeJob(5,{type:'crate',island:l}).weight;assert.ok(w('SUNSET ARCHIPELAGO')>w('THE HOMEWARD ISLES'));assert.ok(CRATE_WEIGHTS[w('THE HOMEWARD ISLES')]);
 const c={cash:1e6,jobsDone:60,earned:1e6,parts:newParts()};assert.equal(stats(c).strength,1);buy(c,'winch');for(let i=0;i<3;i++)buy(c,'winch');assert.equal(stats(c).strength,4);});
test('flares are a shop part: none until unlocked, more with each level',()=>{assert.ok(PART.flares);assert.ok(PART.flares.unlock>0);const c={cash:1e6,jobsDone:60,earned:1e6,parts:newParts()};assert.equal(c.parts.flares.unlocked,false);
 buy(c,'flares');assert.equal(stats(c).flares,2);buy(c,'flares');buy(c,'flares');assert.equal(stats(c).flares,4);assert.ok(stats(c).decoy>.75);});
