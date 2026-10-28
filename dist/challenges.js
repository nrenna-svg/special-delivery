// Pure logic for the per-day challenges (no rendering): sky ring courses, wind, moving boat
// stops, urgent parcels, bird flocks, storm cells and the sunset-to-night sky. All positions are
// unit "normals" on the planet plus an altitude, like the rest of the game.
import {Vector3,Quaternion} from './vendor/three.core.js';
import {RADIUS} from './flight.js';
import {DESERT} from './worlds.js';

const UP=new Vector3(0,1,0);
const arcUnits=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.dot(b))))*RADIUS;
export function toNormal(v){return Array.isArray(v)?new Vector3(...v).normalize():v.clone().normalize();}
// Point (x,z) world units from a center direction, in that center's surface frame (same frame as islandPoint).
export function offsetNormal(center,x,z,out=new Vector3()){return out.set(x,RADIUS,z).normalize().applyQuaternion(new Quaternion().setFromUnitVectors(UP,center));}
// Spherical interpolation between two unit vectors.
export function slerpNormal(a,b,u,out=new Vector3()){const d=Math.max(-1,Math.min(1,a.dot(b))),w=Math.acos(d);if(w<1e-6)return out.copy(a);const s=Math.sin(w);return out.copy(a).multiplyScalar(Math.sin((1-u)*w)/s).addScaledVector(b,Math.sin(u*w)/s).normalize();}

// ── Sky rings ────────────────────────────────────────────────────────────────
// Rings every `spacing` units along the great-circle legs start→stop1→stop2…, kept clear of pads.
export function ringCourse(points,{spacing=22,clear=15,base=21,swing=5}={}){
 const rings=[];let k=0;
 for(let i=0;i+1<points.length;i++){const a=points[i],b=points[i+1],len=arcUnits(a,b);
  for(let d=clear;d<=len-clear;d+=spacing){const n=slerpNormal(a,b,d/len);const ahead=slerpNormal(a,b,Math.min(1,(d+1)/len));
   rings.push({normal:n,altitude:base+swing*Math.sin(k*.9),facing:ahead.sub(n).normalize(),taken:false,id:k++});}}
 return rings;
}
export const RING_RADIUS=3.6, RING_POINTS=25, STREAK_WINDOW=9;
// Plane position (world) inside a ring's sphere of capture?
export function ringHit(ring,planeWorld){return ring.normal.clone().multiplyScalar(RADIUS+ring.altitude).distanceTo(planeWorld)<RING_RADIUS;}
// Points for the nth ring in a streak (1-based): 25, 50, 75, capped at x4.
export function ringScore(streak){return RING_POINTS*Math.min(4,streak);}

// ── Wind ─────────────────────────────────────────────────────────────────────
// A steady world-space wind direction, flattened onto the local surface at each point.
export function windAt(wind,normal,time=0,out=new Vector3()){
 if(!wind)return out.set(0,0,0);
 const gust=1+(wind.gust||0)*Math.sin(time*.23+1.3)*Math.sin(time*.07);
 out.copy(wind.dir).addScaledVector(normal,-wind.dir.dot(normal));
 const l=out.length();return l<1e-6?out.set(0,0,0):out.multiplyScalar(wind.speed*gust/l);
}

// ── Moving stops (boats) ─────────────────────────────────────────────────────
// motion: {center:Vector3 normal, radius units, period seconds, phase radians, dir ±1}
export function boatNormal(m,t,out=new Vector3()){const a=m.phase+m.dir*t/m.period*Math.PI*2;return offsetNormal(m.center,Math.cos(a)*m.radius,Math.sin(a)*m.radius,out);}
export function boatHeading(m,t){const a=boatNormal(m,t),b=boatNormal(m,t+.1);return b.sub(a).addScaledVector(a,-0).normalize();}
// Where a stop is at time t: boats move, everything else is fixed.
export function stopNormalAt(stop,t){return stop.motion?boatNormal(stop.motion,t):stop.normal;}

// ── Urgent parcels ───────────────────────────────────────────────────────────
export const URGENT_BONUS=150;
export function urgentLeft(urgent,elapsed){return Math.max(0,urgent.seconds-elapsed);}
export function formatClock(s){s=Math.ceil(s);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;}

// ── Birds ────────────────────────────────────────────────────────────────────
// flock: {center normal, radius, altitude, period, phase, count}. Birds fly a loose V around a circling leader.
export function flockBirds(f,t){
 const a=f.phase+t/f.period*Math.PI*2,lead=offsetNormal(f.center,Math.cos(a)*f.radius,Math.sin(a)*f.radius);
 const next=offsetNormal(f.center,Math.cos(a+.05)*f.radius,Math.sin(a+.05)*f.radius),fwd=next.clone().sub(lead).normalize(),side=new Vector3().crossVectors(fwd,lead).normalize();
 const out=[];for(let i=0;i<f.count;i++){const row=Math.ceil(i/2),s=i===0?0:(i%2?1:-1);
  const n=lead.clone().addScaledVector(fwd,-row*2.2/RADIUS).addScaledVector(side,s*row*2.0/RADIUS).normalize();
  out.push({normal:n,altitude:f.altitude+Math.sin(t*2.3+i)*.6,forward:fwd});}
 return out;
}
export const BIRD_HIT=2.6, BIRD_DAMAGE=12;

// ── Storms ───────────────────────────────────────────────────────────────────
// storm: {center normal, radius}. 0 outside, rising to 1 at the core.
export function stormStrength(storm,normal){const d=arcUnits(storm.center,normal);return Math.max(0,Math.min(1,(storm.radius-d)/(storm.radius*.6)));}

// ── Sunset to night ──────────────────────────────────────────────────────────
const SKY=[
 {u:0,bg:DESERT?[.95,.76,.55]:[.514,.741,.804],sun:3.1,sunColor:DESERT?[1,.9,.72]:[1,.95,.77],hemi:2.5,glow:0,stars:0},
 {u:.45,bg:[.95,.64,.44],sun:2.2,sunColor:[1,.7,.45],hemi:1.9,glow:.15,stars:0},
 {u:.72,bg:[.24,.26,.45],sun:.9,sunColor:[.9,.6,.7],hemi:1.1,glow:.6,stars:.5},
 {u:1,bg:[.05,.08,.19],sun:.35,sunColor:[.62,.71,1],hemi:.6,glow:1,stars:1}
];
// u: 0 = day, 1 = night. Returns interpolated sky settings.
export function skyAt(u){u=Math.max(0,Math.min(1,u));let i=0;while(i<SKY.length-2&&u>SKY[i+1].u)i++;const a=SKY[i],b=SKY[i+1],k=(u-a.u)/(b.u-a.u);
 const mix=(x,y)=>x+(y-x)*k,mixA=(x,y)=>x.map((v,j)=>mix(v,y[j]));
 return {bg:mixA(a.bg,b.bg),sun:mix(a.sun,b.sun),sunColor:mixA(a.sunColor,b.sunColor),hemi:mix(a.hemi,b.hemi),glow:mix(a.glow,b.glow),stars:mix(a.stars,b.stars)};}

// ── Mailbag masts ────────────────────────────────────────────────────────────
export const MAIL_ALT=9.4, MAIL_HIT=3.3;
export function mailHit(mast,planeWorld){return mast.normal.clone().multiplyScalar(RADIUS+MAIL_ALT).distanceTo(planeWorld)<MAIL_HIT;}
