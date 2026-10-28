// Life and danger on the water: ship traffic (sailboats, tugs, container ships, trawlers),
// whales that surface and spout, leaping dolphin pods, rocky sea stacks and, on Days 3-5,
// wandering waterspouts. Ships' masts, sea stacks and waterspouts are crash obstacles;
// waterspouts also buffet the plane when you fly close. Layout data was generated once (for the v0.56 planet: radius 200 with 11 islands) and
// checked by tests/sealife.test.mjs to stay clear of islands, pads, fuel hoops and the landing approach.
import {RADIUS} from './flight.js';
import {offsetNormal,boatNormal,toNormal} from './challenges.js';

export const SHIPS=[
 {type:'sail',center:[0.107,-0.279,0.954],radius:39,period:177,phase:4.96,dir:1},
 {type:'tug',center:[0.549,0.427,0.719],radius:19,period:96,phase:5.98,dir:-1},
 {type:'cargo',center:[0.702,0.561,0.439],radius:38,period:174,phase:1.32,dir:1},
 {type:'trawler',center:[-0.515,-0.674,-0.529],radius:20,period:100,phase:0.97,dir:-1},
 {type:'sail',center:[0.761,-0.192,-0.619],radius:35,period:160,phase:4.15,dir:1},
 {type:'cargo',center:[0.596,0.097,0.797],radius:30,period:140,phase:2.95,dir:1},
 {type:'tug',center:[0.526,0.717,-0.457],radius:27,period:128,phase:4.86,dir:-1},
 {type:'sail',center:[-0.152,0.145,0.978],radius:31,period:144,phase:1.54,dir:-1},
 {type:'trawler',center:[0.764,0.190,-0.617],radius:24,period:115,phase:3.73,dir:1},
 {type:'cargo',center:[-0.456,0.711,0.536],radius:29,period:136,phase:2.98,dir:-1},
 {type:'sail',center:[-0.645,0.127,0.754],radius:21,period:104,phase:3.25,dir:-1},
 {type:'tug',center:[-0.758,0.418,0.501],radius:25,period:120,phase:5.44,dir:1},
 {type:'trawler',center:[-0.640,0.435,-0.633],radius:20,period:99,phase:0.22,dir:-1},
 {type:'sail',center:[0.153,0.760,-0.632],radius:34,period:157,phase:4.49,dir:1},
 {type:'cargo',center:[0.885,-0.457,-0.087],radius:25,period:120,phase:1.97,dir:-1},
 {type:'tug',center:[-0.991,-0.136,0.009],radius:28,period:131,phase:1.28,dir:1}
];
export const SHIP_TOP={sail:7,tug:4.6,cargo:6.6,trawler:5.6}, SHIP_RADIUS={sail:2.4,tug:2.4,cargo:4.2,trawler:3};
export const STACKS=[
 {normal:[0.325,0.545,0.773],height:5.7}, {normal:[0.981,-0.186,0.062],height:6.8}, {normal:[0.493,-0.635,-0.595],height:5.9}, {normal:[-0.333,-0.456,0.825],height:7.1}, {normal:[0.288,-0.947,-0.141],height:6.9}, {normal:[-0.707,-0.662,-0.248],height:10.9}, {normal:[0.617,-0.693,-0.373],height:5.4}, {normal:[0.964,-0.221,0.148],height:7.8}, {normal:[-0.271,-0.035,0.962],height:10.5}, {normal:[-0.217,-0.969,0.121],height:5.9}, {normal:[0.369,0.094,-0.925],height:4.8}, {normal:[-0.031,0.891,-0.454],height:8.7}, {normal:[-0.237,-0.266,-0.934],height:7.0}, {normal:[0.33,0.94,-0.02],height:5.3}, {normal:[-0.510,-0.418,0.752],height:10.6}, {normal:[-0.257,-0.418,0.871],height:7.8}, {normal:[0.957,0.173,-0.235],height:6.2}, {normal:[-0.384,-0.519,-0.764],height:6.5}
];
export const STACK_RADIUS=2.3;
export const SPOUTS=[[-0.432,0.898,-0.076],[0.404,-0.138,0.904],[0.517,0.854,0.063],[-0.869,-0.337,-0.362],[-0.652,0.651,0.389],[0.799,0.111,0.592]];
export const SPOUT_WANDER=10, SPOUT_CORE=3, SPOUT_PULL=10, SPOUT_TOP=48;
export const LIFE=[[0.688,0.317,0.653],[-0.681,0.609,-0.406],[0.459,0.680,0.572],[0.760,0.204,-0.617],[0.350,-0.582,0.734],[0.683,0.669,0.293],[-0.612,0.715,0.337]];

