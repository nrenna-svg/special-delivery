import { Vector3, Quaternion } from './vendor/three.core.js';
export const RADIUS=150;
export function newFlight(){return {normal:new Vector3(0,1,0),forward:new Vector3(0,0,-1),altitude:17,speed:23,bank:0,pitch:0,distance:0,time:0};}
export function advance(s,input,dt){
 const blend=1-Math.exp(-3*dt);
 s.bank+=((input.turn||0)*.72-s.bank)*blend;
 s.pitch+=((input.climb||0)*.38-s.pitch)*blend;
 s.speed+=((input.boost?37:23)-s.speed)*(1-Math.exp(-1.4*dt));
 s.forward.applyAxisAngle(s.normal,-s.bank*.78*dt).normalize();
 s.altitude=Math.max(7,Math.min(58,s.altitude+Math.sin(s.pitch)*s.speed*dt));
 const travel=s.speed*Math.cos(s.pitch)*dt;
 const axis=new Vector3().crossVectors(s.normal,s.forward).normalize();
 const rot=new Quaternion().setFromAxisAngle(axis,travel/(RADIUS+s.altitude));
 s.normal.applyQuaternion(rot).normalize();s.forward.applyQuaternion(rot);
 s.forward.addScaledVector(s.normal,-s.forward.dot(s.normal)).normalize();
 s.distance+=travel;s.time+=dt;return s;
}
