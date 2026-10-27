import {Vector3} from './vendor/three.core.js';
import {RADIUS,advance} from './flight.js';
export const IMPACT_RADIUS=RADIUS+2.5;
export const STOP_DATA=[
 {name:'The village bakery',x:0,z:-.22,color:'#f4ad68'},
 {name:'Lighthouse supplies',x:.16,z:-.15,color:'#f1d46f'},
 {name:'Orchard cottage',x:.13,z:-.36,color:'#b6d674'},
 {name:'The hilltop workshop',x:-.12,z:-.37,color:'#bdb0eb'},
 {name:'Harbor provisions',x:-.15,z:-.16,color:'#7edbd3'}
];
export function newRoute(){return {stops:STOP_DATA.map((s,i)=>({...s,id:i,normal:new Vector3(s.x,1,s.z).normalize(),done:false})),parcels:12,drops:0,delivered:0,score:0,condition:100,elapsed:0,complete:false};}
export const RELEASE_DELAY=.65, CHUTE_DELAY=1, INFLATION_TIME=.45;
export function makeParcel(s){return {position:s.normal.clone().multiplyScalar(RADIUS+s.altitude-1),velocity:s.forward.clone().multiplyScalar(s.speed*Math.cos(s.pitch)).addScaledVector(s.normal,s.speed*Math.sin(s.pitch)-1),age:0,inflation:0,broken:false};}
export function stepParcel(p,dt){
 p.age+=dt;p.inflation=Math.max(0,Math.min(1,(p.age-CHUTE_DELAY)/INFLATION_TIME));
 const normal=p.position.clone().normalize();p.velocity.addScaledVector(normal,-12*dt);
 if(p.inflation>0){const radial=p.velocity.dot(normal),tangent=p.velocity.clone().addScaledVector(normal,-radial);const vertical=radial+(-3.2-radial)*(1-Math.exp(-8*p.inflation*dt));p.velocity.copy(tangent.multiplyScalar(Math.exp(-.55*p.inflation*dt))).addScaledVector(normal,vertical);}
 p.position.addScaledVector(p.velocity,dt);
 const hit=p.position.length()<=IMPACT_RADIUS;
 if(hit)p.broken=p.inflation<.95||-p.velocity.dot(p.position.clone().normalize())>5.5;
 return hit;
}
export function releaseState(s){const copy={...s,normal:s.normal.clone(),forward:s.forward.clone(),stunt:null};for(let t=0;t<RELEASE_DELAY;t+=1/120)advance(copy,{turn:s.bank/.82,climb:s.pitch/.48},Math.min(1/120,RELEASE_DELAY-t));return copy;}
export function predictDrop(s){const p=makeParcel(releaseState(s));for(let i=0;i<6000;i++){if(stepParcel(p,1/120))return {position:p.position.normalize().multiplyScalar(IMPACT_RADIUS+.08),broken:p.broken};}return null;}
export function predictImpact(s){return predictDrop(s)?.position||null;}
export function safeDropAltitude(s){const released=releaseState({...s,altitude:60});let velocity=Math.min(0,released.speed*Math.sin(released.pitch))-1,fall=0;for(let age=0;age<4;age+=1/120){const inflation=Math.max(0,Math.min(1,(age-CHUTE_DELAY)/INFLATION_TIME));velocity-=12/120;if(inflation)velocity+=(-3.2-velocity)*(1-Math.exp(-8*inflation/120));fall-=velocity/120;if(inflation>=.95&&-velocity<=5.5)break;}return Math.ceil(3.5+fall+Math.max(0,60-released.altitude)+2);}
export function resolveDelivery(route,position,parcel){if(parcel?.broken)return null;let closest=null,distance=Infinity;for(const s of route.stops){if(s.done)continue;const d=Math.acos(Math.max(-1,Math.min(1,s.normal.dot(position.clone().normalize()))))*IMPACT_RADIUS;if(d<distance){distance=d;closest=s;}}
 if(!closest||distance>8)return null;
 closest.done=true;route.delivered++;const accuracy=Math.max(0,Math.round(100*(1-distance/8)));const points=100+accuracy+Math.round(route.condition);route.score+=points;route.complete=route.delivered===route.stops.length;return {name:closest.name,accuracy,points};
}
