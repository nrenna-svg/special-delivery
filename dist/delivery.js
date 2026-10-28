import {Vector3} from './vendor/three.core.js';
import {RADIUS,advance,verticalSpeed} from './flight.js';
import {windAt,stopNormalAt} from './challenges.js';
export const IMPACT_RADIUS=RADIUS+2.5;
export const STOP_DATA=[
 {name:'The village bakery',goods:'Flour & sugar',x:0,z:-.165,color:'#f4ad68'},
 {name:'Lighthouse supplies',goods:'Lamp oil',x:.12,z:-.1125,color:'#f1d46f'},
 {name:'Orchard cottage',goods:'Seedlings',x:.0975,z:-.27,color:'#b6d674'},
 {name:'The hilltop workshop',goods:'Tool kit',x:-.09,z:-.2775,color:'#bdb0eb'},
 {name:'Harbor provisions',goods:'Rope & sailcloth',x:-.1125,z:-.12,color:'#7edbd3'}
];
// specs: optional [{name,goods,color,normal}] from days.js; defaults to the original Kestrel route.
export function newRoute(specs=null){const stops=specs?specs.map((s,i)=>({...s,id:i,normal:s.normal.clone(),done:false})):STOP_DATA.map((s,i)=>({...s,id:i,normal:new Vector3(s.x,1,s.z).normalize(),done:false}));return {stops,parcels:12,drops:0,delivered:0,score:0,condition:100,elapsed:0,complete:false};}
export const RELEASE_DELAY=.65, CHUTE_DELAY=1, INFLATION_TIME=.45;
export function makeParcel(s){return {position:s.normal.clone().multiplyScalar(RADIUS+s.altitude-1),velocity:s.forward.clone().multiplyScalar(s.speed*Math.cos(s.pitch)).addScaledVector(s.normal,verticalSpeed(s)-1),age:0,inflation:0,broken:false};}
export function stepParcel(p,dt){
 p.age+=dt;p.inflation=Math.max(0,Math.min(1,(p.age-CHUTE_DELAY)/INFLATION_TIME));
 const normal=p.position.clone().normalize();p.velocity.addScaledVector(normal,-12*dt);
 if(p.inflation>0){const radial=p.velocity.dot(normal),tangent=p.velocity.clone().addScaledVector(normal,-radial);const vertical=radial+(-3.2-radial)*(1-Math.exp(-8*p.inflation*dt));const w=p.wind?windAt(p.wind,normal,p.windTime||0):null;const keep=Math.exp(-.55*p.inflation*dt);if(w)tangent.sub(w);tangent.multiplyScalar(keep);if(w)tangent.add(w);p.velocity.copy(tangent).addScaledVector(normal,vertical);}
 p.position.addScaledVector(p.velocity,dt);
 const hit=p.position.length()<=IMPACT_RADIUS;
 if(hit)p.broken=p.inflation<.95||-p.velocity.dot(p.position.clone().normalize())>5.5;
 return hit;
}
export function releaseState(s){const copy={...s,normal:s.normal.clone(),forward:s.forward.clone(),stunt:null};for(let t=0;t<RELEASE_DELAY;t+=1/120)advance(copy,{turn:s.bank/.82,climb:s.pitch/.48},Math.min(1/120,RELEASE_DELAY-t));return copy;}
// wind: optional day wind (see challenges.js), applied with gusts frozen at windTime.
export function predictDrop(s,wind=null,windTime=0){const p=makeParcel(releaseState(s));p.wind=wind;p.windTime=windTime;for(let i=0;i<6000;i++){if(stepParcel(p,1/120))return {position:p.position.normalize().multiplyScalar(IMPACT_RADIUS+.08),broken:p.broken,time:RELEASE_DELAY+(i+1)/120};}return null;}
export function predictImpact(s){return predictDrop(s)?.position||null;}
export function safeDropAltitude(s){const released=releaseState({...s,altitude:60});let velocity=Math.min(0,verticalSpeed(released))-1,fall=0;for(let age=0;age<4;age+=1/120){const inflation=Math.max(0,Math.min(1,(age-CHUTE_DELAY)/INFLATION_TIME));velocity-=12/120;if(inflation)velocity+=(-3.2-velocity)*(1-Math.exp(-8*inflation/120));fall-=velocity/120;if(inflation>=.95&&-velocity<=5.5)break;}return Math.ceil(3.5+fall+Math.max(0,60-released.altitude)+2);}
export const PAD_RADIUS=8;
// The open (undelivered) stop a landing point falls on, or null. Does not change the route.
// at: optional route time to check against (moving boat stops are checked where they will be).
export function padAt(route,position,at=null){const n=position.clone().normalize();for(const s of route.stops){if(s.done)continue;const sn=at===null?s.normal:stopNormalAt(s,at);if(Math.acos(Math.max(-1,Math.min(1,sn.dot(n))))*IMPACT_RADIUS<=PAD_RADIUS)return s;}return null;}
export function resolveDelivery(route,position,parcel){if(parcel?.broken)return null;let closest=null,distance=Infinity;for(const s of route.stops){if(s.done)continue;const d=Math.acos(Math.max(-1,Math.min(1,s.normal.dot(position.clone().normalize()))))*IMPACT_RADIUS;if(d<distance){distance=d;closest=s;}}
 if(!closest||distance>PAD_RADIUS)return null;
 closest.done=true;route.delivered++;const accuracy=Math.max(0,Math.round(100*(1-distance/PAD_RADIUS)));let points=100+accuracy+Math.round(route.condition);
 // Urgent parcels earn a bonus when delivered before their clock runs out.
 const onTime=closest.urgent?route.elapsed<=closest.urgent.seconds:null;if(onTime)points+=150;
 route.score+=points;route.complete=route.delivered===route.stops.length;return {name:closest.name,goods:closest.goods,id:closest.id,accuracy,points,onTime};
}
