// Per-day challenge layer: builds and animates sky rings, windsocks and wind streaks, boats that
// carry delivery pads, urgent-parcel badges, mailbag masts, gull flocks, storm cells with rain and
// lightning, and the sunset-to-night sky. Game rules live in challenges.js; this file reports what
// happened each frame as events for game.js to score and announce.
import {RADIUS} from './flight.js';
import {BOAT_PAD_RADIUS} from './delivery.js';
export const FUEL_ALT=13;
import {ringHit,ringScore,STREAK_WINDOW,windAt,boatNormal,flockBirds,BIRD_HIT,BIRD_DAMAGE,stormStrength,skyAt,MAIL_ALT,urgentLeft,formatClock} from './challenges.js';

export function createExtras({T,scene,mat,palette,label,hemi,sun,aircraft,baseSky}){
 const up=new T.Vector3(0,1,0),tmp=new T.Vector3(),tmp2=new T.Vector3(),basis=new T.Matrix4();
 let crates=[],root=null,f=null,route=null,pads=null,fuelHoops=[],rings=[],streak=0,lastRing=-99,ringsTaken=0,boats=[],socks=[],streaks=[],masts=[],flocks=[],storms=[],urgent=[],sparks=[],feathers=[];
 let leadTime=null,birdHits=0,stormNotice=-99,flash=0,stars=null,lamp=null,glow=0,buffet={turn:0,climb:0},inStorm=0,time=0,lateAnnounced=new Set(),mailTaken=0;
 const m={ring:mat('#ffd36a',{emissive:'#ffb52c',emissiveIntensity:.8}),hull:mat('#c94f3d'),hull2:mat('#2f6f8c'),deck:mat('#d9c08a'),cabin:mat('#f2ead6'),
  sock:mat('#ff7a3a',{side:T.DoubleSide}),mast:[mat('#d8473a'),mat('#f4efe2')],bag:mat('#9b7448'),rope:mat('#2b3a40'),
  fuel:mat('#5fe39a',{emissive:'#1fae5c',emissiveIntensity:.7}),bird:mat('#f3f1ea'),birdTip:mat('#3a4750'),cloud:mat('#4d5866',{flatShading:true}),cloud2:mat('#626e7d',{flatShading:true}),rain:mat('#9fb7d6',{transparent:true,opacity:.45}),
  feather:mat('#ffffff'),spark:mat('#fff2b0',{emissive:'#ffd36a',emissiveIntensity:1}),crate:mat('#b88a52'),strap:mat('#3b4a50')};
 const boltMat=new T.LineBasicMaterial({color:'#f4f7ff'}),gloom=new T.Color('#4a5462');
 const add=(geo,material,p)=>{const o=new T.Mesh(geo,material);p.add(o);return o;};
 const box=(p,w,h,d,x,y,z,material)=>{const o=add(new T.BoxGeometry(w,h,d),material,p);o.position.set(x,y,z);return o;};
 // Orient a group at a surface point: +Y = normal, -Z = forward.
 function orient(g,normal,alt,forward){g.position.copy(normal).multiplyScalar(RADIUS+alt);if(forward){const right=tmp2.crossVectors(forward,normal).normalize();basis.makeBasis(right,normal,tmp.copy(forward).negate());g.quaternion.setFromRotationMatrix(basis);}else g.quaternion.setFromUnitVectors(up,normal);}
 const surfaceGroup=(normal,alt,forward)=>{const g=new T.Group();orient(g,normal,alt,forward);root.add(g);return g;};

 function start(features,currentRoute,destinations){
  clear();f=features;route=currentRoute;pads=destinations;time=0;root=new T.Group();scene.add(root);
  // Fuel hoops: green rings with a fuel-can sign hovering over far islands.
  fuelHoops=f.fuel.map(h=>{const g=surfaceGroup(h.normal,FUEL_ALT);const ring=add(new T.TorusGeometry(6,.34,8,48),m.fuel,g);const sign=label('F');sign.material=sign.material.clone();sign.material.color=new T.Color('#b9ffcf');sign.position.y=8.5;g.add(sign);return {...h,g,ring,cool:0};});
  // Sky rings.
  rings=f.rings.map(r=>({...r,g:(()=>{const g=surfaceGroup(r.normal,r.altitude,r.facing);add(new T.TorusGeometry(3.2,.26,8,40),m.ring,g);return g;})()}));
  // Wind: a windsock on every fixed pad, pointing downwind, plus drifting streaks near the plane.
  if(f.wind){route.stops.forEach((s,i)=>{if(s.motion)return;const g=new T.Group();g.position.set(6.4,0,-4.5);pads[i].g.add(g);box(g,.14,5.2,.14,0,2.6,0,palette.white);
    const sock=new T.Group();sock.position.y=5;g.add(sock);const cone=add(new T.ConeGeometry(.45,2.6,8,1,true),m.sock,sock);cone.rotation.z=Math.PI/2;cone.position.x=1.3;
    const w=windAt(f.wind,s.normal);const local=w.clone().applyQuaternion(pads[i].g.quaternion.clone().invert());sock.rotation.y=Math.atan2(-local.z,local.x);socks.push({sock,base:sock.rotation.y});});
   for(let i=0;i<26;i++){const s=box(root,.05,.05,2.2,0,0,0,palette.white);s.material=new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.35});s.visible=false;streaks.push({mesh:s,life:0});}}
  // Boats carry their stop's pad on deck.
  route.stops.forEach((s,i)=>{if(!s.motion)return;const big=s.motion.radius>15;const g=new T.Group();root.add(g);
   const L=big?17:12,W=big?9:6.5;box(g,W,2,L,0,1,0,big?m.hull:m.hull2);box(g,W*.92,.25,L*.95,0,2.1,0,m.deck);const bow=add(new T.ConeGeometry(W*.5,3.4,4),big?m.hull:m.hull2,g);bow.rotation.x=-Math.PI/2;bow.rotation.y=Math.PI/4;bow.position.set(0,1.05,-L/2-1.6);bow.scale.set(1,1,.55);
   box(g,W*.5,2,L*.22,0,3.1,L*.36,m.cabin);box(g,.4,2.6,.4,0,4.3,L*.36,m.rope);
   const wake=[];for(let k=0;k<6;k++){const w=box(g,W*(.6+k*.12),.06,1.4,0,.08,L/2+1.5+k*2.2,palette.white);w.material=new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.45-k*.06});wake.push(w);}
   // Lead marker: a ghost ring on the water where the boat will be when a parcel dropped now lands.
   const lead=new T.Group();root.add(lead);const ghost=new T.MeshBasicMaterial({color:'#5fe39a',transparent:true,opacity:.55,depthWrite:false});
   const lr=add(new T.TorusGeometry(BOAT_PAD_RADIUS,.35,6,56),ghost,lead);lr.rotation.x=Math.PI/2;const li=add(new T.TorusGeometry(BOAT_PAD_RADIUS*.45,.25,6,40),ghost,lead);li.rotation.x=Math.PI/2;
   const ls=label('DROP HERE');ls.material=ls.material.clone();ls.material.color=new T.Color('#b9ffcf');ls.position.y=4;ls.scale.set(10,2.5,1);lead.add(ls);lead.visible=false;
   boats.push({stop:s,i,g,wake,lead,ghost});});
  // Urgent stops get a pulsing red badge over the pad.
  route.stops.forEach((s,i)=>{if(!s.urgent)return;const sp=label('!');sp.material=sp.material.clone();sp.material.color=new T.Color('#ff7b6b');sp.position.y=10;sp.scale.set(5,5,1);pads[i].g.add(sp);urgent.push({stop:s,sprite:sp});});
  // Mailbag masts.
  masts=f.mail.map(mm=>{const g=surfaceGroup(mm.normal,1.2);for(let k=0;k<6;k++){const c=add(new T.CylinderGeometry(.32,.38,1.9,8),m.mast[k%2],g);c.position.y=k*1.9+.95;}
   box(g,.2,.2,4.2,0,11.3,-2,m.rope);const bagY=MAIL_ALT-1.2;box(g,.05,11.3-bagY,.05,0,(11.3+bagY)/2,-3.9,m.rope);
   const bag=add(new T.IcosahedronGeometry(.8,1),m.bag,g);bag.scale.set(1,1.3,1);bag.position.set(0,bagY,-3.9);const sign=label('M');sign.position.y=14.2;g.add(sign);
   // Hook point is the bag, in world space.
   const hook=new T.Vector3();g.updateMatrixWorld(true);bag.getWorldPosition(hook);return {...mm,g,bag,sign,hook,taken:false};});
  // Crate pickups (v0.70): a lattice tower with a crate on top and a lifting ring above it at hook height.
  crates=(f.crates||[]).map(c=>{const g=surfaceGroup(c.normal,1.2);for(const [x,z] of [[-.9,-.9],[.9,-.9],[-.9,.9],[.9,.9]])box(g,.18,5.6,.18,x,2.8,z,m.rope);
   for(let y=1.2;y<5.4;y+=1.4){box(g,1.95,.1,.1,0,y,-.9,m.rope);box(g,1.95,.1,.1,0,y,.9,m.rope);box(g,.1,.1,1.95,-.9,y,0,m.rope);box(g,.1,.1,1.95,.9,y,0,m.rope);}
   box(g,2.6,.2,2.6,0,5.6,0,m.deck);
   const load=new T.Group();load.position.y=6.35;g.add(load);box(load,1.4,1.3,1.4,0,0,0,m.crate);box(load,1.46,.14,1.46,0,.35,0,m.strap);box(load,1.46,.14,1.46,0,-.35,0,m.strap);
   const ringY=MAIL_ALT-1.2-6.35;const ring=add(new T.TorusGeometry(.62,.1,6,18),m.ring,load);ring.position.y=ringY;ring.rotation.y=Math.PI/2;
   for(const [x,z] of [[-.6,-.6],[.6,-.6],[-.6,.6],[.6,.6]]){const a=new T.Vector3(x,.65,z),b=new T.Vector3(0,ringY-.6,0),len=a.distanceTo(b);const r=add(new T.CylinderGeometry(.03,.03,len,4),m.strap,load);r.position.copy(a).add(b).multiplyScalar(.5);r.quaternion.setFromUnitVectors(up,b.clone().sub(a).normalize());}
   const sign=label('C');sign.material=sign.material.clone();sign.material.color=new T.Color('#ffc27a');sign.position.y=12.4;g.add(sign);
   const hook=new T.Vector3();g.updateMatrixWorld(true);ring.getWorldPosition(hook);return {...c,g,load,sign,hook,taken:false,carried:false};});
  // Gull flocks.
  flocks=f.flocks.map(fl=>{const birds=[];for(let k=0;k<fl.count;k++){const g=new T.Group();root.add(g);box(g,.35,.3,1.1,0,0,0,m.bird);
    const wings=[-1,1].map(s=>{const p=new T.Group();p.position.x=s*.15;g.add(p);box(p,1.4,.06,.55,s*.7,0,0,m.bird);box(p,.4,.07,.5,s*1.35,0,.02,m.birdTip);return p;});g.scale.setScalar(1.7);birds.push({g,wings,off:Math.random()*6});}
   return {...fl,birds,scatter:0,cooldown:0};});
  // Storm cells: dark cloud banks, rain and lightning.
  storms=f.storms.map(st=>{const g=surfaceGroup(st.center,0);const puffs=[];for(let k=0;k<16;k++){const a=k/16*Math.PI*2+Math.random(),r=Math.sqrt(Math.random())*st.radius*.75;
    const p=add(new T.IcosahedronGeometry(3.5+Math.random()*3,1),k%3?m.cloud:m.cloud2,g);p.position.set(Math.cos(a)*r,41+Math.random()*8,Math.sin(a)*r);p.scale.set(1.6,.7,1.4);puffs.push(p);}
   const rain=[];for(let k=0;k<46;k++){const d=box(g,.06,2.6,.06,0,0,0,m.rain);const a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*st.radius*.7;d.position.set(Math.cos(a)*r,Math.random()*39,Math.sin(a)*r);rain.push(d);}
   return {...st,g,rain,next:1+Math.random()*2.5,bolt:null,boltLife:0};});
  // Night sky.
  if(f.night){const pts=[];for(let k=0;k<700;k++){const v=new T.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize().multiplyScalar(470);pts.push(v.x,v.y,v.z);}
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pts,3));stars=new T.Points(geo,new T.PointsMaterial({color:'#ffffff',size:1.6,sizeAttenuation:false,transparent:true,opacity:0,fog:false}));root.add(stars);
   lamp=new T.PointLight('#ffe2a8',0,60,1.5);lamp.position.set(0,-1,-3);aircraft.add(lamp);}
 }

 function clear(){
  if(root){scene.remove(root);root.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&!Object.values(m).includes(o.material)&&!Array.isArray(o.material)&&o.material!==palette.white){o.material.map?.dispose();o.material.dispose();}});}
  if(lamp){aircraft.remove(lamp);lamp.dispose?.();lamp=null;}
  crates=[];root=null;fuelHoops=[];rings=[];boats=[];socks=[];streaks=[];masts=[];flocks=[];storms=[];urgent=[];sparks=[];feathers=[];stars=null;streak=0;lastRing=-99;ringsTaken=0;birdHits=0;inStorm=0;flash=0;glow=0;stormNotice=-99;lateAnnounced=new Set();mailTaken=0;buffet={turn:0,climb:0};
  applySky(0);f=null;
 }
 function applySky(u){const s=skyAt(u);scene.background.setRGB(...s.bg);scene.fog.color.setRGB(...s.bg);sun.intensity=s.sun;sun.color.setRGB(...s.sunColor);hemi.intensity=Math.max(.35,s.hemi-inStorm*1.3)+flash*4;if(inStorm>0){const k=inStorm*.55;scene.background.lerp(gloom,k);scene.fog.color.lerp(gloom,k);}glow=s.glow;
  palette.white.emissive.set('#ffc46b');palette.white.emissiveIntensity=s.glow*.5;if(stars)stars.material.opacity=s.stars;if(lamp)lamp.intensity=s.glow*60;
  if(pads)for(const d of pads)d.color.emissiveIntensity=.25+s.glow*1.1;}
 function spark(world,color){for(let k=0;k<14;k++){const s=box(root,.25,.25,.25,0,0,0,m.spark);s.position.copy(world);sparks.push({mesh:s,v:new T.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).multiplyScalar(14),life:.7});}}

 // ctx: {state, planeWorld, active (flight mode), par}
 function update(dt,ctx){
  if(!f)return [];const events=[];time+=dt;const t=route.elapsed,{state,planeWorld}=ctx;
  // Fuel hoops: fly through to fill the tank.
  for(const h of fuelHoops){h.cool=Math.max(0,h.cool-dt);h.ring.rotation.z+=dt*.8;if(ctx.active&&h.cool===0&&h.normal.clone().multiplyScalar(RADIUS+FUEL_ALT).distanceTo(planeWorld)<6.5){h.cool=4;spark(planeWorld);events.push({type:'fuel'});}}
  // Rings: pulse, collect, streak.
  for(const r of rings){if(r.taken){if(r.g.visible){r.g.scale.multiplyScalar(1+dt*6);if(r.g.scale.x>2.2)r.g.visible=false;}continue;}
   r.g.rotateZ(dt*.6);const pulse=1+Math.sin(time*3+r.id)*.04;r.g.scale.setScalar(pulse);
   if(ctx.active&&ringHit(r,planeWorld)){r.taken=true;ringsTaken++;streak=t-lastRing<=STREAK_WINDOW?streak+1:1;lastRing=t;const pts=ringScore(streak);route.score+=pts;spark(planeWorld);events.push({type:'ring',points:pts,streak,left:rings.length-ringsTaken});}}
  if(streak&&t-lastRing>STREAK_WINDOW)streak=0;
  // Boats move their stop and its pad.
  for(const b of boats){const n=boatNormal(b.stop.motion,t),n2=boatNormal(b.stop.motion,t+.2),fwd=n2.sub(n).normalize();b.stop.normal.copy(n);orient(b.g,n,0,fwd);orient(pads[b.i].g,n,2.6,fwd);
   if(b.stop.done||leadTime===null)b.lead.visible=false;else{b.lead.visible=true;orient(b.lead,boatNormal(b.stop.motion,t+leadTime),.6);b.ghost.opacity=.4+.25*Math.sin(time*5);}
   b.wake.forEach((w,k)=>{w.material.opacity=Math.max(0,.45-k*.06)*(0.8+.2*Math.sin(time*4+k));});}
  // Windsocks flutter; streaks drift past the plane to show the wind.
  if(f.wind){for(const s of socks)s.sock.rotation.y=s.base+Math.sin(time*5+s.base)*.08;
   const w=windAt(f.wind,state.normal,t);for(const s of streaks){s.life-=dt;if(s.life<=0&&ctx.active){s.life=1.4+Math.random();s.mesh.visible=true;
     s.mesh.position.copy(planeWorld).addScaledVector(state.forward,8+Math.random()*30).add(tmp.set(Math.random()-.5,Math.random()-.5,Math.random()-.5).multiplyScalar(24));}
    if(s.mesh.visible){s.mesh.position.addScaledVector(w,dt*3.2);s.mesh.lookAt(tmp.copy(s.mesh.position).add(w));s.mesh.material.opacity=Math.min(.35,s.life*.4);if(s.life<=0)s.mesh.visible=false;}}}
  // Urgent badges and clocks.
  for(const u of urgent){u.sprite.visible=!u.stop.done;u.sprite.scale.setScalar(5+Math.sin(time*6)*.6);const left=urgentLeft(u.stop.urgent,t);
   if(!u.stop.done&&left<=0&&!lateAnnounced.has(u.stop)){lateAnnounced.add(u.stop);u.sprite.material.color.set('#9aa3ab');events.push({type:'late',stop:u.stop});}
   else if(!u.stop.done&&left>0&&left<=10&&Math.ceil(left)!==Math.ceil(left+dt))events.push({type:'tick'});}
  // Mailbags.
  for(const mm of masts){if(mm.taken)continue;mm.bag.rotation.y+=dt;mm.sign.scale.setScalar(4+Math.sin(time*3)*.3);
   if(ctx.active&&ctx.hookWorld&&ctx.hookWorld.distanceTo(mm.hook)<2.6){mm.taken=true;mailTaken++;mm.bag.visible=false;mm.sign.material=mm.sign.material.clone();mm.sign.material.opacity=.35;mm.sign.material.transparent=true;spark(mm.hook);events.push({type:'mail',left:masts.length-mailTaken});}}
  // Crates: hook the ring to lift the crate; it then hangs under the hook until released.
  for(const c of crates){if(!c.taken){c.sign.scale.setScalar(4+Math.sin(time*3)*.3);if(ctx.active&&ctx.hookWorld&&ctx.hookWorld.distanceTo(c.hook)<2.6){c.taken=c.carried=true;c.sign.visible=false;root.attach(c.load);spark(c.hook);events.push({type:'crate',goods:c.goods});}}
   if(c.carried){const at=ctx.hookWorld||tmp.copy(planeWorld).addScaledVector(state.normal,-1.6);c.load.position.copy(at).addScaledVector(state.normal,-(MAIL_ALT-1.2-6.35)-.1);c.load.quaternion.setFromUnitVectors(up,state.normal);}}
  // Gulls: fly in formation, scatter when struck.
  for(const fl of flocks){fl.cooldown=Math.max(0,fl.cooldown-dt);fl.scatter=Math.max(0,fl.scatter-dt);const pos=flockBirds(fl,time);
   fl.birds.forEach((b,k)=>{const p=pos[k];orient(b.g,p.normal,p.altitude,p.forward);if(fl.scatter>0){const s=(1.6-fl.scatter)*9;b.g.position.add(tmp.set(Math.sin(k*2.1),Math.cos(k*1.3)*.5+.6,Math.cos(k*2.7)).multiplyScalar(s));}
    const flap=Math.sin(time*(fl.scatter>0?22:11)+b.off)*.55;b.wings[0].rotation.z=flap;b.wings[1].rotation.z=-flap;
    if(ctx.active&&fl.cooldown===0&&b.g.position.distanceTo(planeWorld)<BIRD_HIT*1.4){fl.cooldown=5;fl.scatter=1.6;birdHits++;route.condition=Math.max(40,route.condition-BIRD_DAMAGE);
     for(let q=0;q<10;q++){const fe=box(root,.3,.04,.18,0,0,0,m.feather);fe.position.copy(planeWorld);feathers.push({mesh:fe,v:tmp2.set(Math.random()-.5,Math.random()*.6,Math.random()-.5).multiplyScalar(9).clone(),life:1.6});}
     events.push({type:'bird'});}});}
  // Storms: rain, lightning, turbulence.
  inStorm=0;buffet.turn=buffet.climb=0;
  for(const st of storms){for(const d of st.rain){d.position.y-=dt*30;if(d.position.y<0)d.position.y=39;}
   const s=stormStrength(st,state.normal);if(s>0&&state.altitude<40){inStorm=Math.max(inStorm,s);}
   st.next-=dt;if(st.next<=0){st.next=1.4+Math.random()*3.2;if(st.bolt){st.g.remove(st.bolt);st.bolt.geometry.dispose();}
    const a=Math.random()*Math.PI*2,r=Math.random()*st.radius*.55,pts=[];let x=Math.cos(a)*r,z=Math.sin(a)*r;for(let y=40;y>=0;y-=3){pts.push(new T.Vector3(x,y,z));x+=(Math.random()-.5)*2.6;z+=(Math.random()-.5)*2.6;}
    st.bolt=new T.Line(new T.BufferGeometry().setFromPoints(pts),boltMat);st.g.add(st.bolt);st.boltLife=.18;
    const dist=st.g.position.distanceTo(planeWorld);if(dist<170){flash=Math.max(flash,Math.min(1,40/dist));events.push({type:'thunder',dist});}}
   if(st.bolt){st.boltLife-=dt;st.bolt.visible=st.boltLife>0&&Math.floor(st.boltLife*40)%2===0;}}
  if(inStorm>0&&ctx.active){buffet.turn=Math.sin(time*7.3)*Math.sin(time*2.1)*inStorm*.9;buffet.climb=Math.sin(time*5.1+1)*inStorm*.7;route.condition=Math.max(40,route.condition-dt*2.5*inStorm);
   if(time-stormNotice>6){stormNotice=time;events.push({type:'storm'});}}
  flash=Math.max(0,flash-dt*5);
  // Particles.
  for(let k=sparks.length-1;k>=0;k--){const s=sparks[k];s.life-=dt;s.mesh.position.addScaledVector(s.v,dt);s.mesh.scale.setScalar(Math.max(.01,s.life*1.4));if(s.life<=0){root.remove(s.mesh);s.mesh.geometry.dispose();sparks.splice(k,1);}}
  for(let k=feathers.length-1;k>=0;k--){const s=feathers[k];s.life-=dt;s.v.multiplyScalar(Math.exp(-2*dt));s.mesh.position.addScaledVector(s.v,dt);s.mesh.rotation.x+=dt*7;s.mesh.rotation.y+=dt*5;if(s.life<=0){root.remove(s.mesh);s.mesh.geometry.dispose();feathers.splice(k,1);}}
  // Sky: Day 5 slides from afternoon to night over the day's par time.
  // Training Day 5 darkens over 3/4 of its par; endless-run days stay bright until mid-afternoon, then
  // run through sunset and dusk to full night at the end of the day's clock.
  applySky(!f.night?0:f.dayClock?Math.max(0,Math.min(1,(t/ctx.par-.5)/.5)):Math.min(1,t/(ctx.par*.75)));
  return events;
 }

 // One line of challenge status for the dispatch panel (HTML).
 function status(state){
  if(!f)return '';const parts=[],t=route.elapsed;
  if(rings.length)parts.push(`RINGS ${ringsTaken}/${rings.length}${streak>1?` · STREAK ×${Math.min(4,streak)}`:''}`);
  if(f.wind){const w=windAt(f.wind,state.normal,t),right=tmp.crossVectors(state.forward,state.normal);const ang=Math.atan2(w.dot(right),w.dot(state.forward))*180/Math.PI;parts.push(`WIND <i class="windarrow" style="transform:rotate(${ang.toFixed(0)}deg)">↑</i> ${Math.round(w.length()*3)} KT`);}
  for(const u of urgent){if(u.stop.done)continue;const left=urgentLeft(u.stop.urgent,t);parts.push(left>0?`<em class="${left<20?'hot':''}">URGENT ${u.stop.goods.toUpperCase()} ${formatClock(left)}</em>`:'<em>URGENT · LATE</em>');}
  if(masts.length)parts.push(`MAILBAGS ${mailTaken}/${masts.length}`);
  for(const c of crates)parts.push(c.carried?'<em>CRATE ON THE HOOK · SPACE TO DROP IT ON THE PAD</em>':c.taken?'CRATE DELIVERED':'CRATE AWAITING PICKUP');
  if(inStorm>0)parts.push('<em class="hot">TURBULENCE</em>');
  return parts.join(' · ');
 }
 // Preferred navigation target: urgent stops first, then mailbags once parcels are done.
 function navTarget(state){
  for(const u of urgent)if(!u.stop.done&&urgentLeft(u.stop.urgent,route.elapsed)>0)return u.stop;
  if(route.complete){let best=null,bd=Infinity;for(const mm of masts){if(mm.taken)continue;const d=mm.normal.distanceTo(state.normal);if(d<bd){bd=d;best=mm;}}if(best)return {name:'Mailbag mast · lower your hook (mouse wheel) through the bag',normal:best.normal};}
  return null;
 }
 function markers(){const out=[];for(const c of crates)if(!c.taken)out.push({normal:c.normal,color:'#ffc27a',label:'C'});for(const h of fuelHoops)out.push({normal:h.normal,color:'#5fe39a',label:'F'});for(const mm of masts)if(!mm.taken)out.push({normal:mm.normal,color:'#ffffff',label:'M'});for(const st of storms)out.push({normal:st.center,kind:'storm',size:st.radius});
  let shown=0;for(const r of rings){if(r.taken)continue;out.push({normal:r.normal,color:'#ffd36a',kind:'dot'});if(++shown>=6)break;}return out;}
 function summary(){if(!f)return '';const s=[];if(rings.length)s.push(`Rings ${ringsTaken}/${rings.length}.`);if(masts.length)s.push(`Mailbags ${mailTaken}/${masts.length}.`);if(flocks.length)s.push(birdHits?`Bird strikes ${birdHits}.`:'No bird strikes.');
  for(const u of urgent)s.push(lateAnnounced.has(u.stop)?`${u.stop.goods} arrived late.`:`${u.stop.goods} right on time +150.`);return s.join(' ');}
 // Solid things to crash into: mail masts.
 function obstacles(){return [...masts.map(mm=>({normal:mm.normal,top:13.2,radius:1.1,name:'a mail mast'})),...crates.map(c=>({normal:c.normal,top:c.taken?7:8.4,radius:1.7,name:'a crate tower'}))];}
 // Career navigation helpers (v0.70).
 function crateTarget(){const c=crates.find(c=>!c.taken);return c?{name:'Crate pickup · lower your hook (mouse wheel) through the ring',normal:c.normal}:null;}
 function mastTargets(){return masts.filter(mm=>!mm.taken).map(mm=>({name:'Mailbag mast · lower your hook (mouse wheel) through the bag',normal:mm.normal}));}
 function releaseCrate(){const c=crates.find(c=>c.carried);if(!c)return null;c.carried=false;c.load.visible=false;return c;}
 function nearestFuel(normal){let best=null,bd=Infinity;for(const h of fuelHoops){const d=h.normal.distanceTo(normal);if(d<bd){bd=d;best=h;}}return best;}
 // World positions of hook targets and birds (used by automated play tests).
 function targets(){return {hooks:masts.map(mm=>mm.hook.clone()),birds:flocks.flatMap(fl=>fl.birds.map(b=>b.g.position.clone())),storms:storms.map(st=>st.center.clone()),urgent:urgent.map(u=>u.sprite.visible)};}
 // Seconds until a parcel dropped now would land (null hides the boat lead markers).
 function setLead(seconds){leadTime=seconds;}
 return {crateTarget,mastTargets,releaseCrate,get carrying(){return crates.some(c=>c.carried);},start,clear,update,setLead,status,navTarget,markers,summary,targets,obstacles,nearestFuel,get wind(){return f?.wind||null;},get buffet(){return buffet;},get mailLeft(){return masts.length-mailTaken;},get hasMail(){return masts.length>0;},get windy(){return !!f?.wind;}};
}
