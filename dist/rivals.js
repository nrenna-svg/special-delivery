// Rival couriers (v0.92): red planes from competing companies that race you for the same deliveries.
// Whoever's parcel lands on a pad first gets that stop. Rivals fly honestly (no teleporting), with a
// light touch to keep races close: far behind, they push harder; far ahead, they ease off and are
// more likely to fumble a drop and swing round for another pass. Fly in a rival's wake and it shakes you.
// Pure logic first (testable), then createRivals() for the red planes, red parachutes and radio banter.
import {Vector3,Quaternion} from './vendor/three.core.js';
import {RADIUS} from './flight.js';

export const RIVALS={
 gull:{id:'gull',company:'Gull & Sons',pilot:'Old Mortimer Gull',model:'seaplane',speed:19.5,turn:.75,fumble:.3,color:'#c8352b',trim:'#f2ead6',
  lines:{start:['Morning, youngster. Mind the gulls. And me.','Gull & Sons has flown this route since before you had teeth.','Plenty of sky for both of us. The pay\'s another matter.'],
   lead:['Ha! Still got it.','Don\'t strain yourself back there.'],behind:['Slow and steady, slow and steady…','You\'re in a dreadful hurry.'],
   theirs:['Signed for. Gull & Sons thanks you for your patience.','That one\'s mine, lad. Experience.'],yours:['Lucky drop.','Hmph. Not bad.'],
   fumble:['Blast these old eyes. Going round again.','Wind took it! Coming about.'],wake:['Off my tail, you pest!'],win:['Gull & Sons, a hundred years on time.'],lose:['Well flown. Don\'t let it go to your head.']}},
 blackwing:{id:'blackwing',company:'Blackwing Express',pilot:'Vince "Blackwing" Vane',model:'monoplane',speed:22.5,turn:.95,fumble:.15,color:'#d92b2b',trim:'#1b1b1b',
  lines:{start:['Blackwing Express. We were never here, and we were first.','Try to keep up, Kestrel.','Hope you packed a sandwich. You\'ll be waiting a while.'],
   lead:['Is that your engine or are you pedalling?','See you at the finish. Or not.'],behind:['Enjoy it while it lasts.','Lucky tailwind, that\'s all.'],
   theirs:['Delivered. Blackwing always delivers.','Your pad? Not anymore.','Too slow, Kestrel.'],yours:['Fine. Have that one.','Cute. Won\'t happen twice.'],
   fumble:['Ugh, gust! Going around.','That didn\'t happen. Coming back.'],wake:['Enjoying my wake? Thought so.'],win:['Blackwing Express. Faster than you.'],lose:['This isn\'t over, Kestrel.']}},
 baroness:{id:'baroness',company:'The Baroness',pilot:'The Baroness',model:'triplane',speed:25,turn:1.05,fumble:.06,color:'#b8141c',trim:'#f4c542',
  lines:{start:['How quaint. A courier who thinks she can race me.','Do try not to embarrass yourself, darling.','My triplane was winning races before your hangar had walls.'],
   lead:['Mm. As expected.','You may admire the view of my tail.'],behind:['A lucky moment. They do happen.','Enjoy the lead. It is a loan.'],
   theirs:['Delivered with style, naturally.','Mine. Do keep up.'],yours:['Oh? A flicker of talent.','Hm. Irritating.'],
   fumble:['How tiresome. Again.','The parcel slipped. It happens to the best of us. Rarely.'],wake:['You\'re in my slipstream, peasant.'],win:['Victory suits me.'],lose:['…Remarkable. We shall meet again.']}}
};
export const RIVAL_ORDER=['gull','blackwing','baroness'];
// Which rival turns up for a job of this danger tier.
export function rivalForTier(tier,r=Math.random){return tier<=0?'gull':tier===1?(r()<.5?'gull':'blackwing'):tier===2?(r()<.6?'blackwing':'baroness'):'baroness';}

