// Delivery celebration at a pad: the parcel sits where it landed with its parachute settling,
// a recipient runs out, picks it up, lifts it overhead with a little hop, waves, and heads home.
// Confetti bursts on touchdown and again on pickup. Everything lives in a scaled group inside
// the pad's own group (+Y up), so people stay readable from the chase camera.
export const CELEBRATION_TIME=5.6;
const SCALE=1.8;
const RUN_END=1.4,PICK_END=1.8,LIFT_END=3.6,WAVE_END=4.7;

// Pure timeline: what the recipient is doing at time t (seconds since touchdown).
export function celebrationPhase(t){
 if(t<RUN_END)return {phase:'run',u:t/RUN_END};
 if(t<PICK_END)return {phase:'pick',u:(t-RUN_END)/(PICK_END-RUN_END)};
 if(t<LIFT_END)return {phase:'lift',u:(t-PICK_END)/(LIFT_END-PICK_END)};
 if(t<WAVE_END)return {phase:'wave',u:(t-LIFT_END)/(WAVE_END-LIFT_END)};
 return {phase:'leave',u:Math.min(1,(t-WAVE_END)/(CELEBRATION_TIME-WAVE_END))};
}

export function createCelebrations({T,mat,kit}){
 const active=[];
 const confettiColors=['#ffd57b','#f4f1e4','#e85d4a','#63d6f6','#8fdc9e'].map(c=>mat(c,{side:T.DoubleSide}));
 const confettiGeo=new T.BoxGeometry(.16,.02,.1);
 const canopyMats=[mat('#c14a38',{side:T.DoubleSide}),mat('#f1e5c6',{side:T.DoubleSide})];
 const hats=[null,mat('#e8c56a'),mat('#5a7f9c'),null];
 let count=0;
 function burst(c,x,y,z,n,power){
  for(let i=0;i<n;i++){const m=new T.Mesh(confettiGeo,confettiColors[i%confettiColors.length]);m.position.set(x,y,z);c.root.add(m);
   const a=Math.random()*Math.PI*2,r=Math.random()*power*.45;
   c.confetti.push({m,v:new T.Vector3(Math.cos(a)*r,power*(.6+Math.random()*.6),Math.sin(a)*r),spin:new T.Vector3(Math.random()*9,Math.random()*9,Math.random()*9),life:2+Math.random()*.8});}
 }
 // padGroup: the stop's group (origin on the pad, +Y up). landingWorld: Vector3 where the parcel touched down.
 function start(padGroup,landingWorld,stopColor){
  const root=new T.Group();root.scale.setScalar(SCALE);padGroup.add(root);
  const local=padGroup.worldToLocal(landingWorld.clone()).divideScalar(SCALE);local.y=0;
  // Keep the action on the pad even for an edge-of-pad landing.
  const reach=6.6/SCALE;if(Math.hypot(local.x,local.z)>reach){const k=reach/Math.hypot(local.x,local.z);local.x*=k;local.z*=k;}
  const crate=kit.crate();crate.position.set(local.x,.19,local.z);crate.rotation.y=Math.random()*Math.PI;root.add(crate);
  const canopy=new T.Group();canopy.position.set(local.x+.55,.03,local.z+.2);root.add(canopy);
  for(let i=0;i<6;i++){const s=new T.Mesh(new T.CircleGeometry(.75,1,i*Math.PI/3,Math.PI/3),canopyMats[i%2]);s.rotation.x=-Math.PI/2;canopy.add(s);}
  // Recipient starts a few steps away, on the side of the pad nearer its center.
  const away=Math.atan2(-local.z,-local.x)+(Math.random()-.5)*.8;
  const from={x:local.x+Math.cos(away)*2.6,z:local.z+Math.sin(away)*2.6};
  const shirt=mat(stopColor);const who=kit.person(root,{shirt,hat:hats[count%hats.length],skin:count,stripe:false});count++;
  who.g.position.set(from.x,0,from.z);
  const c={root,crate,canopy,who,from,at:{x:local.x,z:local.z},t:0,confetti:[],picked:false,shirt};
  burst(c,local.x,.4,local.z,26,4.2);active.push(c);return c;
 }
 function update(dt){
  for(let i=active.length-1;i>=0;i--){const c=active[i];c.t+=dt;const {phase,u}=celebrationPhase(c.t),p=c.who;
   const ease=u*u*(3-2*u),dx=c.at.x-c.from.x,dz=c.at.z-c.from.z,len=Math.hypot(dx,dz);
   // Stand just short of the crate so the recipient reaches for it instead of standing on it.
   const stop=Math.max(0,1-.45/len);
   c.canopy.scale.setScalar(Math.max(.35,1-c.t*.4));
   if(phase==='run'){p.g.position.set(c.from.x+dx*stop*ease,0,c.from.z+dz*stop*ease);p.g.rotation.y=kit.yawToward(dx,dz);kit.stride(p,c.t*13,false,1.2);p.g.scale.setScalar(Math.min(1,c.t*5));}
   else if(phase==='pick'){kit.stride(p,0,false,0);p.body.rotation.x=-Math.sin(u*Math.PI)*.5;p.arms[0].rotation.x=p.arms[1].rotation.x=-1.1;
    if(u>.5&&!c.picked){c.picked=true;c.crate.visible=false;p.held.visible=true;burst(c,c.at.x,.6,c.at.z,14,3);}}
   else if(phase==='lift'){p.body.rotation.x=0;const hop=Math.abs(Math.sin(u*Math.PI*3));p.body.position.y=hop*.32;p.legs[0].rotation.x=p.legs[1].rotation.x=-hop*.4;
    p.arms[0].rotation.x=p.arms[1].rotation.x=-2.9;p.held.position.set(0,1.62,-.05);p.g.rotation.y+=dt*1.6;}
   else if(phase==='wave'){p.body.position.y=0;p.legs[0].rotation.x=p.legs[1].rotation.x=0;p.held.position.set(0,.78,-.32);p.arms[0].rotation.x=-1.25;p.arms[1].rotation.x=-1.25;
    p.arms[1].rotation.x=-2.8;p.arms[1].rotation.z=Math.sin(c.t*11)*.4;}
   else{kit.stride(p,c.t*11,true);p.held.visible=true;p.g.rotation.y=kit.yawToward(-dx,-dz);p.g.position.x-=dx/len*dt*1.5;p.g.position.z-=dz/len*dt*1.5;p.g.scale.setScalar(Math.max(.001,1-u));}
   for(let j=c.confetti.length-1;j>=0;j--){const f=c.confetti[j];f.life-=dt;f.v.y-=7*dt;f.v.multiplyScalar(Math.exp(-1.6*dt));if(f.v.y<-1.4)f.v.y=-1.4; // flutter down
    f.m.position.addScaledVector(f.v,dt);if(f.m.position.y<.02){f.m.position.y=.02;f.v.set(0,0,0);}else{f.m.rotation.x+=f.spin.x*dt;f.m.rotation.y+=f.spin.y*dt;f.m.rotation.z+=f.spin.z*dt;}
    if(f.life<=0){c.root.remove(f.m);c.confetti.splice(j,1);}}
   if(c.t>=CELEBRATION_TIME&&!c.confetti.length)dispose(c,i);
  }
 }
 function dispose(c,i){c.root.parent?.remove(c.root);c.root.traverse(o=>{if(o.geometry&&o.geometry!==confettiGeo)o.geometry.dispose();});c.shirt.dispose();active.splice(i,1);}
 function clear(){for(let i=active.length-1;i>=0;i--)dispose(active[i],i);}
 return {start,update,clear,get count(){return active.length;}};
}
