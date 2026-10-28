import test from 'node:test';import assert from 'node:assert/strict';
import {PARTS,PART,RANKS,MAX_LEVEL,rankOf,nextAction,buy,stats,levelCost,newParts,BASE} from '../dist/upgrades.js';
import {newFlight,advance,fuelBurn,verticalSpeed} from '../dist/flight.js';
import {predictDrop} from '../dist/delivery.js';
import {gradeTouchdown} from '../dist/airfield.js';
const career=(o={})=>({cash:0,jobsDone:0,earned:0,parts:newParts(),...o});

test('nine parts, each with five levels whose price roughly doubles',()=>{assert.equal(PARTS.length,9);for(const p of PARTS){let prev=0;for(let l=1;l<=MAX_LEVEL;l++){const c=levelCost(p,l);assert.ok(c>prev*1.8);prev=c;}}});
test('ranks rise with jobs done AND money earned',()=>{assert.equal(rankOf({jobsDone:0,earned:0}),0);assert.equal(rankOf({jobsDone:3,earned:2500}),1);assert.equal(rankOf({jobsDone:30,earned:2500}),1);assert.equal(rankOf({jobsDone:60,earned:999999}),RANKS.length-1);});
test('locked parts need the rank, then the unlock fee, then level prices',()=>{const c=career({cash:100000});
 assert.equal(nextAction(c,'wings').kind,'rank');assert.equal(buy(c,'wings'),false);
 c.jobsDone=3;c.earned=2500;assert.equal(nextAction(c,'wings').kind,'unlock');assert.ok(buy(c,'wings'));assert.equal(c.cash,100000-PART.wings.unlock);
 assert.equal(nextAction(c,'wings').kind,'upgrade');const before=c.cash;assert.ok(buy(c,'wings'));assert.equal(before-c.cash,levelCost(PART.wings,1));
 const poor=career({cash:10});assert.equal(nextAction(poor,'engine').ok,false);assert.equal(buy(poor,'engine'),false);});
test('maxing a part is a modest gain, never a huge one',()=>{const c=career();for(const p of PARTS)c.parts[p.id]={unlocked:true,level:MAX_LEVEL};const s=stats(c);
 for(const k of ['speed','tank','climb','turn'])assert.ok(s[k]/BASE[k]>1.15&&s[k]/BASE[k]<1.55,k);assert.equal(s.spares,5);assert.ok(s.chute<1&&s.chute>=.5);});
test('engine upgrades make the plane faster, the tank makes fuel last longer',()=>{const fly=perf=>{const s=newFlight();s.perf=perf;s.throttle=1;for(let i=0;i<600;i++)advance(s,{},1/60);return s.speed;};
 const c=career();c.parts.engine={unlocked:true,level:5};assert.ok(fly(stats(c))>fly(stats(career()))*1.2);
 const t=career();t.parts.fuel={unlocked:true,level:5};assert.ok(fuelBurn(.5,false,stats(t))<fuelBurn(.5,false)*.7);});
test('parachute upgrades open sooner and let cargo survive lower drops',()=>{const c=career();c.parts.chutes={unlocked:true,level:5};const s=stats(c),f=newFlight();f.altitude=11;f.speed=18;
 assert.equal(predictDrop(f).broken,true);assert.equal(predictDrop(f,null,0,{chuteDelay:s.chute,drift:s.drift,soft:s.soft}).broken,false);});
test('landing gear upgrades survive harder touchdowns',()=>{const c=career();c.parts.gear={unlocked:true,level:5};const s=stats(c);const hard={sink:3.2,speed:14,bank:0,x:0,along:1};
 assert.equal(gradeTouchdown(hard).ok,false);assert.equal(gradeTouchdown(hard,{sink:s.sink,landSpeed:s.landSpeed}).ok,true);});
test('wing upgrades let the plane fly slower before it starts to sink',()=>{const c=career();c.parts.wings={unlocked:true,level:5};const f=newFlight();f.pitch=0;f.speed=14;const stock=-verticalSpeed(f);f.perf=stats(c);assert.ok(-verticalSpeed(f)<stock);});
test('every part, starter parts included, needs its unlock fee before the first upgrade',()=>{const c=career({cash:100000});for(const p of PARTS){assert.ok(p.unlock>0,p.id);}
 assert.equal(nextAction(c,'engine').kind,'unlock');assert.ok(buy(c,'engine'));assert.equal(c.parts.engine.level,0);assert.equal(nextAction(c,'engine').kind,'upgrade');});
