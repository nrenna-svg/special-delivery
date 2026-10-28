// Delivery days: five routes that spread from Kestrel Island across the little planet.
// Every day starts with the loading cutscene at Kestrel Field and ends with the landing there.
// Stops on other islands are given as offsets (world units) in that island's own surface frame,
// the same frame game.js uses to scatter its trees and houses.
import {Vector3,Quaternion} from './vendor/three.core.js';
import {RADIUS} from './flight.js';
import {boatNormal,ringCourse,slerpNormal,offsetNormal,toNormal} from './challenges.js';
import {HANDOFF_Z,GROUND_ALT} from './takeoff.js';
import {GATE_Z} from './landing.js';

export const ISLANDS=[
 {label:'KESTREL ISLAND',n:[0,1,-.165],size:45},
 {label:'THE EMERALD REACH',n:[.42,.42,-1],size:44},
 {label:'SOUTHERN ATOLLS',n:[-.2,-.6,-1],size:38},
 {label:'SUNSET ARCHIPELAGO',n:[.1,-1,.15],size:49},
 {label:'LIGHTHOUSE COAST',n:[-.5,-.25,1],size:40},
 {label:'THE HOMEWARD ISLES',n:[.1,.65,1],size:36},
 {label:'EASTERN WILDS',n:[1,.1,.1],size:48},
 {label:'WESTERN REACH',n:[-1,.3,-.1],size:43},
 // Added in v0.56 when the planet grew: stepping stones in the three biggest stretches of open sea.
 {label:'CORAL KEYS',n:[.489,-.362,.794],size:30},
 {label:'PUFFIN ROCKS',n:[-.770,-.632,-.093],size:27},
 {label:'ORCHID ISLE',n:[.666,-.556,-.498],size:32}
];
const COLORS=['#f4ad68','#f1d46f','#b6d674','#bdb0eb','#7edbd3','#f29bb0','#9fc3f5'];
const UP=new Vector3(0,1,0);
export function islandNormal(label){const i=ISLANDS.find(i=>i.label===label);if(!i)throw Error('Unknown island '+label);return new Vector3(...i.n).normalize();}
// Surface direction of a point (x,z) units from an island's center, in the island's frame.
export function islandPoint(label,x,z){const n=islandNormal(label);return new Vector3(x,RADIUS,z).normalize().applyQuaternion(new Quaternion().setFromUnitVectors(UP,n));}

