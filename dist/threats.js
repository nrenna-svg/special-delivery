// Air defences on ROUGH and DEADLY jobs (v0.80): surface-to-air missile (SAM) sites and flak guns
// on the islands a hard job sends you to.
//
// SAM: a radar sweeps for the plane. It can only see you inside RADAR_RANGE and above RADAR_FLOOR
// (fly low and it loses you). Keep it watching for LOCK_TIME and it fires a homing missile. Missiles
// are fast but turn slowly: break hard as one closes, or pop a flare (C) and it chases that instead.
// A missile that reaches you is a crash (the job's tier decides what that costs).
// Flak (DEADLY only): bursts around your predicted path that rattle the cargo when close.
// Pure logic first (testable), then createThreats() for the 3D models and effects.
import {Vector3} from './vendor/three.core.js';
import {RADIUS} from './flight.js';

export const RADAR_RANGE=62, RADAR_FLOOR=6.5, LOCK_TIME=2.4, MISSILE_SPEED=34, MISSILE_TURN=1.2, MOTOR_TIME=3.2, DECAY=7, SEEKER=.75, MISSILE_LIFE=9,
 MISSILE_HIT=2.2, FLARE_PULL=.85, FLARE_LIFE=2.6, FLARES=4, FLAK_RANGE=48, FLAK_HIT=3.2, FLAK_DAMAGE=9;
const tmp=new Vector3(),tmp2=new Vector3();
// Height above the ground under a world point.
export function heightAbove(world,ground){const n=tmp2.copy(world).normalize();return world.length()-RADIUS-ground(n);}
// Can this SAM's radar see the plane? site: {pos (world, at the radar)}, plane: world position.
export function radarSees(site,plane,altitude,groundUnderPlane=0){
 if(site.pos.distanceTo(plane)>RADAR_RANGE)return false;
 return altitude-groundUnderPlane>=RADAR_FLOOR;
}
export function newMissile(from,dir){return {pos:from.clone(),vel:dir.clone().normalize().multiplyScalar(MISSILE_SPEED*.55),age:0,target:'plane',dead:false};}
// Steer toward where the target is going (lead pursuit) with a limited turn rate, accelerating to full
// speed. Once the target is behind it, the missile has overshot: it loses lock and flies on (lost=true).
export function stepMissile(m,target,dt,targetVel=null){
 // The motor burns for MOTOR_TIME; after that the missile slows down and turns more weakly, so a
 // long chase (hard turns, boost) can wear it out.
 m.age+=dt;const v=m.vel.length(),speed=m.age<MOTOR_TIME?Math.min(MISSILE_SPEED,v+MISSILE_SPEED*1.6*dt):Math.max(12,v-DECAY*dt);
 const cur=m.vel.clone().normalize(),to=tmp.copy(target).sub(m.pos),dist=to.length();
 // Seeker limit: if a hard break swings the target outside SEEKER of the nose, the seeker loses it.
 if(!m.lost&&m.age>.8&&cur.dot(to.clone().normalize())<Math.cos(SEEKER)){m.lost=true;m.lostAt=m.age;}
 const aim=to.clone();if(targetVel&&!m.lost)aim.addScaledVector(targetVel,Math.min(2,dist/Math.max(8,speed)));const want=m.lost?cur.clone():aim.normalize();
 const ang=Math.acos(Math.max(-1,Math.min(1,cur.dot(want)))),maxTurn=MISSILE_TURN*Math.min(1,speed/MISSILE_SPEED)*dt;
 if(ang>1e-5){const k=Math.min(1,maxTurn/ang);cur.lerp(want,k).normalize();}
 m.vel.copy(cur).multiplyScalar(speed);m.pos.addScaledVector(m.vel,dt);
 if(m.age>MISSILE_LIFE)m.dead=true;return m;
}
// Dodge (v0.80): a barrel roll or loop started while a missile is DODGE_NEAR-DODGE_FAR units away
// shakes its seeker. Too early and it re-acquires; too late and it's on you.
export const DODGE_NEAR=4, DODGE_FAR=30;
export function canDodge(m,plane){const d=m.pos.distanceTo(plane);return d>=DODGE_NEAR&&d<=DODGE_FAR;}
// A flare pulls a missile off you when it is released while the missile is closing in.
export function flareDecoys(m,plane,rand=Math.random,pull=FLARE_PULL){const d=m.pos.distanceTo(plane);return d<40&&rand()<pull;}
// Flak: aim at where the plane will be, with scatter that tightens on DEADLY.
export function flakBurst(plane,vel,lead,scatter,rand=Math.random){return plane.clone().addScaledVector(vel,lead).add(new Vector3(rand()-.5,rand()-.5,rand()-.5).multiplyScalar(scatter*2));}

