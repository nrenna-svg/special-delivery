// Pre-mission cutscene timing and the runway takeoff path.
// The home runway sits on the planet's north pole (normal 0,1,0) and runs along world Z.
// The plane parks near the +Z end, rolls toward -Z, lifts off and climbs out over Kestrel Island,
// then hands control to the player level at CRUISE_ALT and CRUISE_SPEED.
import {RADIUS} from './flight.js';

export const LOAD_TIME=5.2;   // close-up: crew loads parcels
export const SWOOP_TIME=1.6;  // camera pulls back to the chase position
export const ROLL_TIME=2.4;   // takeoff roll down the runway
export const CLIMB_TIME=2.7;  // climb-out until the player takes over
export const CUTSCENE_TIME=LOAD_TIME+SWOOP_TIME+ROLL_TIME+CLIMB_TIME;

export const RUNWAY_HEIGHT=2.25;          // matches place(home, 2.25) in game.js
export const GROUND_ALT=3.65;             // aircraft origin height with wheels on the runway
export const PARKED_Z=10, LIFTOFF_Z=-4;   // runway-local Z (runway spans -12..12)
export const CRUISE_ALT=15, CRUISE_SPEED=18;
export const PARKED_PITCH=.1;             // tail-dragger sits nose-up on the ground

const ROLL_DISTANCE=PARKED_Z-LIFTOFF_Z;
const ROLL_ACCEL=2*ROLL_DISTANCE/(ROLL_TIME*ROLL_TIME);
export const LIFTOFF_SPEED=ROLL_ACCEL*ROLL_TIME;
const CLIMB_DISTANCE=(LIFTOFF_SPEED+CRUISE_SPEED)/2*CLIMB_TIME;
export const HANDOFF_Z=LIFTOFF_Z-CLIMB_DISTANCE;
const PIVOT=RADIUS+GROUND_ALT;
// The runway is a flat slab on a curved planet, so wheels ride slightly higher toward its ends.
function runwayBump(z){const c=Math.max(-12,Math.min(12,z));return Math.sqrt(PIVOT*PIVOT+c*c)-PIVOT;}
const CLIMB_HEIGHT=CRUISE_ALT-GROUND_ALT-runwayBump(-12);
const smooth=u=>u*u*(3-2*u), smoothSlope=u=>6*u*(1-u);

// t is seconds since the takeoff roll began (0 .. ROLL_TIME+CLIMB_TIME).
export function takeoffPose(t){
 t=Math.max(0,Math.min(ROLL_TIME+CLIMB_TIME,t));
 if(t<=ROLL_TIME){
  const z=PARKED_Z-.5*ROLL_ACCEL*t*t,u=t/ROLL_TIME;
  // Tail lifts as speed builds, so the nose comes level before liftoff.
  const pitch=PARKED_PITCH*(1-smooth(Math.min(1,u/.6)));
  return {z,altitude:GROUND_ALT+runwayBump(z),speed:ROLL_ACCEL*t,pitch,airborne:false};
 }
 const tau=t-ROLL_TIME,gain=(CRUISE_SPEED-LIFTOFF_SPEED)/CLIMB_TIME;
 const s=LIFTOFF_SPEED*tau+.5*gain*tau*tau,u=s/CLIMB_DISTANCE;
 const z=LIFTOFF_Z-s;
 const altitude=GROUND_ALT+runwayBump(z)+CLIMB_HEIGHT*smooth(u);
 const pitch=Math.atan(CLIMB_HEIGHT*smoothSlope(u)/CLIMB_DISTANCE);
 return {z,altitude,speed:LIFTOFF_SPEED+gain*tau,pitch,airborne:true};
}
export function parkedPose(){return {...takeoffPose(0),pitch:PARKED_PITCH,speed:0};}

// Writes a pose into a flight state (see newFlight in flight.js).
export function applyPose(s,pose){
 const a=pose.z/PIVOT;
 s.normal.set(0,Math.cos(a),Math.sin(a));s.forward.set(0,Math.sin(a),-Math.cos(a));
 s.altitude=pose.altitude;s.pitch=pose.pitch;s.speed=pose.speed;
 s.bank=0;s.roll=0;s.stunt=null;s.cooldown=0;
 return s;
}
