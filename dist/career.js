// Career mode (v0.70): the hangar job board. Pure logic, no rendering.
// Every island has a danger tier. Harder islands pay far more, but the risk of a crash grows with
// them, and on the DEADLY islands a crash ends the whole career run.
// Jobs come in several types: parcel runs, hook-line crate hauls, mailbag pickups, urgent
// medicine and boat supply drops. The board offers four jobs at a time and refreshes after each flight.
import {Vector3} from './vendor/three.core.js';
import {RADIUS} from './flight.js';
import {ISLANDS,islandPoint,islandNormal,buildFeatures,homeStart} from './days.js';
import {offsetNormal,slerpNormal} from './challenges.js';
import {landAt} from './hazards.js';
import {newParts} from './upgrades.js';
import {cargoFor} from './cargo.js';
import {WORLD,DESERT} from './worlds.js';

export const TIERS=[
 {name:'CALM',color:'#7ed99a',mult:1,repair:120,crash:'repair',risk:'A crash costs repairs.'},
 {name:'BREEZY',color:'#f1d46f',mult:1.7,repair:220,crash:'repair',risk:'Wind and gulls. A crash costs repairs.'},
 {name:'ROUGH',color:'#ff9a5c',mult:2.6,repair:380,crash:'fail',risk:'Storms and waterspouts. A crash fails the job.'},
 {name:'DEADLY',color:'#ff5f6d',mult:4,repair:0,crash:'career',risk:'A crash here ends your career.'}
];
// Tier by island: roughly farther from home = harder, and the far side of the planet is deadly.
const KESTREL_TIER={'THE HOMEWARD ISLES':0,'THE EMERALD REACH':0,'WESTERN REACH':0,'EASTERN WILDS':1,'LIGHTHOUSE COAST':1,
 'CORAL KEYS':2,'SOUTHERN ATOLLS':2,'ORCHID ISLE':2,'PUFFIN ROCKS':3,'SUNSET ARCHIPELAGO':3};
const MESA_TIER={'COPPER MESA':0,'TWIN BUTTES':0,'SAGEBRUSH TABLE':0,'RATTLESNAKE RIDGE':1,'BONE CANYON':1,'SUNSPIRE':2,'RED ROCK ARCH':2,'VULTURE PEAK':2,"DEVIL'S ANVIL":3,'THE FURNACE':3};
export const ISLAND_TIER=DESERT?MESA_TIER:KESTREL_TIER;
export const JOB_ISLANDS=Object.keys(ISLAND_TIER);
const HOME=new Vector3(0,1,0);
const arc=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.dot(b))))*RADIUS;
export function islandDistance(label){return Math.round(arc(HOME,islandNormal(label)));}

// Fixed delivery sites on each island (kept clear of trees and houses by game.js).
function rng(seed){let s=seed>>>0||1;return ()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
export const SITES={};
for(const label of JOB_ISLANDS){const isl=ISLANDS.find(i=>i.label===label),r=rng(label.length*7919+label.charCodeAt(4)*31),pts=[];
 for(let k=0;k<200&&pts.length<6;k++){const a=r()*Math.PI*2,d=isl.size*(.1+r()*.46),x=Math.cos(a)*d,z=Math.sin(a)*d;
  if(pts.every(p=>Math.hypot(p.x-x,p.z-z)>12))pts.push({x:Math.round(x*10)/10,z:Math.round(z*10)/10});}
 SITES[label]=pts.map(p=>({...p,normal:islandPoint(label,p.x,p.z)}));}
export function allSiteNormals(){return Object.values(SITES).flatMap(s=>s.map(p=>p.normal));}

const PLACES=['Harbor master','Lighthouse keeper','Village school','Island clinic','Fish market','Observatory','Goat farm','Research hut','Ranger post','Hilltop chapel','Seaside inn','Boatyard','Weather station','Tea house','Pottery studio','Radio shack'];
const GOODS=['Spare parts','Fresh bread','Medicine','Seed packets','Letters','Lamp oil','Fishing nets','Paint','Books','Tools','Coffee beans','Batteries'];
const CRATES=['Generator','Water pump','Piano','Beehive','Telescope','Outboard motor'];
export const CRATE_WEIGHTS=['','LIGHT','MEDIUM','HEAVY','VERY HEAVY','MASSIVE'];
const COLORS=['#f4ad68','#f1d46f','#b6d674','#bdb0eb','#7edbd3','#f29bb0'];
export const JOB_TYPES={
 parcels:{label:'PARCEL RUN',base:120,icon:'📦',how:'Drop each parcel on its pad. Space releases, the chute opens after a second.'},
 crate:{label:'CRATE HAUL',base:420,icon:'🪝',how:'Lower the hook (scroll down), sweep it through the crate’s lifting ring, then drop the crate on the pad.'},
 mail:{label:'MAIL PICKUP',base:130,icon:'✉',how:'Snag every mailbag off its striped mast with the hook line, then bring the mail home.'},
 urgent:{label:'URGENT MEDICINE',base:330,icon:'✚',how:'One parcel, against the clock. Late still pays, but the rush bonus is gone.'},
 boat:{label:'BOAT SUPPLY',base:300,icon:'⛴',how:'Drop onto a moving boat: aim at the green DROP HERE ring ahead of it.'}
};
const pick=(r,a)=>a[Math.floor(r()*a.length)];
const shuffle=(r,a)=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};

