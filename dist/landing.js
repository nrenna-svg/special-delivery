// Homecoming landing. After the last delivery a gold approach gate appears over the sea off the
// runway's +Z end. Flying through it heading down the runway (-Z) hands the plane to a scripted
// glide, flare, touchdown and rollout. Approach speed sets the landing grade.
// Runway coordinates: z = distance along the runway's great circle (the takeoff direction is -Z),
// x = sideways distance from the centerline; both in world units, matching takeoff.js.
import {RADIUS} from './flight.js';
import {PARKED_PITCH} from './takeoff.js';
import {GROUND_ALT,RING_Z,RING_ALT,RING_RADIUS} from './airfield.js';

// v0.70: the long curved runway (airfield.js) — wheels ride at GROUND_ALT along its whole length.
export const GATE_Z=RING_Z, GATE_ALT=RING_ALT, GATE_RADIUS=RING_RADIUS;
export const TOUCH_Z=24, STOP_Z=-4, TOUCH_SPEED=11, BOUNCE_TIME=.7, PARKED_TIME=3.2;
const PIVOT=RADIUS+GROUND_ALT;
const smooth=u=>{u=Math.max(0,Math.min(1,u));return u*u*(3-2*u);}, smoothSlope=u=>u<0||u>1?0:6*u*(1-u);
function runwayBump(){return 0;}

export function toRunway(n){return {x:Math.asin(Math.max(-1,Math.min(1,n.x)))*PIVOT,z:Math.atan2(n.z,n.y)*PIVOT};}
export function runwayNormal(x,z,out){const a=x/PIVOT,b=z/PIVOT;return out.set(Math.sin(a),Math.cos(a)*Math.cos(b),Math.cos(a)*Math.sin(b));}

// Did the plane pass through the gate between two frames? Returns null if it did not cross the gate plane.
export function gateCrossing(prevNormal,normal,altitude,forward){
 const a=toRunway(prevNormal),b=toRunway(normal);
 if(!(a.z>GATE_Z&&b.z<=GATE_Z))return null;
 const k=(a.z-GATE_Z)/(a.z-b.z),x=a.x+(b.x-a.x)*k;
 // Heading down the runway means moving toward -Z: compare with the +Z tangent at this point.
 const ang=b.z/PIVOT,along=-(forward.y*-Math.sin(ang)+forward.z*Math.cos(ang));
 const offset=Math.hypot(x,altitude-GATE_ALT);
 return {inside:offset<=GATE_RADIUS&&along>.7,x,offset,aligned:along>.7};
}

export function gradeLanding(speed,offset){
 const knots=Math.round(speed*3);
 const base=knots<=51?{label:'SMOOTH LANDING',stars:3,bonus:150,bouncy:false}:knots<=63?{label:'FIRM LANDING',stars:2,bonus:80,bouncy:false}:{label:'BOUNCY LANDING',stars:1,bonus:30,bouncy:true};
 const centered=offset<1.5;
 return {...base,knots,centered,bonus:base.bonus+(centered?50:0)};
}

// Scripted path from the gate to a stop. start: {x,z,altitude,speed}. Pure: pose(t) for any t.
export function landingPath(start,bouncy=false){
 const glideDist=Math.max(1,start.z-TOUCH_Z),v0=Math.max(TOUCH_SPEED,start.speed);
 const glideTime=2*glideDist/(v0+TOUCH_SPEED),glideAcc=(TOUCH_SPEED-v0)/glideTime;
 const rollDist=TOUCH_Z-STOP_Z,rollTime=2*rollDist/TOUCH_SPEED,rollAcc=-TOUCH_SPEED/rollTime;
 const drop=start.altitude-GROUND_ALT-runwayBump(start.z);
 function pose(t){
  if(t<glideTime){
   const s=v0*t+.5*glideAcc*t*t,u=s/glideDist,z=start.z-s;
   const altitude=GROUND_ALT+runwayBump(z)+drop*(1-smooth(u));
   const x=start.x*(1-smooth(u*1.4));
   const pitch=Math.atan(-drop*smoothSlope(u)/glideDist)+.16*smooth((u-.72)/.28);
   const bank=Math.max(-.45,Math.min(.45,start.x/14*Math.sin(Math.PI*Math.min(1,u*1.4))));
   return {phase:'glide',x,z,altitude,speed:v0+glideAcc*t,pitch,bank};
  }
  const tau=t-glideTime;
  if(tau<rollTime){
   const z=TOUCH_Z-(TOUCH_SPEED*tau+.5*rollAcc*tau*tau);
   const hop=bouncy&&tau<BOUNCE_TIME?.9*Math.sin(Math.PI*tau/BOUNCE_TIME):0;
   return {phase:'roll',x:0,z,altitude:GROUND_ALT+runwayBump(z)+hop,speed:TOUCH_SPEED+rollAcc*tau,pitch:.16+(PARKED_PITCH-.16)*smooth(tau/.8),bank:0};
  }
  return {phase:'parked',x:0,z:STOP_Z,altitude:GROUND_ALT+runwayBump(STOP_Z),speed:0,pitch:PARKED_PITCH,bank:0};
 }
 return {pose,glideTime,rollTime,touchdown:glideTime,stopped:glideTime+rollTime,done:glideTime+rollTime+PARKED_TIME};
}
