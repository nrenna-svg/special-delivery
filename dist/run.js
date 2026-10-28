// Endless runs: one continuous flight where each in-game day has a parcel quota that must be
// delivered before night falls. There is no landing: the next day begins in the air, fuel carries over. Each new day
// unlocks more islands, adds parcels, shortens the slack in the clock and brings in more of the
// hazards from the training days. Pure planning logic; game.js plays the plans.
import {Vector3} from './vendor/three.core.js';
import {RADIUS,fuelBurn} from './flight.js';
import {DAYS,ISLANDS,dayStops,buildFeatures,homeStart,homeGate,islandPoint} from './days.js';

const arc=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.dot(b))))*RADIUS;
const CRUISE=18, PER_STOP=14, DAWN=8;
// Every stop from the training days (all checked to sit on land), plus the two boats, no duplicates.
export const STOP_POOL=(()=>{const seen=new Set(),out=[];DAYS.forEach((d,i)=>dayStops(i).forEach((s,j)=>{if(seen.has(s.name))return;seen.add(s.name);out.push({...s,goods:d.stops[j].goods,spec:d.stops[j]});}));return out;})();
// Islands in order of distance from home: more of them unlock each day.
export const ISLAND_ORDER=[...ISLANDS].sort((a,b)=>arc(new Vector3(...a.n).normalize(),new Vector3(0,1,0))-arc(new Vector3(...b.n).normalize(),new Vector3(0,1,0))).map(i=>i.label);
const MAIL_SPOTS=DAYS.flatMap(d=>d.features?.mail||[]);
const FUEL_SPOTS=DAYS.flatMap(d=>d.features?.fuel||[]);

export function rng(seed){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};}
export const quotaFor=day=>Math.min(7,day+1);
export const fuelHoopsFor=day=>Math.max(1,Math.min(FUEL_SPOTS.length,FUEL_SPOTS.length-(day-2)));
export const TANK_SECONDS=100/fuelBurn(8/26,false);
export const unlockedIslands=day=>ISLAND_ORDER.slice(0,Math.min(ISLAND_ORDER.length,day===1?1:day*2-2));
// Share of the estimated route time added as slack; the clock gets tighter as days go on.
export const slackFor=day=>Math.max(1.32,2.3-day*.12);
const COLORS=['#f4ad68','#f1d46f','#b6d674','#bdb0eb','#7edbd3','#f29bb0','#9fc3f5'];

// Greedy route home → stops → gate, returning the ordered stops and distances.
// Greedy route from a start point through every point, nearest next. Endless runs never land, so there
// is no leg home at the end.
function order(points,start){const left=[...points],out=[];let at=start,dist=0;
 while(left.length){let bi=0,bd=Infinity;left.forEach((p,i)=>{const d=arc(at,p.normal);if(d<bd){bd=d;bi=i;}});dist+=bd;at=left[bi].normal;out.push({...left[bi],arrive:dist});left.splice(bi,1);}
 return {ordered:out,distance:dist};}