// A circling boat off an island's coast, on open water for its whole loop.
function boatLoop(label,r){const isl=ISLANDS.find(i=>i.label===label),c=islandNormal(label);
 for(let k=0;k<24;k++){const a=r()*Math.PI*2,d=isl.size+26,center=offsetNormal(c,Math.cos(a)*d,Math.sin(a)*d),radius=13;let ok=true;
  for(let t=0;t<16&&ok;t++){const q=offsetNormal(center,Math.cos(t/16*Math.PI*2)*(radius+8),Math.sin(t/16*Math.PI*2)*(radius+8));if(landAt(q))ok=false;}
  if(ok)return {center,radius,period:90,phase:r()*6,dir:r()<.5?1:-1};}
 return null;}

function features(tier,r){const a=r()*Math.PI*2,dir=[Math.cos(a),0,Math.sin(a)];
 return [{},{wind:{dir,speed:4,gust:.25},birds:{count:1}},{wind:{dir,speed:6,gust:.35},birds:{count:2},storms:1,spouts:true},{wind:{dir,speed:8,gust:.45},birds:{count:3},storms:2,spouts:true}][tier];}

// One job. seed makes it repeatable; type and island may be forced.
export function makeJob(seed,{type,island}={}){
 const r=rng(seed);island=island||pick(r,JOB_ISLANDS);const tier=ISLAND_TIER[island];
 type=type||pick(r,DESERT?['parcels','parcels','crate','crate','mail','urgent']:['parcels','parcels','crate','mail','urgent','boat']);if(DESERT&&type==='boat')type='parcels';// no boats in the desert
 const sites=shuffle(r,SITES[island]),stops=[],mail=[],crates=[];let units=1,title='',parcels=0;
 // Hard jobs (v0.80) spread over 2 (ROUGH) or 3 (DEADLY) islands, chosen among the other risky islands nearest the main one.
 const c0=islandNormal(island),extra=tier>=2?JOB_ISLANDS.filter(l=>l!==island&&ISLAND_TIER[l]>=1).sort((a,b)=>arc(c0,islandNormal(a))-arc(c0,islandNormal(b))).slice(0,tier-1):[];
 const isles=[island,...extra],siteOf=Object.fromEntries(isles.map(l=>[l,l===island?sites:shuffle(r,SITES[l])])),used=Object.fromEntries(isles.map(l=>[l,0]));
 // Out of prepared sites on a small island: a spot on a ring around its middle, still on land.
 const take=l=>{const k=used[l]++,list=siteOf[l];if(k<list.length)return list[k];const isl=ISLANDS.find(i=>i.label===l),a=k*2.4+1;return {normal:islandPoint(l,Math.cos(a)*isl.size*.5,Math.sin(a)*isl.size*.5)};};
 const place=()=>pick(r,PLACES);
 if(type==='parcels'){const n=Math.max(isles.length*2,Math.min(sites.length,2+Math.floor(r()*3)));for(let i=0;i<n;i++){const l=isles[i%isles.length];stops.push({name:place(),goods:pick(r,GOODS),normal:take(l).normal,island:l});}units=n;parcels=n+2;title=`${n} parcels`;}
 else if(type==='urgent'){stops.push({name:pick(r,['Island clinic','Field hospital','Ranger post','Lighthouse keeper']),goods:'Medicine',normal:take(island).normal,island,urgent:{seconds:0}});for(const l of extra)stops.push({name:pick(r,['Field hospital','Ranger post','Rescue hut']),goods:'Medicine',normal:take(l).normal,island:l});units=stops.length;parcels=units+1;title=units>1?`Medicine × ${units}`:'Medicine, fast';}
 else if(type==='boat'){const m=boatLoop(island,r);if(!m)return makeJob(seed+1,{type:'parcels',island});
  stops.push({name:pick(r,['Ferry Gull','Trawler Marlin','Research ship Petrel','Tug Bramble']),goods:pick(r,GOODS),motion:m,normal:null,island:null});
  const dockIsle=extra[0]||island;stops.push({name:place(),goods:pick(r,GOODS),normal:take(dockIsle).normal,island:dockIsle});units=2;parcels=4;title='Boat + dock';}
 else if(type==='mail'){const n=Math.max(isles.length,2+Math.floor(r()*2));for(let i=0;i<n;i++){const l=isles[i%isles.length];mail.push({normal:take(l).normal,island:l});}units=n;title=`${n} mailbags`;}
 else if(type==='crate'){// Pick the crate up here and deliver it (on a hard job, to the next island over).
  // Weight 1-5 (v0.80): the winch's lifting strength must be at least the crate's weight.
  const weight=Math.min(5,1+tier+Math.floor(r()*2)),to=extra[0]||island;
  crates.push({normal:take(island).normal,island,goods:pick(r,CRATES),weight});stops.push({name:place(),goods:crates[0].goods,normal:take(to).normal,island:to,kind:'crate'});title=`${crates[0].goods} · ${CRATE_WEIGHTS[weight]}`;}
 const weight=crates[0]?.weight||0,dist=islandDistance(island),pay=Math.round(JOB_TYPES[type].base*(type==='parcels'||type==='mail'||type==='urgent'?units:1)*TIERS[tier].mult*WORLD.payMult*(1+dist/700)*(1+.35*extra.length)*(weight?1+(weight-1)*.18:1)/10)*10;
 // Air defences on every island of a hard job: ROUGH 1 SAM each; DEADLY 2 SAMs and a flak gun each.
 const sams=[],flak=[];for(const l of tier>=2?isles:[]){for(let k=0;k<(tier>=3?2:1);k++)sams.push({normal:take(l).normal,island:l,reload:tier>=3?4.5:7});if(tier>=3)flak.push({normal:take(l).normal,island:l});}
 const cargo=cargoFor(seed,type);if(type!=='mail'&&type!=='urgent'){const goods={fragile:'Cakes & ceramics',heavy:'Machinery',live:'Live chickens'}[cargo];for(const s of stops)s.goods=goods;for(const c of crates)c.goods=goods;if(type==='crate')title=goods+' · '+CRATE_WEIGHTS[weight];}
 const stopSpecs=stops.map((s,i)=>({...s,color:COLORS[i%COLORS.length]}));
 // Urgent timer: the straight-line flight there at cruise, plus a margin.
 for(const s of stopSpecs)if(s.urgent)s.urgent.seconds=Math.round(dist/18*1.6+45);// includes turning around after takeoff
 return {cargo:cargoFor(seed,type),id:seed,type,island,tier,title,pay,units,parcels,stops:stopSpecs,mail,crates,dist,islands:isles,sams,flak,weight,hook:type==='crate'||type==='mail',typeLabel:JOB_TYPES[type].label,how:JOB_TYPES[type].how,recipe:features(tier,r)};
}
// Stop specs ready for newRoute() (boats get their t=0 position) and the resolved challenge features.
export function jobRoute(job){
 const stops=job.stops.map(s=>({...s,normal:s.motion?offsetNormal(s.motion.center,Math.cos(s.motion.phase)*s.motion.radius,Math.sin(s.motion.phase)*s.motion.radius):s.normal.clone()}));
 const anchor=stops.length?stops:job.mail.length?job.mail.map(m=>({normal:m.normal})):job.crates.map(c=>({normal:c.normal}));
 const f=buildFeatures(anchor,job.recipe);f.mail=job.mail.map((m,i)=>({normal:m.normal.clone(),island:m.island,id:i,taken:false}));
 // Storm cells sit across the flight out, so ROUGH and DEADLY jobs make you fly around them.
 const want=job.recipe.storms||0,target=anchor[0].normal,from=homeStart();
 for(let k=f.storms.length;k<want;k++)f.storms.push({center:slerpNormal(from,target,[.62,.84][k]??.7),radius:20,id:k});
 f.crates=job.crates.map((c,i)=>({normal:c.normal.clone(),island:c.island,goods:c.goods,weight:c.weight||1,id:i,taken:false}));f.fuel=[];
 f.sams=(job.sams||[]).map(s=>({...s,normal:s.normal.clone()}));f.flak=(job.flak||[]).map(s=>({...s,normal:s.normal.clone()}));
 return {stops,features:f};
}
// Rough flight distance for a job (v0.82): home → pickups/drops in nearest-first order → home, in world units.
export function routeLength(job){const r=jobRoute(job),HOME=homeStart();let pts=[...r.stops.map(s=>s.normal),...r.features.mail.map(m=>m.normal)];let cur=HOME,len=0;
 if(r.features.crates.length){len+=arc(cur,r.features.crates[0].normal);cur=r.features.crates[0].normal;}
 while(pts.length){pts.sort((a,b)=>arc(cur,a)-arc(cur,b));len+=arc(cur,pts[0]);cur=pts.shift();}return len+arc(cur,HOME);}