// Kestrel stops: normal = (x,1,z) around the runway at the north pole (scaled by 0.75 in v0.56 so the
// home island keeps its original distances in world units on the bigger planet).
const K={
 bakery:{name:'The village bakery',goods:'Flour & sugar',abs:[0,-.165]},
 lighthouse:{name:'Lighthouse supplies',goods:'Lamp oil',abs:[.12,-.1125]},
 orchard:{name:'Orchard cottage',goods:'Seedlings',abs:[.0975,-.27]},
 workshop:{name:'The hilltop workshop',goods:'Tool kit',abs:[-.09,-.2775]},
 harbor:{name:'Harbor provisions',goods:'Rope & sailcloth',abs:[-.1125,-.12]}
};
export const DAYS=[
 {title:'Kestrel Morning',brief:'Five stops around home. Fly through the gold sky rings for streak bonuses.',par:390,features:{rings:{spacing:8,clear:9}},stops:[K.bakery,K.lighthouse,K.orchard,K.workshop,K.harbor]},
 {title:'The Emerald Run',brief:'A stiff breeze today. Parachutes drift downwind, so release upwind of the pad.',par:470,features:{wind:{dir:[1,0,.45],speed:5,gust:.3},fuel:[{island:'THE EMERALD REACH',x:0,z:0}]},stops:[
  K.harbor,
  {name:'Vineyard terrace',goods:'Wine barrels',island:'THE EMERALD REACH',x:-12,z:-10},
  {name:'Windmill on the ridge',goods:'Millstones',island:'THE EMERALD REACH',x:12,z:-8},
  {name:'Reach schoolhouse',goods:'Slates & chalk',island:'THE EMERALD REACH',x:10,z:12},
  {name:'Stargazer observatory',goods:'Telescope lens',island:'THE EMERALD REACH',x:-11,z:11}]},
 {title:'Atoll Hopping',brief:'Two of today\u2019s stops are boats under way, the turtle rescue needs its medicine fast, and waterspouts are forming at sea.',par:550,features:{spouts:true,fuel:[{island:'WESTERN REACH',x:0,z:-13}]},stops:[
  {name:'Puffin Rocks observatory',goods:'Bird seed',island:'PUFFIN ROCKS',x:-6,z:4},
  {name:'Turtle rescue',goods:'Medicine',island:'SOUTHERN ATOLLS',x:0,z:12,urgent:125},
  {name:'Island ferry Gull',goods:'Deck chairs',boat:{center:[-.76,-.15,-.64],radius:26,period:115,phase:0,dir:1}},
  {name:'Fishing boat Marlin',goods:'New nets',boat:{center:[-.76,-.15,-.64],radius:15,period:85,phase:2.4,dir:-1}},
  {name:'Western ferry dock',goods:'Ship\u2019s bell',island:'WESTERN REACH',x:-10,z:-5},
  {name:'Cliffside chapel',goods:'Candles',island:'WESTERN REACH',x:10,z:6}]},
 {title:'Coast to Coast',brief:'Snag three mailbags from the striped masts: scroll down to lower your hook line and sweep it through each bag. Watch for gull flocks.',par:700,features:{mail:[{island:'LIGHTHOUSE COAST',x:-1,z:-1},{island:'THE HOMEWARD ISLES',x:8,z:-10},{island:'EASTERN WILDS',x:-14,z:8}],birds:{legs:true,count:3},spouts:true,fuel:[{island:'THE HOMEWARD ISLES',x:-6,z:10},{island:'EASTERN WILDS',x:12,z:-10}]},stops:[
  {name:'Foghorn keeper',goods:'Spare foghorn',island:'LIGHTHOUSE COAST',x:-11,z:-8},
  {name:'Smokehouse',goods:'Hickory chips',island:'LIGHTHOUSE COAST',x:12,z:-6},
  {name:'Tide pool lab',goods:'Specimen jars',island:'LIGHTHOUSE COAST',x:0,z:13},
  {name:'Homeward post office',goods:'Mail sacks',island:'THE HOMEWARD ISLES',x:-9,z:-5},
  {name:'Bee farm',goods:'Honey jars',island:'THE HOMEWARD ISLES',x:9,z:6},
  {name:'Ranger station',goods:'Field radio',island:'EASTERN WILDS',x:0,z:0}]},
 {title:'Around the World',brief:'Round the planet before nightfall. Storms, gulls, wind, rings and one birthday cake that cannot be late.',par:860,features:{rings:{spacing:50,clear:16},wind:{dir:[-.5,.2,1],speed:3.5,gust:.35},birds:{legs:true,count:3},storms:true,night:true,spouts:true,fuel:[{island:'CORAL KEYS',x:0,z:0},{island:'ORCHID ISLE',x:0,z:0}]},stops:[
  {name:'Emerald market',goods:'Spices',island:'THE EMERALD REACH',x:0,z:0},
  {name:'Atoll school',goods:'Storybooks',island:'SOUTHERN ATOLLS',x:0,z:0},
  {name:'Sunset hot springs',goods:'Fresh towels',island:'SUNSET ARCHIPELAGO',x:0,z:0},
  {name:'Lighthouse museum',goods:'Old charts',island:'LIGHTHOUSE COAST',x:0,z:0},
  {name:'Western orchard',goods:'Ladders',island:'WESTERN REACH',x:0,z:0},
  {name:'Wilds base camp',goods:'Tent poles',island:'EASTERN WILDS',x:10,z:6},
  {name:'Homeward bakery',goods:'Birthday cake',island:'THE HOMEWARD ISLES',x:0,z:0,urgent:560}]}
];
// Stop specs ready for newRoute(): {name,goods,color,normal}.
export function dayStops(index){
 return DAYS[index].stops.map((s,i)=>{const motion=s.boat?{...s.boat,center:toNormal(s.boat.center)}:null;
  return {name:s.name,goods:s.goods,color:COLORS[i%COLORS.length],island:s.boat?null:(s.island||'KESTREL ISLAND'),motion,urgent:s.urgent?{seconds:s.urgent}:null,
   normal:motion?boatNormal(motion,0):s.abs?new Vector3(s.abs[0],1,s.abs[1]).normalize():islandPoint(s.island,s.x,s.z)};});
}
const homeStart=()=>{const a=HANDOFF_Z/(RADIUS+GROUND_ALT);return new Vector3(0,Math.cos(a),Math.sin(a));};
const homeGate=()=>{const a=GATE_Z/(RADIUS+GROUND_ALT);return new Vector3(0,Math.cos(a),Math.sin(a));};
// Resolved challenge layout for a day: rings, wind, mail masts, bird flocks, storm cells, night.
export function dayFeatures(index){return buildFeatures(dayStops(index),DAYS[index].features||{});}
// Resolve a feature recipe for a list of stops. f: {rings, wind, fuel:[{island,x,z}], mail:[{island,x,z}],
// birds:{count}, storms:true|count, night, spouts}. Used by the training days and by endless runs (run.js).
// from: optional start direction (endless runs start each day wherever the plane is, and never head home to land).
export function buildFeatures(stops,f={},from=null){
 const out={rings:[],wind:null,mail:[],flocks:[],storms:[],fuel:[],night:!!f.night,dayClock:!!f.dayClock,spouts:!!f.spouts};
 if(f.fuel)out.fuel=f.fuel.map((h,i)=>({normal:islandPoint(h.island,h.x,h.z),island:h.island,id:i}));
 const legs=from?[from,...stops.map(s=>s.normal)]:[homeStart(),...stops.map(s=>s.normal),homeGate()];
 if(f.rings)out.rings=ringCourse(legs,f.rings);
 if(f.wind)out.wind={dir:toNormal(f.wind.dir),speed:f.wind.speed,gust:f.wind.gust||0};
 if(f.mail)out.mail=f.mail.map((m,i)=>({normal:islandPoint(m.island,m.x,m.z),island:m.island,id:i,taken:false}));
 // Flocks and storms sit on the long legs between consecutive stops, where the player will be flying.
 const longLegs=[];for(let i=0;i+1<legs.length-1;i++){const a=legs[i],b=legs[i+1];if(Math.acos(Math.max(-1,Math.min(1,a.dot(b))))*RADIUS>60)longLegs.push([a,b]);}
 // With storms on the odd legs, gulls take the even ones so the two never share a stretch of sky.
 const birdLegs=f.storms?longLegs.filter((_,i)=>i%2===0):longLegs;
 if(f.birds)birdLegs.slice(0,f.birds.count).forEach(([a,b],i)=>{out.flocks.push({center:slerpNormal(a,b,.5+(i%2?.12:-.12)),radius:9,altitude:20+i%2*3,period:16+i*3,phase:i*1.7,count:7});});
 if(f.storms){const odd=longLegs.filter((_,i)=>i%2===1);(typeof f.storms==='number'?odd.slice(0,f.storms):odd).forEach(([a,b],i)=>out.storms.push({center:slerpNormal(a,b,.5),radius:20,id:i}));}
 return out;
}
// All pad directions across every day, so scenery can keep trees off them.
export function allPadNormals(){return DAYS.flatMap((_,i)=>dayStops(i).map(s=>s.normal));}

// Per-browser progress: highest unlocked day and best score per day (day 1 keeps the old key).
const bestKey=i=>i===0?'special-delivery-best':`special-delivery-best-d${i+1}`;
export function loadProgress(){const p={unlocked:1,best:DAYS.map(()=>0)};
 try{p.unlocked=Math.max(1,Math.min(DAYS.length,Number(localStorage.getItem('special-delivery-unlocked'))||1));DAYS.forEach((_,i)=>{p.best[i]=Number(localStorage.getItem(bestKey(i)))||0;});if(p.best[0]>0)p.unlocked=Math.max(p.unlocked,2);}catch{}
 return p;}
export function saveResult(p,index,score){p.best[index]=Math.max(p.best[index],score);p.unlocked=Math.min(DAYS.length,Math.max(p.unlocked,index+2));
 try{localStorage.setItem(bestKey(index),String(p.best[index]));localStorage.setItem('special-delivery-unlocked',String(p.unlocked));}catch{}return p;}
export {homeStart,homeGate};