export function createThreats({T,scene,mat,label,ground}){
 let root=null,sams=[],flaks=[],missiles=[],flares=[],puffs=[],booms=[],flareCount=FLARES,time=0;
 const up=new T.Vector3(0,1,0);
 const m={base:mat('#5c6650'),dark:mat('#2f3530'),tube:mat('#d9dccf'),tip:mat('#c9372c'),radar:mat('#9aa38c',{side:T.DoubleSide}),
  smoke:new T.MeshBasicMaterial({color:'#d8d8d2',transparent:true,opacity:.55,depthWrite:false}),flak:new T.MeshBasicMaterial({color:'#2b2b2b',transparent:true,opacity:.8,depthWrite:false}),
  fire:new T.MeshBasicMaterial({color:'#ffb347',transparent:true,opacity:.9}),flare:new T.MeshBasicMaterial({color:'#fff1b0'}),boom:new T.MeshBasicMaterial({color:'#ff8a3a',transparent:true,opacity:.9,depthWrite:false})};
 const add=(geo,mt,p)=>{const o=new T.Mesh(geo,mt);p.add(o);return o;};
 const box=(p,w,h,d,x,y,z,mt)=>{const o=add(new T.BoxGeometry(w,h,d),mt,p);o.position.set(x,y,z);return o;};
 function surface(n,alt){const g=new T.Group();g.position.copy(n).multiplyScalar(RADIUS+alt);g.quaternion.setFromUnitVectors(up,n);root.add(g);return g;}
 function missileModel(){const g=new T.Group();const body=add(new T.CylinderGeometry(.16,.16,1.6,8),m.tube,g);body.rotation.x=Math.PI/2;const tip=add(new T.ConeGeometry(.16,.45,8),m.tip,g);tip.rotation.x=-Math.PI/2;tip.position.z=-1;
  for(let k=0;k<4;k++){const f=box(g,.05,.35,.3,0,0,.7,m.dark);f.rotation.z=k*Math.PI/2;f.position.set(Math.cos(k*Math.PI/2)*.18,Math.sin(k*Math.PI/2)*.18,.7);}
  const flame=add(new T.ConeGeometry(.14,.7,8),m.fire,g);flame.rotation.x=Math.PI/2;flame.position.z=1.15;scene.add(g);return g;}

 function start(features){clear();root=new T.Group();scene.add(root);flareCount=features.flares??FLARES;
  sams=(features.sams||[]).map((s,i)=>{const g=surface(s.normal,ground(s.normal)-.1);
   box(g,4.2,.6,3.2,0,.3,0,m.base);for(const x of [-1.6,1.6])for(const z of [-1.2,1.2]){const w=add(new T.CylinderGeometry(.45,.45,.3,10),m.dark,g);w.rotation.z=Math.PI/2;w.position.set(x,.15,z);}
   const turret=new T.Group();turret.position.y=.8;g.add(turret);box(turret,1.6,.5,1.6,0,.25,0,m.base);
   const rack=new T.Group();rack.position.y=.9;turret.add(rack);const tubes=[];for(let k=0;k<4;k++){const t=add(new T.CylinderGeometry(.22,.22,2.4,8),m.tube,rack);t.rotation.x=Math.PI/2;t.position.set((k%2?.27:-.27),(k>1?.27:-.27)+.3,0);tubes.push(t);}
   const mast=box(g,.15,2.4,.15,-1.6,1.8,-1,m.dark);void mast;const dish=new T.Group();dish.position.set(-1.6,3.1,-1);g.add(dish);const d=add(new T.CircleGeometry(.9,12,0,Math.PI),m.radar,dish);d.rotation.x=-.3;
   const sign=label('!');sign.material=sign.material.clone();sign.material.color=new T.Color('#ff5f6d');sign.position.y=6;sign.scale.set(3.4,3.4,1);g.add(sign);
   g.updateMatrixWorld(true);const pos=new T.Vector3();dish.getWorldPosition(pos);
   return {...s,g,turret,rack,dish,tubes,pos,lock:0,cool:2+i*1.3,reload:s.reload||7,warned:false};});
  flaks=(features.flak||[]).map((s,i)=>{const g=surface(s.normal,ground(s.normal)-.1);box(g,2.4,.8,2.4,0,.4,0,m.base);const turret=new T.Group();turret.position.y=1;g.add(turret);
   box(turret,1.2,.6,1.2,0,.3,0,m.dark);const barrels=new T.Group();barrels.position.y=.7;turret.add(barrels);for(const x of [-.25,.25]){const b=add(new T.CylinderGeometry(.09,.09,2.2,6),m.dark,barrels);b.rotation.x=Math.PI/2;b.position.set(x,0,-1);}
   g.updateMatrixWorld(true);const pos=new T.Vector3();turret.getWorldPosition(pos);return {...s,g,turret,barrels,pos,cool:1+i*.7};});}
 function clear(){if(root){scene.remove(root);root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&o.material.map)o.material.dispose();});}
  for(const x of missiles)x.mesh&&scene.remove(x.mesh);for(const p of [...puffs,...flares,...booms])scene.remove(p.mesh);root=null;sams=[];flaks=[];missiles=[];flares=[];puffs=[];booms=[];}
 function puff(at,mt,size,life,v=null){const p=new T.Mesh(new T.IcosahedronGeometry(size,0),mt);p.position.copy(at);scene.add(p);puffs.push({mesh:p,life,max:life,v:v||new T.Vector3()});}
 function boom(at,size=1){const b=new T.Mesh(new T.IcosahedronGeometry(1,1),m.boom.clone());b.position.copy(at);scene.add(b);booms.push({mesh:b,t:0,size});for(let k=0;k<8;k++)puff(at.clone().add(new T.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).multiplyScalar(2*size)),m.flak,.5*size,1.6);}
 function aim(obj,from,to,parentQ){const dir=tmp.copy(to).sub(from).normalize();obj.lookAt(obj.getWorldPosition(tmp2).add(dir));}

 // ctx: {active, planeWorld, planeVel, altitude, groundUnder, condition}
 function update(dt,ctx){if(!root)return [];time+=dt;const ev=[];const P=ctx.planeWorld;
  let watched=0,locking=0;
  for(const s of sams){s.dish.rotation.y+=dt*(s.lock>0?6:1.6);s.cool=Math.max(0,s.cool-dt);
   const sees=ctx.active&&radarSees(s,P,ctx.altitude,ctx.groundUnder);
   if(sees){watched++;s.rack.lookAt(P);s.lock+=dt;if(!s.warned){s.warned=true;ev.push({type:'radar'});}
    if(s.lock<LOCK_TIME)locking=Math.max(locking,s.lock/LOCK_TIME);
    if(s.lock>=LOCK_TIME&&s.cool===0){s.cool=s.reload;s.lock=LOCK_TIME*.4;const from=new T.Vector3();s.tubes[missiles.length%4].getWorldPosition(from);
     const dir=P.clone().sub(from).normalize().add(from.clone().normalize().multiplyScalar(.6)).normalize();const mm=newMissile(from,dir);mm.mesh=missileModel();mm.trail=0;missiles.push(mm);ev.push({type:'launch'});}}
   else{s.lock=Math.max(0,s.lock-dt*1.5);if(s.lock===0)s.warned=false;}}
  // Missiles.
  for(const mm of missiles){if(mm.dead)continue;const target=mm.target==='plane'?P:mm.target.pos;stepMissile(mm,target,dt,mm.target==='plane'?ctx.planeVel:null);
   mm.mesh.position.copy(mm.pos);mm.mesh.lookAt(tmp.copy(mm.pos).sub(mm.vel));
   mm.trail-=dt;if(mm.trail<=0){mm.trail=.04;puff(mm.pos.clone(),m.smoke,.35,1.4,mm.pos.clone().normalize().multiplyScalar(.6));}
   const groundHit=heightAbove(mm.pos,ground)<.3;
   if(mm.target==='plane'&&!mm.lost&&ctx.active&&mm.pos.distanceTo(P)<MISSILE_HIT){mm.dead=true;boom(P.clone(),1.6);ev.push({type:'hit'});}
   else if(mm.target!=='plane'&&mm.pos.distanceTo(mm.target.pos)<1.5){mm.dead=true;boom(mm.pos.clone(),.9);ev.push({type:'decoyed'});}
   else if(groundHit){mm.dead=true;boom(mm.pos.clone(),1.2);ev.push({type:'missed'});}
   else if(mm.age>MISSILE_LIFE||(mm.lost&&mm.age>mm.lostAt+2.5)){mm.dead=true;boom(mm.pos.clone(),.8);ev.push({type:'missed'});}
   if(mm.dead){scene.remove(mm.mesh);}}
  missiles=missiles.filter(x=>!x.dead);
  const inbound=missiles.filter(x=>x.target==='plane'&&!x.lost);let nearest=Infinity;for(const x of inbound)nearest=Math.min(nearest,x.pos.distanceTo(P));
  // Flares fall and burn out.
  for(const f of flares){f.life-=dt;f.vel.addScaledVector(f.pos.clone().normalize(),-6*dt);f.pos.addScaledVector(f.vel,dt);f.mesh.position.copy(f.pos);f.mesh.scale.setScalar(.6+Math.random()*.5);
   if(Math.random()<.5)puff(f.pos.clone(),m.smoke,.22,.9);if(f.life<=0){scene.remove(f.mesh);f.dead=true;for(const x of missiles)if(x.target===f){x.target='plane';}}}
  flares=flares.filter(f=>!f.dead);
  // Flak.
  for(const k of flaks){k.cool=Math.max(0,k.cool-dt);if(!ctx.active||k.pos.distanceTo(P)>FLAK_RANGE)continue;k.turret.lookAt(P);
   if(k.cool===0){k.cool=.9+Math.random()*.6;const at=flakBurst(P,ctx.planeVel,.8+Math.random()*.5,4.5);boom(at,.7);const d=at.distanceTo(P);ev.push({type:'flak',close:d<FLAK_HIT,dist:d});}}
  // Puffs and explosions.
  for(const p of puffs){p.life-=dt;p.mesh.position.addScaledVector(p.v,dt);p.mesh.scale.setScalar(1+(p.max-p.life)*1.4);p.mesh.material=p.mesh.material;if(p.life<=0){scene.remove(p.mesh);p.mesh.geometry.dispose();p.dead=true;}}
  puffs=puffs.filter(p=>!p.dead);
  for(const b of booms){b.t+=dt;b.mesh.scale.setScalar(b.size*(.6+b.t*6));b.mesh.material.opacity=Math.max(0,.9-b.t*2.4);if(b.t>.4){scene.remove(b.mesh);b.mesh.geometry.dispose();b.mesh.material.dispose();b.dead=true;}}
  booms=booms.filter(b=>!b.dead);
  status.watched=watched;status.locking=locking;status.inbound=inbound.length;status.nearest=nearest;
  return ev;}
 const status={watched:0,locking:0,inbound:0,nearest:Infinity};
 function flare(planeWorld,forward,normal,pull=FLARE_PULL){if(!root||flareCount<=0)return null;flareCount--;let pulled=0;
  for(let k=0;k<2;k++){const f={pos:planeWorld.clone().addScaledVector(normal,-.8),vel:forward.clone().multiplyScalar(-6).addScaledVector(new T.Vector3().crossVectors(forward,normal),(k?1:-1)*5),life:FLARE_LIFE};
   f.mesh=new T.Mesh(new T.IcosahedronGeometry(.35,0),m.flare);f.mesh.position.copy(f.pos);scene.add(f.mesh);flares.push(f);}
  for(const x of missiles)if(x.target==='plane'&&flareDecoys(x,planeWorld,Math.random,pull)){x.target=flares[flares.length-1-(pulled%2)];pulled++;}
  return {left:flareCount,pulled};}
 function dodge(planeWorld){let n=0;for(const x of missiles)if(x.target==='plane'&&!x.lost&&canDodge(x,planeWorld)){x.lost=true;x.lostAt=x.age;n++;}return n;}
 function markers(){return [...sams.map(s=>({normal:s.normal,color:'#ff5f6d',label:'S'})),...flaks.map(s=>({normal:s.normal,color:'#ff9a5c',label:'F'}))];}
 function obstacles(){return [...sams.map(s=>({normal:s.normal,top:ground(s.normal)+3.4,radius:2.6,name:'a missile launcher'})),...flaks.map(s=>({normal:s.normal,top:ground(s.normal)+2.4,radius:1.8,name:'a flak gun'}))];}
 return {dodge,start,clear,update,flare,markers,obstacles,status,get flares(){return flareCount;},get armed(){return sams.length+flaks.length>0;}};
}
