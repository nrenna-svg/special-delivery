import { Vector3, Quaternion } from './vendor/three.core.js';
export const RADIUS=150;
export function newFlight(){return {normal:new Vector3(0,1,0),forward:new Vector3(0,0,-1),altitude:17,speed:23,throttle:.5,bank:0,pitch:0,roll:0,stunt:null,cooldown:0,distance:0,time:0};}
export function startStunt(s,type,direction=1){
 if(s.stunt||s.cooldown>0)return 'Let the plane settle first.';
 if(type==='loop'&&(s.altitude<16||s.speed<17))return 'Loops need 160m altitude and 51 knots.';
 s.stunt={type,direction,elapsed:0,duration:type==='loop'?3.2:1.25};return null;
}
export function advance(s,input,dt){
 const blend=1-Math.exp(-3*dt);
 s.throttle=Math.max(0,Math.min(1,s.throttle+(input.throttle||0)*dt*.4));
 s.cooldown=Math.max(0,s.cooldown-dt);
 s.bank+=((s.stunt?0:(input.turn||0)*.82)-s.bank)*blend;
 if(s.stunt){s.stunt.elapsed=Math.min(s.stunt.duration,s.stunt.elapsed+dt);const phase=s.stunt.elapsed/s.stunt.duration*Math.PI*2;
  s.pitch=s.stunt.type==='loop'?phase:0;s.roll=s.stunt.type==='roll'?phase*s.stunt.direction:0;
 }else{s.pitch+=((input.climb||0)*.48-s.pitch)*blend;s.roll=0;}
 const wanted=(input.boost?38:10+s.throttle*26)-Math.sin(s.pitch)*6;
 s.speed+=(wanted-s.speed)*(1-Math.exp(-1.2*dt));
 s.forward.applyAxisAngle(s.normal,-s.bank*.85*dt).normalize();
 s.altitude=Math.max(7,Math.min(90,s.altitude+Math.sin(s.pitch)*s.speed*dt));
 const travel=s.speed*Math.cos(s.pitch)*dt;
 const motion=s.forward.clone().multiplyScalar(travel);
 if(s.stunt?.type==='roll'){
  const phase=s.stunt.elapsed/s.stunt.duration*Math.PI*2;
  motion.addScaledVector(new Vector3().crossVectors(s.forward,s.normal),Math.cos(phase)*8*dt*s.stunt.direction);
  s.altitude+=Math.sin(phase)*6*dt;
 }
 const axis=new Vector3().crossVectors(s.normal,motion).normalize();
 if(motion.lengthSq()>1e-15){const rot=new Quaternion().setFromAxisAngle(axis,motion.length()/(RADIUS+s.altitude));s.normal.applyQuaternion(rot).normalize();s.forward.applyQuaternion(rot);}
 s.forward.addScaledVector(s.normal,-s.forward.dot(s.normal)).normalize();
 if(s.stunt&&s.stunt.elapsed>=s.stunt.duration){s.stunt=null;s.pitch=0;s.roll=0;s.cooldown=.5;}
 s.altitude=Math.max(7,Math.min(90,s.altitude));s.distance+=Math.abs(travel);s.time+=dt;return s;
}
