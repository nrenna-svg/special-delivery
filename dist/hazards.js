// Ground, water and obstacle checks for crashes and the PULL UP warning. Pure functions.
// Altitudes are in world units above sea level (the HUD shows x10 as meters).
import {Vector3} from './vendor/three.core.js';
import {RADIUS} from './flight.js';
import {ISLANDS} from './days.js';

export const WATER_FLOOR=.6, BEACH_FLOOR=.9, LAND_FLOOR=3.0, WARN_CLEARANCE=3.5;
const centers=ISLANDS.map(i=>({...i,c:new Vector3(...i.n).normalize()}));
const arc=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.dot(b))))*RADIUS;
// Island under a point (or null), and how far in from its edge it is (0 = center, 1 = rim).
export function landAt(normal){for(const i of centers){const r=arc(normal,i.c)/i.size;if(r<1)return {island:i.label,r};}return null;}
// Lowest safe altitude here: interior land (hills, trees, roofs), beaches, or water.
export function floorAt(normal){const l=landAt(normal);return !l?WATER_FLOOR:l.r<.82?LAND_FLOOR:BEACH_FLOOR;}
// obstacles: [{normal, top, radius, name}] vertical columns (towers, masts).
export function obstacleHit(normal,altitude,obstacles){for(const o of obstacles){if(altitude<o.top&&arc(normal,o.normal)<o.radius)return o;}return null;}
export function terrainCheck(normal,altitude,obstacles=[]){
 const floor=floorAt(normal),hit=obstacleHit(normal,altitude,obstacles),clearance=altitude-floor;
 const what=hit?hit.name:altitude<=floor?(floor===WATER_FLOOR?'the sea':floor===BEACH_FLOOR?'the beach':'the hillside'):null;
 return {floor,clearance,crash:!!what,what,warn:!what&&clearance<WARN_CLEARANCE};
}
// Kestrel lighthouse: striped tower next to the Lighthouse supplies stop.
export const LIGHTHOUSE={normal:new Vector3(.12,1,-.1125).normalize(),top:8.6,radius:1.7,name:'the lighthouse'};
// Respawn point: a recorded safe position from a few seconds before the crash.
export function pickRespawn(crumbs,secondsBack=5,interval=.5){if(!crumbs.length)return null;return crumbs[Math.max(0,crumbs.length-1-Math.round(secondsBack/interval))];}
