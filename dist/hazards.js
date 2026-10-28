// Ground, water and obstacle checks for crashes and the PULL UP warning. Pure functions.
// Altitudes are in world units above sea level (the HUD shows x10 as meters).
import {Vector3} from './vendor/three.core.js';
import {RADIUS} from './flight.js';
import {ISLANDS,GROUND} from './days.js';
import {DESERT} from './worlds.js';

export const WATER_FLOOR=.6, BEACH_FLOOR=.9, LAND_FLOOR=3.0, WARN_CLEARANCE=3.5;
const centers=ISLANDS.map(i=>({...i,c:new Vector3(...i.n).normalize()}));
const arc=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.dot(b))))*RADIUS;
// Island under a point (or null), and how far in from its edge it is (0 = center, 1 = rim).
export function landAt(normal){for(const i of centers){const r=arc(normal,i.c)/i.size;if(r<1)return {island:i.label,r,h:i.h||0};}return null;}
// Lowest safe altitude here: interior land (hills, trees, roofs), beaches, or water.
// Mesa profile (v0.74, Mesa Rojo): flat top out to r=.74, cliff down to the sand by r=.9.
export function mesaHeight(h,r){return r<.74?h:r<.9?h-(h-.25)*(r-.74)/.16:.25;}
export function floorAt(normal){const l=landAt(normal);if(!l)return WATER_FLOOR;if(l.h)return Math.max(BEACH_FLOOR,mesaHeight(l.h,l.r)+1);return l.r<.82?LAND_FLOOR:BEACH_FLOOR;}
// Where cargo, pads and crates rest: GROUND on Kestrel and the desert floor, the mesa top on a mesa.
export function groundHeight(normal){const l=landAt(normal);return l&&l.h?Math.max(GROUND,mesaHeight(l.h,l.r)):GROUND;}
// obstacles: [{normal, top, radius, name}] vertical columns (towers, masts).
export function obstacleHit(normal,altitude,obstacles){for(const o of obstacles){if(altitude<o.top&&arc(normal,o.normal)<o.radius)return o;}return null;}
export function terrainCheck(normal,altitude,obstacles=[]){
 const floor=floorAt(normal),hit=obstacleHit(normal,altitude,obstacles),clearance=altitude-floor;
 const what=hit?hit.name:altitude<=floor?(floor===WATER_FLOOR?(DESERT?'the desert floor':'the sea'):floor===BEACH_FLOOR?(DESERT?'the sand':'the beach'):(DESERT?'a mesa':'the hillside')):null;
 return {floor,clearance,crash:!!what,what,warn:!what&&clearance<WARN_CLEARANCE};
}
// Kestrel lighthouse: striped tower next to the Lighthouse supplies stop.
export const LIGHTHOUSE={normal:new Vector3(.12,1,-.1125).normalize(),top:8.6,radius:1.7,name:DESERT?'the water tower':'the lighthouse'};
// Respawn point: a recorded safe position from a few seconds before the crash.
export function pickRespawn(crumbs,secondsBack=5,interval=.5){if(!crumbs.length)return null;return crumbs[Math.max(0,crumbs.length-1-Math.round(secondsBack/interval))];}
