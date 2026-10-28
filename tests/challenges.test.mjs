import test from 'node:test';import assert from 'node:assert/strict';
import {Vector3} from '../dist/vendor/three.core.js';
import {newFlight,RADIUS} from '../dist/flight.js';
import {makeParcel,stepParcel,predictDrop,releaseState,padAt,newRoute,resolveDelivery,IMPACT_RADIUS} from '../dist/delivery.js';
import {ringCourse,ringHit,ringScore,windAt,boatNormal,stopNormalAt,flockBirds,stormStrength,skyAt,mailHit,MAIL_ALT,offsetNormal} from '../dist/challenges.js';
import {DAYS,ISLANDS,dayStops,dayFeatures,islandNormal} from '../dist/days.js';
const arc=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.dot(b))))*RADIUS;
const islandsNear=n=>ISLANDS.filter(i=>arc(n,islandNormal(i.label))<i.size*1.15+8);

test('every day introduces something new and has enough to do',()=>{
 const f=DAYS.map((_,i)=>dayFeatures(i));
 assert.ok(f[0].rings.length>=12);assert.ok(f[1].wind);assert.ok(dayStops(2).some(s=>s.motion)&&dayStops(2).some(s=>s.urgent));
 assert.equal(f[3].mail.length,3);assert.ok(f[3].flocks.length>=2);
 assert.ok(f[4].rings.length&&f[4].wind&&f[4].flocks.length&&f[4].storms.length&&f[4].night&&dayStops(4).some(s=>s.urgent));
});
test('ring course stays clear of pads and above the safe-drop height',()=>{for(const i of [0,4]){const stops=dayStops(i);for(const r of dayFeatures(i).rings){assert.ok(r.altitude>=16);for(const s of stops)assert.ok(arc(r.normal,s.normal)>8.5);}}
 const r={normal:new Vector3(0,1,0),altitude:20};assert.ok(ringHit(r,new Vector3(0,RADIUS+21,1)));assert.ok(!ringHit(r,new Vector3(0,RADIUS+26,0)));assert.equal(ringScore(1),25);assert.equal(ringScore(9),100);});
test('wind drifts the parachute downwind and the preview still matches the landing',()=>{
 const s=newFlight();s.altitude=24;const wind={dir:new Vector3(1,0,0),speed:5,gust:0};
 const calm=predictDrop(s),windy=predictDrop(s,wind);assert.ok(windy.position.x-calm.position.x>5,'drift '+(windy.position.x-calm.position.x));
 const p=makeParcel(releaseState(s));p.wind=wind;for(let i=0;i<6000;i++)if(stepParcel(p,1/120))break;assert.ok(p.position.clone().normalize().distanceTo(windy.position.clone().normalize())<1e-6);assert.equal(p.broken,false);
 assert.ok(Math.abs(windAt(wind,new Vector3(0,1,0)).length()-5)<1e-9);assert.equal(windAt(null,new Vector3(0,1,0)).length(),0);
});
test('boats sail on open water, move smoothly and are checked where they will be',()=>{
 for(const s of dayStops(2).filter(s=>s.motion)){let prev=boatNormal(s.motion,0);for(let t=0;t<s.motion.period;t+=.5){const n=boatNormal(s.motion,t);assert.equal(islandsNear(n).length,0,`${s.name} runs aground at ${t}`);assert.ok(arc(n,prev)<1.2);prev=n;}}
 const r=newRoute(dayStops(2)),boat=r.stops.find(s=>s.motion),later=stopNormalAt(boat,30);
 assert.equal(padAt(r,later.clone().multiplyScalar(IMPACT_RADIUS),30),boat);assert.notEqual(padAt(r,later.clone().multiplyScalar(IMPACT_RADIUS),0),boat);
});
test('urgent parcels earn a bonus only on time',()=>{const r=newRoute(dayStops(2)),s=r.stops.find(x=>x.urgent);r.elapsed=10;const a=resolveDelivery(r,s.normal.clone().multiplyScalar(IMPACT_RADIUS));assert.equal(a.onTime,true);
 const r2=newRoute(dayStops(2)),s2=r2.stops.find(x=>x.urgent);r2.elapsed=999;const b=resolveDelivery(r2,s2.normal.clone().multiplyScalar(IMPACT_RADIUS));assert.equal(b.onTime,false);assert.equal(a.points-b.points,150);});
test('flocks, storms, mail and the night sky behave',()=>{
 const f=dayFeatures(3).flocks[0],birds=flockBirds(f,3);assert.equal(birds.length,f.count);for(const b of birds)assert.ok(arc(b.normal,f.center)<f.radius+12);
 const st=dayFeatures(4).storms[0];assert.equal(stormStrength(st,st.center),1);assert.equal(stormStrength(st,offsetNormal(st.center,st.radius+1,0)),0);
 for(const s of dayStops(4))for(const storm of dayFeatures(4).storms)assert.ok(arc(s.normal,storm.center)>storm.radius+6,'storm over '+s.name);
 const m=dayFeatures(3).mail[0];assert.ok(mailHit(m,m.normal.clone().multiplyScalar(RADIUS+MAIL_ALT+1)));assert.ok(!mailHit(m,m.normal.clone().multiplyScalar(RADIUS+MAIL_ALT+5)));
 for(const mm of dayFeatures(3).mail)for(const s of dayStops(3))assert.ok(arc(mm.normal,s.normal)>12);
 for(const fl of dayFeatures(4).flocks)for(const st of dayFeatures(4).storms)assert.ok(arc(fl.center,st.center)>st.radius+fl.radius+15,'gulls inside a storm');
 assert.deepEqual(skyAt(0).bg,[.514,.741,.804]);assert.ok(skyAt(1).stars===1&&skyAt(1).sun<skyAt(0).sun);
});

test('boat stops have a wider catch zone than fixed pads and sail slower',async()=>{
 const {padRadius,PAD_RADIUS,BOAT_PAD_RADIUS,resolveDelivery}=await import('../dist/delivery.js');
 const r=newRoute(dayStops(2)),boat=r.stops.find(s=>s.motion),pad=r.stops.find(s=>!s.motion);
 assert.equal(padRadius(boat),BOAT_PAD_RADIUS);assert.equal(padRadius(pad),PAD_RADIUS);assert.ok(BOAT_PAD_RADIUS>PAD_RADIUS);
 const near=offsetNormal(boat.normal,11,0).multiplyScalar(IMPACT_RADIUS);assert.equal(resolveDelivery(r,near,{broken:false})?.name,boat.name);
 for(const s of dayStops(2).filter(s=>s.motion))assert.ok(2*Math.PI*s.motion.radius/s.motion.period<1.6,`${s.name} is too fast`);
});