const arc=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.dot(b))))*RADIUS;
// Rubber band: how hard the rival flies given its lead (positive = it is ahead), in remaining-route units.
export function paceFor(lead){return lead>120?.9:lead>40?.96:lead<-120?1.12:lead<-40?1.06:1;}
// Chance a rival fumbles a drop and has to go round, higher when it's comfortably ahead.
export function fumbleChance(rival,lead){return Math.min(.6,rival.fumble*(lead>60?1.8:1));}
export const DROP_RANGE=7, DROP_FALL=2.4, WAKE_RANGE=7;

// Step a rival plane toward its target on the sphere. s: {normal, forward, speed, altitude}.
export function steer(s,target,dt,turnRate,speed,wantAlt){
 const toward=target.clone().addScaledVector(s.normal,-target.dot(s.normal)).normalize();
 const side=new Vector3().crossVectors(s.forward,s.normal),ang=Math.atan2(toward.dot(side),toward.dot(s.forward));
 const turn=Math.max(-turnRate*dt,Math.min(turnRate*dt,ang));s.forward.applyAxisAngle(s.normal,-turn).normalize();s.bank=Math.max(-.8,Math.min(.8,ang*1.2));
 s.speed+=(speed-s.speed)*(1-Math.exp(-1.5*dt));s.altitude+=(wantAlt-s.altitude)*(1-Math.exp(-.8*dt));
 const axis=new Vector3().crossVectors(s.normal,s.forward).normalize(),q=new Quaternion().setFromAxisAngle(axis,s.speed*dt/(RADIUS+s.altitude));
 s.normal.applyQuaternion(q).normalize();s.forward.applyQuaternion(q).addScaledVector(s.normal,-s.forward.dot(s.normal)).normalize();return s;
}
// Remaining route length for a racer at `at` through open stops (nearest-first), for comparing who's ahead.
export function remaining(at,stops){let cur=at,len=0;const left=stops.filter(s=>!s.done).map(s=>s.normal);while(left.length){left.sort((a,b)=>arc(cur,a)-arc(cur,b));len+=arc(cur,left[0]);cur=left.shift();}return len;}

