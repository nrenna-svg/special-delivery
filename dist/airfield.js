// Home airfield (v0.70 career): the long runway, the hangar, the taxi-and-takeoff path out of the
// hangar, and the rules for landing by hand. Pure functions, no rendering.
//
// Runway coordinates: the runway is centered on the planet's north pole and runs along world Z.
// z = distance along the runway's great circle (takeoff heads toward -z), x = sideways distance from
// the centerline, both in world units. The runway follows the planet's curve, so the wheels sit at
// the same altitude (GROUND_ALT) along its whole length.
import {Vector3} from './vendor/three.core.js';
import {RADIUS} from './flight.js';

export const RUNWAY_HALF=33, RUNWAY_WIDTH=8, RUNWAY_HEIGHT=2.25, GROUND_ALT=3.65;
export const PIVOT=RADIUS+GROUND_ALT;
// Hangar: a quonset hut off the runway's +z end, doors facing the runway (-x).
export const HANGAR={x:24,z:28,length:15,radius:8,door:11};
export const PARK={x:27,z:28};                     // plane parked deep inside (v0.76), nose to the doors
export const TAXI_SPEED=7, LIFTOFF_SPEED=15, CRUISE_ALT=15, CRUISE_SPEED=18;
export const DOOR_TIME=1.8, CLIMB_TIME=2.7;
const TURN_R=6, LINEUP_Z=PARK.z-TURN_R, LIFTOFF_Z=0;

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function toRunway(n){return {x:Math.asin(clamp(n.x,-1,1))*PIVOT,z:Math.atan2(n.z,n.y)*PIVOT};}
export function runwayNormal(x,z,out=new Vector3()){const a=x/PIVOT,b=z/PIVOT;return out.set(Math.sin(a),Math.cos(a)*Math.cos(b),Math.cos(a)*Math.sin(b));}
// heading: 0 = toward -z (the takeoff direction), -PI/2 = toward -x, PI/2 = toward +x.
export function headingVector(h){return {x:Math.sin(h),z:-Math.cos(h)};}
// World forward vector for a runway-frame heading at (x,z).
export function runwayForward(x,z,h,normal,out=new Vector3()){
 const b=z/PIVOT,tz=new Vector3(0,-Math.sin(b),Math.cos(b));tz.addScaledVector(normal,-tz.dot(normal)).normalize();
 const tx=new Vector3().crossVectors(normal,tz);// +x direction
 const d=headingVector(h);return out.copy(tx).multiplyScalar(d.x).addScaledVector(tz,d.z).normalize();
}
export function onRunway(x,z,margin=.6){return Math.abs(x)<=RUNWAY_WIDTH/2+margin&&Math.abs(z)<=RUNWAY_HALF;}
// Ground the scenery must keep clear of: runway, taxiway, apron and hangar.
export function airfieldClear(n,pad=3){const r=toRunway(n);if(n.y<.9)return false;
 if(Math.abs(r.x)<RUNWAY_WIDTH/2+pad&&Math.abs(r.z)<RUNWAY_HALF+pad)return true;
 if(r.x>-pad&&r.x<HANGAR.x+HANGAR.length/2+pad&&r.z>HANGAR.z-HANGAR.radius-pad-2&&r.z<HANGAR.z+HANGAR.radius+pad)return true;
 return false;}

