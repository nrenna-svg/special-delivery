// Plane upgrades and pilot ranks (v0.74). Pure logic, no rendering.
// Each part must first be unlocked (a one-time fee, and a minimum pilot rank), then it can be
// upgraded through 5 levels. Every level improves the part only a little, and each level costs
// about twice the last, so a maxed part is a big investment for a ~20-25% gain.

export const RANKS=[
 {name:'ROOKIE',jobs:0,earned:0},
 {name:'COURIER',jobs:3,earned:2500},
 {name:'SENIOR COURIER',jobs:10,earned:15000},
 {name:'ACE',jobs:25,earned:60000},
 {name:'LEGEND',jobs:50,earned:200000}
];
export function rankOf(c){let r=0;RANKS.forEach((k,i)=>{if((c.jobsDone||0)>=k.jobs&&(c.earned||0)>=k.earned)r=i;});return r;}
export function nextRank(c){const r=rankOf(c);return r+1<RANKS.length?{...RANKS[r+1],index:r+1}:null;}

export const MAX_LEVEL=5;
// per: what one level changes (added to the base value of each stat). base: level-1 price.
export const PARTS=[
 {id:'engine',name:'Engine',icon:'⚙',rank:0,unlock:0,base:1500,blurb:'More power: higher cruise speed and quicker acceleration.',
  per:{speed:.05,accel:.08},show:[['speed','Top speed',v=>`${Math.round(36*v*3)} kt`]]},
 {id:'fuel',name:'Fuel tank',icon:'⛽',rank:0,unlock:0,base:1200,blurb:'A bigger tank. Every level adds about 10% more flying time.',
  per:{tank:.1},show:[['tank','Flying time',v=>`${(6*v).toFixed(1)} min`]]},
 {id:'cargo',name:'Cargo hold',icon:'📦',rank:0,unlock:0,base:900,blurb:'One more spare parcel aboard per level, for when a drop goes wrong.',
  per:{spares:1},show:[['spares','Spare parcels',v=>`+${v}`]]},
 {id:'wings',name:'Wings',icon:'🪽',rank:1,unlock:3000,base:1800,blurb:'More lift: faster climbs, a higher ceiling, and you can fly slower before sinking.',
  per:{climb:.06,ceiling:4,slow:-.6},show:[['climb','Climb rate',v=>`${Math.round(v*100)}%`],['slow','Sinks below',v=>`${Math.round(v*3)} kt`]]},
 {id:'ailerons',name:'Ailerons',icon:'↻',rank:1,unlock:3000,base:1800,blurb:'Sharper turns, snappier banking and quicker barrel rolls.',
  per:{turn:.06,bank:.1,roll:-.06},show:[['turn','Turn rate',v=>`${Math.round(v*100)}%`]]},
 {id:'chutes',name:'Parachutes',icon:'🪂',rank:1,unlock:3000,base:1600,blurb:'Chutes open sooner, drift less in wind and land softer, so you can drop lower.',
  per:{chute:-.08,drift:-.08,soft:.35},show:[['chute','Chute opens after',v=>`${v.toFixed(2)} s`],['drift','Wind drift',v=>`${Math.round(v*100)}%`]]},
 {id:'winch',name:'Winch & hook',icon:'🪝',rank:2,unlock:10000,base:2500,blurb:'A longer, faster line and a wider hook, for crates and mailbags.',
  per:{line:1.5,reel:.8,grab:.25},show:[['line','Line length',v=>`${Math.round(v*10)} m`],['grab','Hook reach',v=>`${v.toFixed(2)}`]]},
 {id:'gear',name:'Landing gear & brakes',icon:'🛞',rank:2,unlock:10000,base:2500,blurb:'Tougher gear survives harder, faster touchdowns, and stronger brakes stop you sooner.',
  per:{sink:.25,landSpeed:1,brake:.6},show:[['sink','Max sink',v=>`${Math.round(v*10)} m/s`],['brake','Braking',v=>`${Math.round(v/4.5*100)}%`]]}
];
export const PART=Object.fromEntries(PARTS.map(p=>[p.id,p]));
// Base stats of the stock plane (multipliers are 1).
export const BASE={speed:1,accel:1,tank:1,spares:0,climb:1,ceiling:90,slow:16,turn:1,bank:1,roll:1,chute:1,drift:1,soft:5.5,line:14,reel:5,grab:2.6,sink:2.6,landSpeed:24,brake:4.5};

export function levelCost(part,level){return Math.round(part.base*Math.pow(2.05,level-1)/50)*50;}// price of reaching `level`
export function newParts(){return Object.fromEntries(PARTS.map(p=>[p.id,{unlocked:p.unlock===0,level:0}]));}
export function partState(c,id){return (c.parts&&c.parts[id])||{unlocked:PART[id].unlock===0,level:0};}
// What the next action on a part is: {kind:'unlock'|'upgrade'|'max'|'rank', cost, ok, why}
export function nextAction(c,id){const p=PART[id],st=partState(c,id),rank=rankOf(c);
 if(!st.unlocked){if(rank<p.rank)return {kind:'rank',cost:p.unlock,ok:false,why:`Needs ${RANKS[p.rank].name} rank`};return {kind:'unlock',cost:p.unlock,ok:c.cash>=p.unlock,why:c.cash>=p.unlock?'':'Not enough cash'};}
 if(st.level>=MAX_LEVEL)return {kind:'max',cost:0,ok:false,why:'Fully upgraded'};
 const cost=levelCost(p,st.level+1);return {kind:'upgrade',cost,ok:c.cash>=cost,why:c.cash>=cost?'':'Not enough cash'};}
export function buy(c,id){const a=nextAction(c,id);if(!a.ok)return false;c.parts=c.parts||newParts();const st=c.parts[id]=c.parts[id]||{unlocked:false,level:0};
 c.cash-=a.cost;c.spent=(c.spent||0)+a.cost;if(a.kind==='unlock')st.unlocked=true;else st.level++;return true;}
// The plane's stats for a set of part levels.
export function stats(c){const s={...BASE};for(const p of PARTS){const lv=partState(c,p.id).level;for(const [k,v] of Object.entries(p.per))s[k]+=v*lv;}
 s.chute=Math.max(.5,s.chute);s.drift=Math.max(.5,s.drift);s.roll=Math.max(.6,s.roll);return s;}
export function statAfter(c,id,lv){const copy={...c,parts:{...(c.parts||newParts()),[id]:{...partState(c,id),level:lv}}};return stats(copy);}