export const shipMotion=s=>({center:toNormal(s.center),radius:s.radius,period:s.period,phase:s.phase,dir:s.dir});
export function spoutNormal(i,t,out){const c=toNormal(SPOUTS[i]),a=t/(40+i*7)*Math.PI*2+i;return offsetNormal(c,Math.cos(a)*SPOUT_WANDER,Math.sin(a*1.3)*SPOUT_WANDER,out);}
const arc=(a,b)=>Math.acos(Math.max(-1,Math.min(1,a.dot(b))))*RADIUS;
// Every crash obstacle on the water at time t (spouts only when the day has them).
export function seaObstacles(t,spouts){
 const out=SHIPS.map(s=>({normal:boatNormal(shipMotion(s),t),top:SHIP_TOP[s.type],radius:SHIP_RADIUS[s.type],name:s.type==='sail'?'a sailboat mast':s.type==='cargo'?'a container ship':s.type==='tug'?'a tugboat':'a trawler'}));
 for(const st of STACKS)out.push({normal:toNormal(st.normal),top:st.height,radius:STACK_RADIUS,name:'a sea stack'});
 if(spouts)SPOUTS.forEach((_,i)=>out.push({normal:spoutNormal(i,t),top:SPOUT_TOP,radius:SPOUT_CORE,name:'a waterspout'}));
 return out;
}
// How hard the nearest waterspout is shaking the plane (0..1), for turbulence.
export function spoutPull(normal,t){let best=0;SPOUTS.forEach((_,i)=>{const d=arc(normal,spoutNormal(i,t));best=Math.max(best,Math.max(0,Math.min(1,(SPOUT_PULL-d)/(SPOUT_PULL-SPOUT_CORE))));});return best;}