// from: where the plane is when the day starts (defaults to just after takeoff from Kestrel Field).
export function planDay(day,seed,from=null){
 from=from?from.clone().normalize():homeStart();
 const r=rng(seed*7919+day*104729),pick=a=>a[Math.floor(r()*a.length)];
 const open=new Set(unlockedIslands(day)),quota=quotaFor(day),boats=day>=7?2:day>=4?1:0;
 const land=STOP_POOL.filter(s=>!s.motion&&open.has(s.island)),boatPool=STOP_POOL.filter(s=>s.motion);
 // Pick a cluster: start from a random open island and keep adding the nearest unused stops.
 const shuffled=[...land].sort(()=>r()-.5),chosen=[];
 const anchor=day===1?land.find(s=>s.island==='KESTREL ISLAND'):pick(shuffled);chosen.push(anchor);
 const boatPicks=[...boatPool].sort(()=>r()-.5).slice(0,boats);
 while(chosen.length<quota-boatPicks.length){let best=null,bd=Infinity;for(const s of shuffled){if(chosen.includes(s)||chosen.some(c=>arc(c.normal,s.normal)<19))continue;
  const d=Math.min(...chosen.map(c=>arc(c.normal,s.normal)))*(.6+r()*.8);if(d<bd){bd=d;best=s;}}if(!best)break;chosen.push(best);}
 chosen.push(...boatPicks);
 // Hazard schedule.
 const f={night:true,dayClock:true};
 f.rings=day===1?{spacing:11,clear:9.5}:{spacing:45,clear:16};
 if(day>=2){const a=r()*Math.PI*2;f.wind={dir:[Math.cos(a),r()*.4-.2,Math.sin(a)],speed:Math.min(6,2.2+(day-2)*.7),gust:.3};}
 if(day>=3)f.birds={count:Math.min(4,day-2)};
 if(day>=4)f.spouts=true;
 if(day>=5)f.storms=Math.min(4,day-4);
 // Mailbags (from Day 5): the masts nearest today's stops.
 let mail=[];if(day>=5){const near=MAIL_SPOTS.map(m=>({m,d:Math.min(...chosen.map(s=>arc(s.normal,islandPoint(m.island,m.x,m.z))))})).sort((a,b)=>a.d-b.d);mail=near.slice(0,Math.min(3,day-4)).map(x=>x.m);f.mail=mail;}
 // Route: deliveries and mail masts in nearest-next order; only deliveries become stops.
 const {ordered:path,distance}=order([...chosen.map(s=>({...s})),...mail.map(m=>({mast:true,normal:islandPoint(m.island,m.x,m.z)}))],from);
 const ordered=path.filter(p=>!p.mast);
 // Clock: estimated flying time plus per-stop and landing overheads, with day-dependent slack.
 const estimate=distance/CRUISE+ordered.length*PER_STOP+DAWN+mail.length*10;
 const dayLength=Math.ceil(Math.max(150,estimate*slackFor(day))/10)*10;
 // Fuel hoops thin out: all on Days 1-2, then one fewer each day down to one from Day 7.
 // If the day is longer than a full tank allows, the nearest hoop to the route is always kept.
 const hoops=FUEL_SPOTS.map(h=>({h,n:islandPoint(h.island,h.x,h.z)}));const keep=fuelHoopsFor(day);
 const byRoute=[...hoops].sort((a,b)=>Math.min(...path.map(p=>arc(p.normal,a.n)))-Math.min(...path.map(p=>arc(p.normal,b.n))));
 // Fuel carries over from day to day (no landings), so the hoop nearest today's route is always kept.
 const needed=[byRoute[0]];
 const rest=hoops.filter(x=>!needed.includes(x)).sort(()=>r()-.5);f.fuel=[...needed,...rest].slice(0,keep).map(x=>x.h);
 // Urgent parcels: due a little after you could first reach them.
 const urgentCount=day>=7?2:day>=3?1:0;const urgentIdx=[...ordered.keys()].filter(i=>!ordered[i].motion).slice(0,urgentCount);
 const stops=ordered.map((s,i)=>({name:s.name,goods:s.goods,color:COLORS[i%COLORS.length],island:s.island,motion:s.motion,normal:s.normal.clone(),
  urgent:urgentIdx.includes(i)?{seconds:Math.round((s.arrive/CRUISE+i*PER_STOP)*1.5+35)}:null}));
 const features=buildFeatures(stops,f,from);
 const islands=[...new Set(stops.map(s=>s.island).filter(Boolean))];
 return {day,quota:stops.length,stops,features,dayLength,hoops:f.fuel.length,estimate:Math.round(estimate),islands,boats:boatPicks.length,mail:mail.length,
  title:`Day ${day}`,brief:`${stops.length} parcels · ${islands.map(t=>t.toLowerCase().replace(/(^|\s)\S/g,c=>c.toUpperCase())).join(', ')}${boatPicks.length?' and boats at sea':''}`,preview:previewFor(day+1)};
}
// What tomorrow brings, shown on the day-complete card.
export function previewFor(day){
 const notes={2:'Tomorrow the wind picks up. Parachutes will drift, so release upwind.',3:'Tomorrow: an urgent parcel with its own clock, and gulls on the long legs.',
  4:'Tomorrow a delivery goes to a boat under way, and waterspouts form at sea.',5:'Tomorrow storm season begins, and the post office needs a mailbag snagged.',
  6:'Tomorrow: stronger wind, more storms and more gulls. The days get tighter from here.'};
 const hoops=fuelHoopsFor(day),fuelNote=day>=3?` Only ${hoops} fuel hoop${hoops>1?'s':''} out there.`:'';
 return (notes[day]||`Tomorrow: ${quotaFor(day)} parcels, more islands and rougher weather.`)+fuelNote;
}
// 6:00 AM at the start of the day to 10:00 PM at nightfall.
export function clockText(elapsed,dayLength){const mins=360+Math.min(1,elapsed/dayLength)*960,h=Math.floor(mins/60),m=Math.floor(mins%60);return `${(h+11)%12+1}:${String(m).padStart(2,'0')} ${h<12?'AM':'PM'}`;}
export const fuelForDay=dayLength=>dayLength/(100/fuelBurn(8/26,false));