// ── Rollout: doors open, taxi out, turn onto the runway, takeoff roll, climb-out ──────────────
// Path pieces in runway coordinates. s = distance along the path.
const STRAIGHT=PARK.x-TURN_R, ARC=Math.PI/2*TURN_R, ROLL=LINEUP_Z-LIFTOFF_Z;
const ROLL_ACC=(LIFTOFF_SPEED*LIFTOFF_SPEED-TAXI_SPEED*TAXI_SPEED)/(2*ROLL);
export const ROLL_TIME=(LIFTOFF_SPEED-TAXI_SPEED)/ROLL_ACC;
const TAXI_TIME=(STRAIGHT+ARC)/TAXI_SPEED+.6, CLIMB_DISTANCE=(LIFTOFF_SPEED+CRUISE_SPEED)/2*CLIMB_TIME;
export const ROLLOUT_TIME=DOOR_TIME+TAXI_TIME+ROLL_TIME+CLIMB_TIME;
export const HANDOFF_Z=LIFTOFF_Z-CLIMB_DISTANCE;
export const PHASES={doors:DOOR_TIME,taxi:DOOR_TIME+TAXI_TIME,roll:DOOR_TIME+TAXI_TIME+ROLL_TIME,climb:ROLLOUT_TIME};
const smooth=u=>{u=clamp(u,0,1);return u*u*(3-2*u);}, smoothSlope=u=>u<0||u>1?0:6*u*(1-u);
function taxiPoint(s){
 if(s<=STRAIGHT)return {x:PARK.x-s,z:PARK.z,h:-Math.PI/2};
 const a=(s-STRAIGHT)/TURN_R;// arc around (TURN_R, LINEUP_Z), from heading -x to heading -z (a right turn)
 return {x:TURN_R-Math.sin(a)*TURN_R,z:LINEUP_Z+Math.cos(a)*TURN_R,h:-Math.PI/2+a};
}
// t: seconds since the doors started opening. Returns {x,z,h,altitude,speed,pitch,airborne,doors}.
export function rolloutPose(t){
 t=clamp(t,0,ROLLOUT_TIME);const doors=smooth(t/DOOR_TIME);
 if(t<DOOR_TIME)return {x:PARK.x,z:PARK.z,h:-Math.PI/2,altitude:GROUND_ALT,speed:0,pitch:.1,airborne:false,doors};
 if(t<PHASES.taxi){const tt=t-DOOR_TIME,ramp=Math.min(1,tt/1.2),s=TAXI_SPEED*(tt<1.2?tt*tt/2.4:tt-.6);const p=taxiPoint(s);
  return {...p,altitude:GROUND_ALT,speed:TAXI_SPEED*ramp,pitch:.1,airborne:false,doors:1};}
 if(t<PHASES.roll){const tt=t-PHASES.taxi,d=TAXI_SPEED*tt+.5*ROLL_ACC*tt*tt,u=tt/ROLL_TIME;
  return {x:0,z:LINEUP_Z-d,h:0,altitude:GROUND_ALT,speed:TAXI_SPEED+ROLL_ACC*tt,pitch:.1*(1-smooth(u/.6)),airborne:false,doors:1};}
 const tau=t-PHASES.roll,gain=(CRUISE_SPEED-LIFTOFF_SPEED)/CLIMB_TIME,s=LIFTOFF_SPEED*tau+.5*gain*tau*tau,u=s/CLIMB_DISTANCE,climb=CRUISE_ALT-GROUND_ALT;
 return {x:0,z:LIFTOFF_Z-s,h:0,altitude:GROUND_ALT+climb*smooth(u),speed:LIFTOFF_SPEED+gain*tau,pitch:Math.atan(climb*smoothSlope(u)/CLIMB_DISTANCE),airborne:true,doors:1};
}
// Writes a runway-frame pose into a flight state.
export function applyRunwayPose(s,p){
 runwayNormal(p.x,p.z,s.normal);runwayForward(p.x,p.z,p.h,s.normal,s.forward);
 s.altitude=p.altitude;s.speed=p.speed;s.pitch=p.pitch;s.bank=p.bank||0;s.roll=0;s.stunt=null;s.cooldown=0;return s;
}

// ── Landing by hand ────────────────────────────────────────────────────────────────────────
// Touchdown happens when the wheels reach the runway. sink = descent rate (world units/s, positive
// down; the HUD shows x10 m/s), speed in world units/s (HUD knots = x3), bank in radians,
// along = how well the nose lines up with the runway (1 = straight down it, either direction).
export const MAX_SINK=2.6, MAX_LAND_SPEED=24, MAX_LAND_BANK=.38;
// lim: optional landing-gear limits {sink, landSpeed} from upgrades.
export function gradeTouchdown({sink,speed,bank,x,along},lim={}){const maxSink=lim.sink??MAX_SINK,maxSpeed=lim.landSpeed??MAX_LAND_SPEED;
 if(sink>maxSink)return {ok:false,label:'HARD LANDING',why:'came down too hard'};
 if(speed>maxSpeed)return {ok:false,label:'OVERRAN',why:'too fast to stop'};
 if(Math.abs(bank)>MAX_LAND_BANK)return {ok:false,label:'WINGTIP STRIKE',why:'wings not level'};
 if(along<.8)return {ok:false,label:'GROUND LOOP',why:'not lined up with the runway'};
 const grade=sink<=.9&&speed<=18?{label:'GREASED IT',stars:3,bonus:.6}:sink<=Math.max(1.7,maxSink*.65)?{label:'FIRM LANDING',stars:2,bonus:.35}:{label:'BOUNCY LANDING',stars:1,bonus:.15};
 const centered=Math.abs(x)<1.2;return {ok:true,...grade,centered,bonus:grade.bonus+(centered?.1:0),knots:Math.round(speed*3),sinkMs:Math.round(sink*10)};
}
// After touchdown: brake to a stop on the runway. Returns the distance it takes.
export const BRAKE=4.5;
export function stoppingDistance(speed){return speed*speed/(2*BRAKE);}

// Auto-land ring: off the runway's +z end, lined up for a landing toward -z.
export const RING_Z=RUNWAY_HALF+48, RING_ALT=9, RING_RADIUS=6.5;