export function createSeaLife({T,scene,mat,palette,label}){
 const root=new T.Group();scene.add(root);const up=new T.Vector3(0,1,0),tmp=new T.Vector3(),basis=new T.Matrix4(),q=new T.Quaternion();
 const m={hull:[mat('#c94f3d'),mat('#2f6f8c'),mat('#f2ead6'),mat('#3d4f5a')],deck:mat('#d9c08a'),cabin:mat('#f4efe2'),sail:mat('#fbf6ea',{side:T.DoubleSide}),stripe:mat('#2f6f8c'),
  box:[mat('#d8473a'),mat('#2f86b8'),mat('#e8b33d'),mat('#5aa36b'),mat('#ece6d6')],crane:mat('#f1c24b'),stack:mat('#2b3a40'),smoke:mat('#d7d9d6',{transparent:true,opacity:.6}),
  whale:mat('#3b5363'),belly:mat('#c9d3d6'),dolphin:mat('#7f97a6'),rock:mat('#7c7b74'),rock2:mat('#5f625e'),grass:mat('#6f9a5c'),guano:mat('#efece2'),beacon:mat('#ffd36a',{emissive:'#ffb52c',emissiveIntensity:1}),
  spray:mat('#ffffff',{transparent:true,opacity:.55}),spout:new T.MeshStandardMaterial({color:'#dfe9ee',transparent:true,opacity:.42,roughness:1,flatShading:true,depthWrite:false,side:T.DoubleSide}),wake:new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.4})};
 const add=(geo,material,p)=>{const o=new T.Mesh(geo,material);p.add(o);return o;};
 const box=(p,w,h,d,x,y,z,material)=>{const o=add(new T.BoxGeometry(w,h,d),material,p);o.position.set(x,y,z);return o;};
 function orient(g,normal,alt,forward){g.position.copy(normal).multiplyScalar(RADIUS+alt);if(forward){const right=tmp.crossVectors(forward,normal).normalize();basis.makeBasis(right,normal,forward.clone().negate());g.quaternion.setFromRotationMatrix(basis);}else g.quaternion.setFromUnitVectors(up,normal);}

 // ── Ships ──
 const ships=SHIPS.map((s,i)=>{const g=new T.Group();root.add(g);const motion=shipMotion(s),smoke=[];let len=8;
  if(s.type==='sail'){len=7;box(g,2.2,1,len,0,.5,0,m.hull[2]);box(g,2.25,.18,len*.98,0,.95,0,m.stripe);box(g,.18,6.4,.18,0,4,.4,m.stack);
   const sail=add(new T.BufferGeometry().setFromPoints([new T.Vector3(0,1.3,.5),new T.Vector3(0,7,.5),new T.Vector3(0,1.3,3.4)]),m.sail,g);sail.geometry.computeVertexNormals();
   const jib=add(new T.BufferGeometry().setFromPoints([new T.Vector3(0,1.3,.2),new T.Vector3(0,6,.3),new T.Vector3(0,1.3,-3)]),m.sail,g);jib.geometry.computeVertexNormals();}
  else if(s.type==='tug'){len=7;box(g,3,1.6,len,0,.8,0,m.hull[0]);box(g,2.2,1.4,2.6,0,2.3,.6,m.cabin);box(g,2.3,.25,2.7,0,3.1,.6,m.hull[3]);const st=box(g,.7,1.6,.7,0,3.6,1.6,m.hull[0]);box(g,.75,.3,.75,0,4.4,1.6,m.stack);smoke.push({x:0,y:4.8,z:1.6});}
  else if(s.type==='cargo'){len=18;box(g,4.2,2,len,0,1,0,m.hull[1]);box(g,4,.2,len*.97,0,2.05,0,m.deck);box(g,3.4,2.4,2.6,0,3.3,len/2-2,m.cabin);box(g,.8,1.4,.8,0,5.1,len/2-2,m.hull[0]);smoke.push({x:0,y:6,z:len/2-2});
   for(let r=0;r<5;r++)for(let c=0;c<2;c++)for(let h=0;h<1+((r+c+i)%2);h++)box(g,1.7,1,2.6,c?.95:-.95,2.65+h*1.02,-len/2+2.4+r*2.7,m.box[(r*3+c*2+h+i)%5]);
   const crane=new T.Group();crane.position.set(1.4,2.1,-1);g.add(crane);box(crane,.35,4.4,.35,0,2.2,0,m.crane);const jib=box(crane,.25,.25,5,0,4.3,-2.2,m.crane);void jib;}
  else{len=9;box(g,3.2,1.5,len,0,.75,0,m.hull[3]);box(g,2.4,1.6,2.4,0,2.3,1.6,m.cabin);box(g,.18,4.6,.18,0,3.1,-1.6,m.stack);const boom=box(g,4.2,.14,.14,0,4.9,-1.6,m.stack);boom.rotation.z=.25;smoke.push({x:0,y:3.4,z:2.4});}
  const bow=add(new T.ConeGeometry(s.type==='cargo'?2.1:1.25,2.6,4),s.type==='sail'?m.hull[2]:s.type==='cargo'?m.hull[1]:s.type==='tug'?m.hull[0]:m.hull[3],g);bow.rotation.x=-Math.PI/2;bow.rotation.y=Math.PI/4;bow.position.set(0,s.type==='cargo'?1:.6,-len/2-1.2);bow.scale.set(1,1,.6);
  const wake=[];for(let k=0;k<5;k++){const w=box(g,(s.type==='cargo'?4:2.4)*(1+k*.3),.05,1.5,0,.06,len/2+1.4+k*2.4,m.wake);w.material=m.wake.clone();wake.push(w);}
  const puffs=[];for(const sp of smoke)for(let k=0;k<6;k++){const p=add(new T.IcosahedronGeometry(.45,0),m.smoke,g);p.position.set(sp.x,sp.y,sp.z);puffs.push({mesh:p,base:sp,age:k/6});}
  return {s,motion,g,wake,puffs,horn:0};});

 // ── Sea stacks ──
 const stacks=STACKS.map((st,i)=>{const g=new T.Group();orient(g,toNormal(st.normal),0);root.add(g);let y=-1,r=2.2;
  while(y<st.height-.6){const seg=add(new T.DodecahedronGeometry(r,0),(Math.floor(y)%2)?m.rock:m.rock2,g);seg.position.set((i%3-1)*.15,y+r*.6,0);seg.scale.set(1,.9,1);seg.rotation.y=y;y+=r*.95;r=Math.max(1.1,r*.9);}
  const cap=add(new T.CylinderGeometry(r*.95,r*1.05,.35,7),m.grass,g);cap.position.y=st.height-.15;
  if(i%3===0){box(g,.3,1.6,.3,0,st.height+.8,0,m.guano);const b=add(new T.IcosahedronGeometry(.32,0),m.beacon,g);b.position.y=st.height+1.8;g.userData.beacon=b;}
  for(let k=0;k<5;k++){const s=add(new T.IcosahedronGeometry(.4+((k*7+i)%3)*.2,0),m.rock,g);const a=k*1.3+i;s.position.set(Math.cos(a)*3.2,.1,Math.sin(a)*3.2);}
  return {g};});

 // ── Whales & dolphins ──
 const whales=LIFE.slice(0,4).map((c,i)=>{const g=new T.Group();root.add(g);const body=new T.Group();g.add(body);
  const b=add(new T.IcosahedronGeometry(1,1),m.whale,body);b.scale.set(1.5,1.1,4.4);const belly=add(new T.IcosahedronGeometry(1,1),m.belly,body);belly.scale.set(1.3,.6,3.6);belly.position.y=-.45;
  const tail=new T.Group();tail.position.z=4.2;body.add(tail);box(tail,.6,.5,2,0,0,.8,m.whale);box(tail,3.4,.18,1.2,0,0,1.9,m.whale);
  const spray=[];for(let k=0;k<10;k++){const p=add(new T.IcosahedronGeometry(.35,0),m.spray,g);p.visible=false;spray.push(p);}
  return {center:toNormal(c),g,body,tail,spray,phase:i*3.1,radius:14+i*3};});
 const pods=LIFE.slice(4).map((c,i)=>{const dol=[];for(let k=0;k<4;k++){const g=new T.Group();root.add(g);const b=add(new T.IcosahedronGeometry(1,1),m.dolphin,g);b.scale.set(.45,.45,1.5);
   const fin=add(new T.ConeGeometry(.25,.6,4),m.dolphin,g);fin.position.set(0,.45,.1);const t=box(g,1.1,.1,.4,0,0,1.5,m.dolphin);void t;dol.push({g,off:k*.8});}return {center:toNormal(c),dol,phase:i*2};});

 // ── Waterspouts ──
 const spouts=SPOUTS.map((c,i)=>{const g=new T.Group();root.add(g);const rings=[];
  for(let k=0;k<14;k++){const h=k*3.4,r=1.6+Math.pow(k/13,1.7)*7;const ring=add(new T.CylinderGeometry(r*1.05,r*.92,3.6,9,1,true),m.spout,g);ring.position.y=h+1.8;rings.push(ring);}
  const base=add(new T.TorusGeometry(4.5,1,6,18),m.spray,g);base.rotation.x=Math.PI/2;base.position.y=.4;
  const cloud=add(new T.IcosahedronGeometry(9,1),new T.MeshStandardMaterial({color:'#5d6874',roughness:1,flatShading:true}),g);cloud.scale.set(1.6,.45,1.6);cloud.position.y=SPOUT_TOP+3;
  g.visible=false;return {g,rings,base,i};});

 let spoutsOn=false;
 function setDay(features){spoutsOn=!!features?.spouts;spouts.forEach(s=>s.g.visible=spoutsOn);}
 const events=[];
 function update(dt,t,planeWorld){
  events.length=0;
  for(const sh of ships){const n=boatNormal(sh.motion,t),n2=boatNormal(sh.motion,t+.3),fwd=n2.sub(n).normalize();orient(sh.g,n,.15+Math.sin(t*1.3+sh.s.phase)*.08,fwd);
   sh.g.rotateZ(Math.sin(t*.9+sh.s.phase)*.04);
   sh.wake.forEach((w,k)=>w.material.opacity=Math.max(0,(.42-k*.07)*(.85+.15*Math.sin(t*3+k))));
   for(const p of sh.puffs){p.age=(p.age+dt*.35)%1;p.mesh.position.set(p.base.x+p.age*.8,p.base.y+p.age*3.2,p.base.z+p.age*2.6);p.mesh.scale.setScalar(.5+p.age*1.6);}
   sh.horn=Math.max(0,sh.horn-dt);if(planeWorld&&sh.horn===0&&sh.g.position.distanceTo(planeWorld)<22){sh.horn=25;events.push({type:'horn',ship:sh.s.type});}}
  for(const st of stacks){const b=st.g.userData.beacon;if(b)b.material.emissiveIntensity=.4+(Math.sin(t*3)>0?.9:0);}
  for(const w of whales){const cyc=((t+w.phase)%16)/16,a=t/60+w.phase,n=offsetNormal(w.center,Math.cos(a)*w.radius,Math.sin(a)*w.radius),fwd=offsetNormal(w.center,Math.cos(a+.05)*w.radius,Math.sin(a+.05)*w.radius).sub(n).normalize();
   // Surface for the middle of the cycle, blow, then arch and dive showing the tail.
   const up=cyc<.3?-3:cyc<.38?-3+(cyc-.3)/.08*3.1:cyc<.8?.1:.1-(cyc-.8)/.2*3.2;orient(w.g,n,up,fwd);
   w.body.rotation.x=cyc>.8?-(cyc-.8)*3:0;w.tail.rotation.x=cyc>.8?(cyc-.8)*6:Math.sin(t*2)*.12;
   const blow=cyc>.42&&cyc<.6;w.spray.forEach((p,k)=>{p.visible=blow;if(blow){const u=((cyc-.42)/.18*2+k/10)%1;p.position.set(Math.sin(k*2.4)*u*1.2,1+u*7,-2.6+Math.cos(k*1.7)*u*1.2);p.scale.setScalar(1-u*.6);}});}
  for(const pod of pods){const a=t/30+pod.phase;pod.dol.forEach((d,k)=>{const ang=a+k*.18,n=offsetNormal(pod.center,Math.cos(ang)*12+k*1.5,Math.sin(ang)*12),fwd=offsetNormal(pod.center,Math.cos(ang+.05)*12+k*1.5,Math.sin(ang+.05)*12).sub(n).normalize();
   const ph=(t*1.1+d.off)%3,jump=ph<1.2?Math.sin(ph/1.2*Math.PI):-.4;orient(d.g,n,jump*2.6-.3,fwd);d.g.rotateX(ph<1.2?Math.cos(ph/1.2*Math.PI)*.7:0);d.g.visible=jump>-.3;});}
  if(spoutsOn)for(const s of spouts){orient(s.g,spoutNormal(s.i,t),0);s.rings.forEach((r,k)=>{r.rotation.y=t*(3-k*.12);r.position.x=Math.sin(t*1.7+k*.5)*k*.12;});s.base.rotation.z=t*2;s.base.scale.setScalar(1+Math.sin(t*5)*.08);}
  return events;
 }
 return {update,setDay,root,obstacles:t=>seaObstacles(t,spoutsOn),pull:(n,t)=>spoutsOn?spoutPull(n,t):0};
}