// The board: four jobs, at least one CALM, at most one DEADLY, no two alike.
export function jobBoard(seed){const r=rng(seed),jobs=[];let tries=0;
 while(jobs.length<4&&tries++<80){const j=makeJob(Math.floor(r()*1e9));
  if(jobs.some(o=>o.island===j.island&&o.type===j.type))continue;
  if(j.tier===3&&jobs.some(o=>o.tier===3))continue;
  if(jobs.length===3&&!jobs.some(o=>o.tier===0)&&j.tier!==0)continue;
  jobs.push(j);}
 return jobs.sort((a,b)=>a.tier-b.tier||a.pay-b.pay);}

// ── Pay ──────────────────────────────────────────────────────────────────────────────────
// Each objective pays an equal share of the job. Drops pay more for accuracy and cargo condition.
export function objectivePay(job,{accuracy=100,condition=100,onTime=null}={}){
 const unit=job.pay/job.units;let p=unit*(.75+.25*accuracy/100)*(.6+.4*condition/100);if(onTime)p*=1.4;return Math.round(p);}
// Ledger at the end of a flight. earned: objective pay so far; landing: {bonus} fraction or null (auto ring).
export function settle(job,{earned,done,crashes,landing,failed=false}){
 const lines=[{label:'Job pay',amount:earned}];
 if(!failed&&done>=job.units)lines.push({label:'Job complete bonus',amount:Math.round(job.pay*.15)});
 if(landing?.bonus&&earned>0)lines.push({label:`${landing.label} (manual landing)`,amount:Math.round((earned+(done>=job.units?job.pay*.15:0))*landing.bonus)});
 if(crashes)lines.push({label:`Repairs ×${crashes}`,amount:-crashes*TIERS[job.tier].repair});
 return {lines,total:lines.reduce((s,l)=>s+l.amount,0)};}

// ── Saved career ─────────────────────────────────────────────────────────────────────────
const KEY='special-delivery-career';
export function newCareer(){return {cash:0,flights:0,jobsDone:0,earned:0,spent:0,alive:true,boardSeed:Math.floor(Math.random()*1e9),started:Date.now(),parts:newParts(),worlds:['kestrel']};}
export function loadCareer(){try{const c=JSON.parse(localStorage.getItem(KEY));if(c&&typeof c.cash==='number')return {...newCareer(),...c};}catch{}return newCareer();}
export function saveCareer(c){try{localStorage.setItem(KEY,JSON.stringify(c));}catch{}return c;}
export function loadBestCareer(){try{return JSON.parse(localStorage.getItem(KEY+'-best'))||null;}catch{return null;}}
export function saveBestCareer(c){const best=loadBestCareer();if(!best||c.earned>best.earned){try{localStorage.setItem(KEY+'-best',JSON.stringify({earned:c.earned,jobsDone:c.jobsDone,flights:c.flights}));}catch{}return true;}return false;}
export const money=n=>(n<0?'−$':'$')+Math.abs(Math.round(n)).toLocaleString('en-US');
