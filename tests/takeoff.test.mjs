import test from 'node:test';import assert from 'node:assert/strict';
import {newFlight,advance} from '../dist/flight.js';
import {takeoffPose,parkedPose,applyPose,ROLL_TIME,CLIMB_TIME,GROUND_ALT,CRUISE_ALT,CRUISE_SPEED,PARKED_Z,LIFTOFF_Z,HANDOFF_Z} from '../dist/takeoff.js';

test('takeoff starts parked on the runway and ends level at cruise',()=>{
 const start=parkedPose();assert.equal(start.speed,0);assert.ok(Math.abs(start.z-PARKED_Z)<1e-9);assert.ok(start.altitude>=GROUND_ALT&&start.altitude<GROUND_ALT+.5);
 const end=takeoffPose(ROLL_TIME+CLIMB_TIME);
 assert.ok(Math.abs(end.altitude-CRUISE_ALT)<.05);assert.ok(Math.abs(end.speed-CRUISE_SPEED)<1e-9);assert.ok(Math.abs(end.pitch)<1e-9);assert.ok(Math.abs(end.z-HANDOFF_Z)<1e-6);
});
test('roll stays on the ground until liftoff, then climbs smoothly with no jumps',()=>{
 let prev=takeoffPose(0);
 for(let t=1/120;t<=ROLL_TIME+CLIMB_TIME;t+=1/120){
  const p=takeoffPose(t);
  assert.ok(p.z<prev.z);assert.ok(p.speed>=prev.speed-1e-9);
  assert.ok(Math.abs(p.altitude-prev.altitude)<.12,'altitude jump at '+t);
  assert.ok(Math.abs(p.pitch-prev.pitch)<.03,'pitch jump at '+t);
  if(!p.airborne){assert.ok(p.altitude<GROUND_ALT+.5);assert.ok(p.z>=LIFTOFF_Z-1e-9);}
  assert.ok(p.pitch>=-1e-9&&p.pitch<.5);
  prev=p;
 }
});
test('handoff leaves the flight model in a stable, continuous state',()=>{
 const s=applyPose(newFlight(),takeoffPose(ROLL_TIME+CLIMB_TIME));s.throttle=8/26;
 const alt=s.altitude;for(let i=0;i<120;i++)advance(s,{},1/120);
 assert.ok(Math.abs(s.normal.dot(s.forward))<1e-9);assert.ok(Math.abs(s.altitude-alt)<.5);assert.ok(Math.abs(s.speed-CRUISE_SPEED)<.5);
});
