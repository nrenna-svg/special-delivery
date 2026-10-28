import test from 'node:test';import assert from 'node:assert/strict';
import {Vector3} from '../dist/vendor/three.core.js';
import {RADIUS} from '../dist/flight.js';
import {newFlight,advance,fuelBurn} from '../dist/flight.js';
import {floorAt,landAt,terrainCheck,obstacleHit,pickRespawn,LIGHTHOUSE,WATER_FLOOR,LAND_FLOOR} from '../dist/hazards.js';
import {DAYS,dayStops,dayFeatures,islandNormal} from '../dist/days.js';
const arc=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.dot(b))))*RADIUS;

test('a stock tank lasts about three minutes at cruise and boost is expensive',()=>{const cruise=100/fuelBurn(8/26,false);assert.ok(cruise>150&&cruise<225,'cruise '+cruise);assert.ok(fuelBurn(.3,true)>4*fuelBurn(.3,false));});
test('engine out glides down slowly instead of dropping',()=>{const s=newFlight();s.altitude=20;let t=0;while(s.altitude>1&&t<60){advance(s,{engineOut:true,climb:1,floor:0},1/60);t+=1/60;}assert.ok(t>6&&t<40,'glide '+t);assert.ok(s.speed<16);});
test('the floor is the old 7 by default and can be lowered',()=>{const a=newFlight(),b=newFlight();for(let i=0;i<1200;i++){advance(a,{climb:-1},1/60);advance(b,{climb:-1,floor:0},1/60);}assert.equal(a.altitude,7);assert.equal(b.altitude,0);});
test('land, beach and sea floors, obstacles and warnings',()=>{
 const k=islandNormal('KESTREL ISLAND');assert.equal(floorAt(k),LAND_FLOOR);assert.equal(floorAt(new Vector3(0,-1,-.9).normalize().negate()),WATER_FLOOR);
 assert.equal(terrainCheck(k,2).what,'the hillside');assert.equal(terrainCheck(k,5).crash,false);assert.equal(terrainCheck(k,5).warn,true);assert.equal(terrainCheck(k,12).warn,false);
 assert.equal(obstacleHit(LIGHTHOUSE.normal,6,[LIGHTHOUSE]),LIGHTHOUSE);assert.equal(obstacleHit(LIGHTHOUSE.normal,10,[LIGHTHOUSE]),null);
 assert.equal(pickRespawn([1,2,3,4,5,6,7,8,9,10,11,12],5),2);assert.equal(pickRespawn([7],5),7);
});
test('pads, boats and gates sit where a normal approach is safe',()=>{DAYS.forEach((d,i)=>{for(const s of dayStops(i))assert.ok(terrainCheck(s.normal,19).crash===false);});
 for(let i=0;i<5;i++)for(const h of dayFeatures(i).fuel){for(const s of dayStops(i))assert.ok(arc(h.normal,s.normal)>11,'fuel hoop over a pad');for(const m of dayFeatures(i).mail)assert.ok(arc(h.normal,m.normal)>11);assert.ok(landAt(h.normal));}
 assert.ok(dayFeatures(1).fuel.length&&dayFeatures(4).fuel.length===2);
});