export function createRivals({T,scene,mat,label,ground}){
 let rival=null,plane=null,route=null,parcels=[],tag=null,chat=[],chatCool=0,time=0,wakeCool=0,leadState=0;
 const tmp=new T.Vector3(),basis=new T.Matrix4();
 function model(def){const g=new T.Group(),red=mat(def.color),trim=mat(def.trim),dark=mat('#2a2f33');const add=(geo,m,p=g)=>{const o=new T.Mesh(geo,m);p.add(o);return o;};const box=(w,h,d,x,y,z,m,p=g)=>{const o=add(new T.BoxGeometry(w,h,d),m,p);o.position.set(x,y,z);return o;};
  const body=add(new T.IcosahedronGeometry(1,1),red);body.scale.set(.55,.5,2.1);box(1.25,.06,.2,0,.33,-.8,trim);
  if(def.model==='triplane'){for(const y of [-.45,.35,1.1])box(6.2,.12,1.1,0,y,-.3,red);for(const x of [-2.6,2.6])box(.08,1.6,.08,x,.3,-.3,dark);}
  else if(def.model==='seaplane'){box(7.4,.14,1.3,0,.95,-.2,red);box(.08,1.2,.08,-2.5,.35,-.2,dark);box(.08,1.2,.08,2.5,.35,-.2,dark);for(const x of [-.9,.9]){const f=add(new T.CapsuleGeometry(.22,2.6,4,8),trim);f.rotation.x=Math.PI/2;f.position.set(x,-1.1,-.2);box(.06,.6,.06,x,-.7,-.6,dark);}}
  else{box(7.6,.13,1.25,0,-.15,-.25,red);for(const x of [-2.4,2.4])box(.5,.135,1.27,x,-.15,-.25,trim);}
  box(2.4,.1,.75,0,.15,1.75,red);const fin=box(.1,1.1,.8,0,.6,1.75,trim);fin.rotation.x=-.2;
  const prop=new T.Group();prop.position.z=-2.15;g.add(prop);box(.12,2.3,.08,0,0,0,dark,prop);add(new T.ConeGeometry(.2,.35,8),trim,prop).rotation.x=-Math.PI/2;
  add(new T.IcosahedronGeometry(.2,1),mat('#e2b48c')).position.set(0,.75,.35);
  g.userData.prop=prop;scene.add(g);return g;}
 function nameTag(def){const sp=label(def.company.split(' ')[0][0]);sp.material=sp.material.clone();sp.material.color=new T.Color('#ff6b6b');sp.scale.set(2.6,2.6,1);sp.position.y=3;return sp;}
 // job: the career job (has .race), r: the route (shared stops), start: {normal, forward}
 function start(job,r,startAt){clear();if(!job?.race)return;const def=RIVALS[job.race];route=r;
  rival={def,normal:startAt.normal.clone(),forward:startAt.forward.clone(),speed:16,altitude:16,bank:0,target:null,dropping:null,claimed:0,round:0,said:{}};
  // Line up off the player's left wing.
  const left=new T.Vector3().crossVectors(rival.normal,rival.forward).negate();rival.normal.addScaledVector(left,8/RADIUS).normalize();rival.forward.addScaledVector(rival.normal,-rival.forward.dot(rival.normal)).normalize();
  plane=model(def);tag=nameTag(def);plane.add(tag);}
 function clear(){if(plane){scene.remove(plane);plane.traverse(o=>{o.geometry?.dispose();});}for(const p of parcels)scene.remove(p.mesh);parcels=[];plane=null;rival=null;route=null;chat=[];chatCool=0;leadState=0;}
 function say(kind,events){if(!rival)return;const lines=rival.def.lines[kind];if(!lines)return;const n=rival.said[kind]=(rival.said[kind]||0);rival.said[kind]++;events.push({type:'radio',who:rival.def.pilot,company:rival.def.company,text:lines[n%lines.length],kind});}
 function chute(at,stop){const g=new T.Group(),red=mat(rival.def.color),white=mat('#f2ead6');const b=new T.Mesh(new T.BoxGeometry(.8,.8,.8),mat('#b88a52'));g.add(b);
  const c=new T.Mesh(new T.SphereGeometry(1.8,12,6,0,Math.PI*2,0,Math.PI/2),red);c.position.y=2.8;g.add(c);const s=new T.Mesh(new T.SphereGeometry(1.82,12,6,0,Math.PI*2,0,Math.PI/2),white);s.scale.set(.5,1,.5);s.position.y=2.8;g.add(s);
  g.position.copy(at);scene.add(g);parcels.push({mesh:g,from:at.clone(),to:stop.normal.clone().multiplyScalar(RADIUS+ground(stop.normal)+.5),t:0,stop});}
 // ctx: {active, playerNormal, playerWorld, playerForward}. Returns events: radio, claim, wake.
 function update(dt,ctx){const ev=[];if(!rival)return ev;time+=dt;chatCool=Math.max(0,chatCool-dt);wakeCool=Math.max(0,wakeCool-dt);const R=rival,open=route.stops.filter(s=>!s.done&&!s.motion&&(s.kind||'parcel')==='parcel');
  if(!R.said.start&&ctx.active){say('start',ev);chatCool=8;}
  // Who's ahead: compare what each still has to fly.
  const lead=open.length?remaining(ctx.playerNormal,route.stops)-remaining(R.normal,route.stops):0;
  if(chatCool===0&&open.length){const st=lead>60?1:lead<-60?-1:0;if(st!==leadState&&st!==0){say(st>0?'lead':'behind',ev);chatCool=12;}leadState=st;}
  if(!R.target||R.target.done)R.target=open.length?[...open].sort((a,b)=>arc(R.normal,a.normal)-arc(R.normal,b.normal))[0]:null;
  const g=ground(R.normal),cruise=Math.max(18,g+13);
  if(R.target){const d=arc(R.normal,R.target.normal);const wantAlt=d<40?Math.max(g+11,ground(R.target.normal)+12):cruise;
   steer(R,R.target.normal,dt,R.def.turn,R.def.speed*paceFor(lead)*(d<25?.85:1),wantAlt);
   // Drop when close to the pad, unless a fumble sends it round again.
   if(d<DROP_RANGE&&!R.dropping){if(Math.random()<fumbleChance(R.def,lead)&&R.round<2){R.round++;R.dropping={t:-3,stop:null};if(chatCool<4){say('fumble',ev);chatCool=6;}}
    else{R.round=0;R.dropping={t:0,stop:R.target};chute(R.normal.clone().multiplyScalar(RADIUS+R.altitude-1),R.target);}}}
  else{steer(R,R.forward.clone().addScaledVector(R.normal,.0).add(R.normal.clone().multiplyScalar(-.05)).normalize(),dt,.3,R.def.speed,cruise+10);R.leaving=(R.leaving||0)+dt;}
  if(R.dropping){R.dropping.t+=dt;if(R.dropping.t>.6&&!R.dropping.stop)R.dropping=null;else if(R.dropping.stop&&R.dropping.t>.5)R.dropping=null;}
  // Falling red parachutes claim their pad when they land, if you haven't got there first.
  for(const p of parcels){p.t+=dt/DROP_FALL;const u=Math.min(1,p.t);p.mesh.position.lerpVectors(p.from,p.to,u*u*(3-2*u));p.mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),p.mesh.position.clone().normalize());
   if(u>=1&&!p.done){p.done=true;if(!p.stop.done){p.stop.done=true;p.stop.rival=true;R.claimed++;ev.push({type:'claim',stop:p.stop});if(chatCool<6){say('theirs',ev);chatCool=7;}}}
   if(p.t>2.2){scene.remove(p.mesh);p.gone=true;}}
  parcels=parcels.filter(p=>!p.gone);
  // Wake turbulence just behind the rival.
  const rw=R.normal.clone().multiplyScalar(RADIUS+R.altitude);let wake=0;if(ctx.active){const rel=tmp.copy(ctx.playerWorld).sub(rw),d=rel.length();if(d<WAKE_RANGE&&rel.dot(R.forward)<0){wake=1-d/WAKE_RANGE;if(wakeCool===0){wakeCool=8;ev.push({type:'wake'});if(chatCool<5){say('wake',ev);chatCool=6;}}}}
  status.wake=wake;status.lead=lead;status.claimed=R.claimed;
  // Pose the plane.
  if(plane){plane.position.copy(rw);const right=tmp.crossVectors(R.forward,R.normal).normalize();basis.makeBasis(right,R.normal,R.forward.clone().negate());plane.quaternion.setFromRotationMatrix(basis);plane.rotateZ(-R.bank);plane.userData.prop.rotation.z+=dt*60;
   if(R.leaving>12){scene.remove(plane);plane=null;}}
  return ev;}
 const status={wake:0,lead:0,claimed:0};
 function playerScored(){if(rival&&chatCool<5){const ev=[];say('yours',ev);chatCool=6;return ev[0];}return null;}
 function finish(won){if(!rival)return null;const ev=[];say(won?'lose':'win',ev);return ev[0];}
 function markers(){return rival&&plane?[{normal:rival.normal,color:'#ff4d4d',label:'R'}]:[];}
 function debug(){return rival?{normal:rival.normal.clone(),forward:rival.forward.clone(),altitude:rival.altitude,said:{...rival.said},target:rival.target?.name}:null;}
 // Test hook: put the rival just short of its current target.
 function warp(){if(!rival?.target)return;const t=rival.target.normal,f=rival.forward;rival.normal.copy(t).addScaledVector(f,-12/RADIUS).normalize();rival.forward.copy(t).sub(rival.normal).addScaledVector(rival.normal,0).normalize();rival.forward.addScaledVector(rival.normal,-rival.forward.dot(rival.normal)).normalize();}
 return {warp,debug,start,clear,update,playerScored,finish,markers,status,get active(){return !!rival;},get def(){return rival?.def||null;},get claimed(){return rival?.claimed||0;}};
}
