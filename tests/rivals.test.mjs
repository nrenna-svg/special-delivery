import test from 'node:test';import assert from 'node:assert/strict';
import {Vector3} from '../dist/vendor/three.core.js';
import {RIVALS,RIVAL_ORDER,rivalForTier,paceFor,fumbleChance,steer,remaining} from '../dist/rivals.js';
import {jobBoard,makeJob,settle} from '../dist/career.js';
import {RADIUS} from '../dist/flight.js';
const arc=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.dot(b))))*RADIUS;

test('three red rival companies with banter for every moment',()=>{assert.equal(RIVAL_ORDER.length,3);for(const id of RIVAL_ORDER){const r=RIVALS[id];assert.match(r.color,/^#[a-f0-9]{6}$/);const c=parseInt(r.color.slice(1,3),16);assert.ok(c>150,'red');
 for(const k of ['start','lead','behind','theirs','yours','fumble','wake','win','lose'])assert.ok(r.lines[k]?.length>0,`${id} ${k}`);}
 assert.ok(RIVALS.gull.speed<RIVALS.blackwing.speed&&RIVALS.blackwing.speed<RIVALS.baroness.speed);});
test('easier rivals on calmer islands; no races on DEADLY contracts',()=>{assert.equal(rivalForTier(0),'gull');assert.equal(rivalForTier(3),'baroness');
 let races=0;for(let s=1;s<80;s++)for(const j of jobBoard(s)){if(j.race){races++;assert.ok(j.tier<=2);assert.ok(['parcels','urgent'].includes(j.type));}}assert.ok(races>20);});
test('rubber band: a rival far ahead eases off, far behind pushes, and fumbles more when comfortable',()=>{assert.ok(paceFor(200)<1);assert.ok(paceFor(-200)>1);assert.equal(paceFor(0),1);assert.ok(fumbleChance(RIVALS.gull,100)>fumbleChance(RIVALS.gull,0));});
test('a rival plane steers onto its target honestly (no teleporting)',()=>{const s={normal:new Vector3(0,1,0),forward:new Vector3(0,0,-1),speed:16,altitude:16,bank:0},t=new Vector3(1,.3,.2).normalize();
 let prev=s.normal.clone(),best=Infinity;for(let i=0;i<60*60;i++){steer(s,t,1/60,1,22,18);assert.ok(arc(prev,s.normal)<.6);prev.copy(s.normal);best=Math.min(best,arc(s.normal,t));}assert.ok(best<5,'reached '+best);});
test('race pay: winning adds a 30% purse, losing pays only your own stops',()=>{const j=makeJob(5,{type:'parcels',island:'EASTERN WILDS'});const won=settle(j,{earned:500,done:3,crashes:0,landing:null,race:{won:true,mine:3,theirs:1,company:'Gull & Sons'}});
 assert.ok(won.lines.some(l=>l.label.startsWith('Race won')&&l.amount===Math.round(j.pay*.3)));const lost=settle(j,{earned:200,done:1,crashes:0,landing:null,race:{won:false,mine:1,theirs:3,company:'Gull & Sons'}});assert.equal(lost.total,200);});
test('remaining route shrinks as stops are claimed',()=>{const a=new Vector3(0,1,0),stops=[{normal:new Vector3(.3,1,0).normalize(),done:false},{normal:new Vector3(-.3,1,0).normalize(),done:false}];const before=remaining(a,stops);stops[0].done=true;assert.ok(remaining(a,stops)<before);});
