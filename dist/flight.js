import { Vector3, Quaternion } from './vendor/three.core.js';
// Planet radius in world units (was 150 before v0.56; everything else is placed relative to it).
export const RADIUS=270; // v0.70: grown another 35% (150 → 200 in v0.56 → 270)
// Vertical rate is scaled so W/S give a controllable climb (≈35-45 m/s on the HUD)
// instead of jumping hundreds of meters in a few seconds. Cargo uses the same rate.
export const CLIMB_RATE=.5;
// How strongly climbing bleeds (and diving builds) airspeed, so the gauge visibly responds.
export const PITCH_SPEED_COST=8;
// v0.70: below SLOW_SPEED the wings run out of lift and the plane settles gently, so cutting the
// throttle over the runway lets you sink onto it for a landing (stunts are exempt).
export const SLOW_SPEED=16, SLOW_SINK=.08;
// s.perf (v0.74): plane upgrades (see upgrades.js stats()). Missing = the stock plane.
const STOCK={speed:1,accel:1,tank:1,climb:1,ceiling:90,slow:SLOW_SPEED,turn:1,bank:1,roll:1};
export const perfOf=s=>s.perf||STOCK;
export function verticalSpeed(s){const p=perfOf(s);return Math.sin(s.pitch)*s.speed*CLIMB_RATE*p.climb-(s.stunt?0:Math.max(0,p.slow-s.speed)*SLOW_SINK);}
// Fuel use in percent per second: idle burn, more with throttle, and boost is thirsty.
// Tuned for the larger planet (v0.56): a full tank lasts about six minutes at cruise.
export function fuelBurn(throttle,boost,perf=null){return (.17+throttle*.32+(boost?1.45:0))/(perf?.tank||1);}
export function newFlight(){return {normal:new Vector3(0,1,0),forward:new Vector3(0,0,-1),altitude:17,speed:23,throttle:.5,fuel:100,bank:0,pitch:0,roll:0,stunt:null,cooldown:0,distance:0,time:0};}
export function startStunt(s,type,direction=1){
 if(s.stunt||s.cooldown>0)return 'Let the plane settle first.';
 if(type==='loop'&&(s.altitude<16||s.speed<17))return 'Loops need 160m altitude and 51 knots.';
 s.stunt={type,direction,elapsed:0,duration:type==='loop'?3.2:1.25*perfOf(s).roll};return null;
}
// input.floor: lowest altitude allowed (default 7, the old invisible floor; the game passes ~0 and
// handles crashes itself). input.engineOut: no fuel, so the plane glides nose-down at low speed.
export function advance(s,input,dt){
 const P=perfOf(s),blend=1-Math.exp(-3*dt),bankBlend=1-Math.exp(-3*P.bank*dt),floor=input.floor??7,climbIn=input.engineOut?Math.min(input.climb||0,-.35):(input.climb||0);
 s.throttle=Math.max(0,Math.min(1,s.throttle+(input.throttle||0)*dt*.6));
 s.cooldown=Math.max(0,s.cooldown-dt);
 s.bank+=((s.stunt?0:(input.turn||0)*.82)-s.bank)*bankBlend;
 if(s.stunt){s.stunt.elapsed=Math.min(s.stunt.duration,s.stunt.elapsed+dt);const phase=s.stunt.elapsed/s.stunt.duration*Math.PI*2;
  s.pitch=s.stunt.type==='loop'?phase:0;s.roll=s.stunt.type==='roll'?phase*s.stunt.direction:0;
 }else{s.pitch+=(climbIn*.48-s.pitch)*blend;s.roll=0;}
 const wanted=(input.engineOut?11:input.boost?38:(10+s.throttle*26)*P.speed)-Math.sin(s.pitch)*PITCH_SPEED_COST;
 s.speed+=(wanted-s.speed)*(1-Math.exp(-1.2*P.accel*dt));
 s.forward.applyAxisAngle(s.normal,-s.bank*.85*P.turn*dt).normalize();
 s.altitude=Math.max(floor,Math.min(P.ceiling,s.altitude+(s.stunt?.type==='loop'?Math.sin(s.pitch)*s.speed:verticalSpeed(s))*dt));
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
 s.altitude=Math.max(floor,Math.min(P.ceiling,s.altitude));s.distance+=Math.abs(travel);s.time+=dt;return s;
}
