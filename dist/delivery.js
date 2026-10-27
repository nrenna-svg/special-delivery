import {Vector3} from './vendor/three.core.js';
import {RADIUS} from './flight.js';
export const IMPACT_RADIUS=RADIUS+2.5;
export const STOP_DATA=[
 {name:'The village bakery',x:0,z:-.22,color:'#f4ad68'},
 {name:'Lighthouse supplies',x:.16,z:-.15,color:'#f1d46f'},
 {name:'Orchard cottage',x:.13,z:-.36,color:'#b6d674'},
 {name:'The hilltop workshop',x:-.12,z:-.37,color:'#bdb0eb'},
 {name:'Harbor provisions',x:-.15,z:-.16,color:'#7edbd3'}
];
export function newRoute(){return {stops:STOP_DATA.map((s,i)=>({...s,id:i,normal:new Vector3(s.x,1,s.z).normalize(),done:false})),parcels:12,drops:0,delivered:0,score:0,condition:100,elapsed:0,complete:false};}
export function makeParcel(s){return {position:s.normal.clone().multiplyScalar(RADIUS+s.altitude-1),velocity:s.forward.clone().multiplyScalar(s.speed*Math.cos(s.pitch)).addScaledVector(s.normal,s.speed*Math.sin(s.pitch)-1),age:0};}
export function stepParcel(p,dt){p.velocity.addScaledVector(p.position.clone().normalize(),-12*dt);p.position.addScaledVector(p.velocity,dt);p.age+=dt;return p.position.length()<=IMPACT_RADIUS;}
export function predictImpact(s){const p=makeParcel(s);for(let i=0;i<1200;i++){if(stepParcel(p,1/120))return p.position.normalize().multiplyScalar(IMPACT_RADIUS+.08);}return null;}
export function resolveDelivery(route,position){let closest=null,distance=Infinity;for(const s of route.stops){if(s.done)continue;const d=Math.acos(Math.max(-1,Math.min(1,s.normal.dot(position.clone().normalize()))))*IMPACT_RADIUS;if(d<distance){distance=d;closest=s;}}
 if(!closest||distance>8)return null;
 closest.done=true;route.delivered++;const accuracy=Math.max(0,Math.round(100*(1-distance/8)));const points=100+accuracy+Math.round(route.condition);route.score+=points;route.complete=route.delivered===route.stops.length;return {name:closest.name,accuracy,points};
}
