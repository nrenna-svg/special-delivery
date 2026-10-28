// Visual upgrade layer: a sun that follows the plane with real shadows, a gradient sky dome with
// sun glow, an animated faceted ocean with turquoise shallows and shoreline surf, island details
// (palms, rocks, bushes, flowers, docks), fuller clouds, plane details (cowling, exhausts,
// wingtip lights, pilot scarf, propeller blur, exhaust puffs) and water splashes.
// Everything uses its own random seed so the original island layout is unchanged.
import {RADIUS} from './flight.js';
import {DESERT} from './worlds.js';
import {mesaHeight} from './hazards.js';

export function createGraphics({T,renderer,scene,camera,sun,hemi,fill,ocean,islands,visual,prop,clouds,mat,palette,blocked=()=>false,lite=false}){
 let seed=99173;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const up=new T.Vector3(0,1,0),tmp=new T.Vector3(),tmp2=new T.Vector3();
 const add=(geo,material,p)=>{const o=new T.Mesh(geo,material);p.add(o);return o;};
 const box=(p,w,h,d,x,y,z,material)=>{const o=add(new T.BoxGeometry(w,h,d),material,p);o.position.set(x,y,z);return o;};
 const slerp=(a,b,u)=>{const d=Math.max(-1,Math.min(1,a.dot(b))),w=Math.acos(d),s=Math.sin(w);return w<1e-6?a.clone():a.clone().multiplyScalar(Math.sin((1-u)*w)/s).addScaledVector(b,Math.sin(u*w)/s).normalize();};
 const surface=(n,alt,parent=scene)=>{const g=new T.Group();g.position.copy(n).multiplyScalar(RADIUS+alt);g.quaternion.setFromUnitVectors(up,n);parent.add(g);return g;};
 const groundAt=(r,h=0)=>h?mesaHeight(h,r):r>.86?.25:1+Math.sin((1-r)*Math.PI)*1.1;

 // ── Sun and shadows ───────────────────────────────────────────────────────────
 if(!lite){renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  const c=sun.shadow.camera;c.left=-42;c.right=42;c.top=42;c.bottom=-42;c.near=10;c.far=320;sun.shadow.bias=-.0006;sun.shadow.normalBias=.04;}
 scene.add(sun.target);
 function shadowify(obj){obj.traverse(o=>{if(!o.isMesh)return;const mt=o.material;const see=!mt.transparent&&!mt.vertexColors&&!o.userData.noCast;o.castShadow=see;o.receiveShadow=true;});}

 // ── Sky dome ──────────────────────────────────────────────────────────────────
 const skyMat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,uniforms:{horizon:{value:new T.Color()},zenith:{value:new T.Color()},sunDir:{value:new T.Vector3(0,1,0)},upDir:{value:new T.Vector3(0,1,0)},glow:{value:new T.Color('#fff1c9')},glowAmt:{value:.7}},
  vertexShader:'varying vec3 vDir;void main(){vec4 w=modelMatrix*vec4(position,1.);vDir=w.xyz-cameraPosition;gl_Position=projectionMatrix*viewMatrix*w;}',
  fragmentShader:'uniform vec3 horizon,zenith,sunDir,upDir,glow;uniform float glowAmt;varying vec3 vDir;void main(){vec3 d=normalize(vDir);float h=dot(d,upDir);vec3 c=mix(horizon,zenith,smoothstep(.02,.65,h));c=mix(c,horizon*.86,smoothstep(0.,-.4,h));float s=max(dot(d,sunDir),0.);c+=glow*(pow(s,32.)*.9+pow(s,5.)*.22)*glowAmt;gl_FragColor=vec4(c,1.);}'});
 const dome=new T.Mesh(new T.SphereGeometry(470,32,18),skyMat);dome.renderOrder=-1;dome.frustumCulled=false;scene.add(dome);
 const deepSky=new T.Color('#2d6aa8'),nightSky=new T.Color('#040817');

 // ── Ocean: finer facets, gentle animated swell, shallows around islands ───────
 const oceanGeo=new T.IcosahedronGeometry(RADIUS,lite?26:44);const pos=oceanGeo.attributes.position,colors=[];
 // Mesa Rojo (v0.74): the 'ocean' is a sand sea, rust-red around the mesas fading to pale dunes.
 const deep=new T.Color(DESERT?'#e6c08a':'#1f7899'),mid=new T.Color(DESERT?'#ddb07a':'#258caa'),shallow=new T.Color(DESERT?'#c98955':'#45c3c0'),lagoon=new T.Color(DESERT?'#b8693f':'#7fdcc9'),cc=new T.Color();
 for(let i=0;i<pos.count;i++){tmp.fromBufferAttribute(pos,i).normalize();let best=9;for(const isl of islands){const r=Math.acos(Math.max(-1,Math.min(1,tmp.dot(isl.n))))*RADIUS/isl.size;if(r<best)best=r;}
  if(best<1.08)cc.copy(lagoon).lerp(shallow,Math.min(1,(best-.85)/.23));else if(best<1.6)cc.copy(shallow).lerp(mid,(best-1.08)/.52);else cc.copy(mid).lerp(deep,Math.min(1,(best-1.6)/1.4));colors.push(cc.r,cc.g,cc.b);}
 oceanGeo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 const waterTime={value:0};
 const waterMat=new T.MeshStandardMaterial({vertexColors:true,flatShading:true,roughness:DESERT?.95:.32,metalness:DESERT?0:.12});
 waterMat.onBeforeCompile=sh=>{sh.uniforms.uTime=waterTime;sh.vertexShader='uniform float uTime;\n'+sh.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nfloat sw=sin(dot(position,vec3(.21,.17,.13))+uTime*1.3)*.07+sin(dot(position,vec3(-.11,.29,.07))*1.7+uTime*.9)*.05+sin(dot(position,vec3(.31,-.05,.23))*2.3-uTime*1.7)*.03;transformed+=normalize(position)*sw*'+(DESERT?'0.0':'1.0')+';');};
 ocean.geometry.dispose();ocean.geometry=oceanGeo;ocean.material=waterMat;ocean.receiveShadow=true;ocean.userData.noCast=true;

 // ── Shoreline surf ────────────────────────────────────────────────────────────
 const foamMat=new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.5,depthWrite:false,side:T.DoubleSide});
 for(const isl of islands){if(!isl.outline||DESERT)continue;const v=[],o=isl.outline,c=isl.n;
  for(let i=0;i<o.length;i++){const a=o[i],b=o[(i+1)%o.length];const a1=slerp(c,a,.985).multiplyScalar(RADIUS+.16),a2=slerp(c,a,1.1).multiplyScalar(RADIUS+.1),b1=slerp(c,b,.985).multiplyScalar(RADIUS+.16),b2=slerp(c,b,1.1).multiplyScalar(RADIUS+.1);
   for(const p of [a1,a2,b2,a1,b2,b1])v.push(p.x,p.y,p.z);}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(v,3));const f=new T.Mesh(g,foamMat);f.userData.noCast=true;scene.add(f);}

 // ── Island details ────────────────────────────────────────────────────────────
 const m={palm:mat('#8a6a45'),frond:mat('#3f8f4f'),frond2:mat('#5aa95a'),nut:mat('#5b3b22'),rock:mat('#8d8b82'),rock2:mat('#6e6f69'),bush:[mat('#4f8a52'),mat('#3e7a4b'),mat('#6aa25a')],
  flower:[mat('#f2c14e'),mat('#e8706a'),mat('#f4f1e4'),mat('#b98ee0')],plank:mat('#a07a50'),post:mat('#5d4632'),dinghy:mat('#e9e2d0'),dinghy2:mat('#d8473a')};
 function palm(g){const h=3.2+rnd()*1.6,lean=(rnd()-.5)*.5;let y=0,x=0;for(let k=0;k<5;k++){const seg=add(new T.CylinderGeometry(.16,.2,h/5+.05,6),m.palm,g);x+=Math.sin(lean)*h/5*.6;seg.position.set(x,y+h/10,0);seg.rotation.z=-lean*.6;y+=h/5;}
  for(let k=0;k<7;k++){const f=add(new T.ConeGeometry(.45,2.6,4),k%2?m.frond:m.frond2,g);const a=k/7*Math.PI*2;f.position.set(x+Math.cos(a)*1,y-.15,Math.sin(a)*1);f.rotation.set(Math.sin(a)*1.9,0,-Math.cos(a)*1.9);f.scale.set(1,1,.25);}
  for(let k=0;k<3;k++){const n=add(new T.IcosahedronGeometry(.17,0),m.nut,g);n.position.set(x+Math.cos(k*2)*.22,y-.35,Math.sin(k*2)*.22);}}
 if(DESERT){const red=[mat('#a9553a'),mat('#8a4430'),mat('#c46a44')],sage=[mat('#9aa36b'),mat('#7f8a58'),mat('#b5ab72')],cac=mat('#5d8a4a');
  for(const isl of islands){if(!isl.outline)continue;const c=isl.n,h=isl.h||0;const pick=r=>{const o=isl.outline[Math.floor(rnd()*isl.outline.length)];return {n:slerp(c,o,r),r};};
   // Boulders scattered at the foot of the cliffs, sage scrub and small cacti on top.
   for(let k=0;k<16;k++){const p=pick(.9+rnd()*.25);if(blocked(p.n))continue;const g=surface(p.n,.05);for(let j=0;j<1+Math.floor(rnd()*3);j++){const r=add(new T.DodecahedronGeometry(.6+rnd()*1.3,0),red[(k+j)%3],g);r.position.set((rnd()-.5)*3,.3,(rnd()-.5)*3);r.scale.y=.75;r.rotation.set(rnd(),rnd(),rnd());}}
   for(let k=0;k<14;k++){const p=pick(.1+rnd()*.6);if(blocked(p.n))continue;const g=surface(p.n,groundAt(p.r,h)-.1);const b=add(new T.IcosahedronGeometry(.45+rnd()*.4,0),sage[k%3],g);b.position.y=.3;b.scale.y=.6;}
   for(let k=0;k<6;k++){const p=pick(.15+rnd()*.5);if(blocked(p.n))continue;const g=surface(p.n,groundAt(p.r,h));const hh=1+rnd()*1.5;box(g,.3,hh,.3,0,hh/2,0,cac);if(rnd()<.6){box(g,.5,.22,.22,.3,hh*.55,0,cac);box(g,.22,.6,.22,.5,hh*.55+.3,0,cac);}}}
 }else for(const isl of islands){if(!isl.outline)continue;const c=isl.n;const pick=r=>{const o=isl.outline[Math.floor(rnd()*isl.outline.length)];return {n:slerp(c,o,r),r};};
  for(let k=0;k<8;k++){const p=pick(.86+rnd()*.08);if(blocked(p.n))continue;const g=surface(p.n,groundAt(p.r)-.05);g.rotateY(rnd()*6.28);palm(g);}
  for(let k=0;k<9;k++){const p=pick(.92+rnd()*.14);if(blocked(p.n))continue;const g=surface(p.n,.05);for(let j=0;j<1+Math.floor(rnd()*3);j++){const r=add(new T.DodecahedronGeometry(.5+rnd()*.9,0),rnd()<.5?m.rock:m.rock2,g);r.position.set((rnd()-.5)*2,.2,(rnd()-.5)*2);r.scale.y=.7;r.rotation.set(rnd(),rnd(),rnd());}}
  for(let k=0;k<12;k++){const p=pick(.15+rnd()*.6);if(blocked(p.n))continue;const g=surface(p.n,groundAt(p.r)-.1);const b=add(new T.IcosahedronGeometry(.6+rnd()*.6,0),m.bush[k%3],g);b.position.y=.45;b.scale.y=.75;}
  for(let k=0;k<10;k++){const p=pick(.2+rnd()*.55);if(blocked(p.n))continue;const g=surface(p.n,groundAt(p.r));const fm=m.flower[k%4];for(let j=0;j<7;j++){const f=box(g,.22,.22,.22,(rnd()-.5)*2.2,.1,(rnd()-.5)*2.2,fm);f.userData.noCast=true;}}
  // A little dock with a moored dinghy.
  {const p=pick(1.0);if(!blocked(p.n)){const out=slerp(c,isl.outline[0],1.0),dir=tmp.copy(out).sub(c).normalize();const g=surface(out,.35);const local=dir.clone().applyQuaternion(g.quaternion.clone().invert());g.rotateY(Math.atan2(local.x,local.z));
   box(g,1.6,.14,7,0,0,2.5,m.plank);for(const z of [0,2,4,6])for(const x of [-.8,.8])box(g,.18,1.4,.18,x,-.5,z,m.post);
   const d=new T.Group();d.position.set(1.8,-.15,5);g.add(d);box(d,1.1,.45,2.6,0,0,0,m.dinghy);box(d,1.15,.12,2.65,0,.2,0,m.dinghy2);}}
 }

 // ── Fuller clouds with shaded undersides ──────────────────────────────────────
 const cloudTop=mat('#fbf8ef'),cloudBottom=mat('#d9dde0');
 for(let i=0;i<(DESERT?18:56);i++){const n=new T.Vector3(rnd()-.5,rnd()-.5,rnd()-.5).normalize();const g=new T.Group();g.position.copy(n).multiplyScalar(RADIUS+44+rnd()*24);g.quaternion.setFromUnitVectors(up,n);clouds.add(g);
  const count=5+Math.floor(rnd()*4);for(let j=0;j<count;j++){const r=2+rnd()*2.6;const top=add(new T.IcosahedronGeometry(r,1),cloudTop,g);top.position.set(j*2.6-count*1.3,rnd()*1.2+.6,(rnd()-.5)*3);top.scale.set(1.3,.7,1.1);
   const bot=add(new T.IcosahedronGeometry(r*.95,1),cloudBottom,g);bot.position.copy(top.position).y-=.9;bot.scale.set(1.25,.45,1.05);}}
 clouds.traverse(o=>{if(o.isMesh)o.userData.noCast=true;});

 // ── Plane details ─────────────────────────────────────────────────────────────
 const dm={metal:mat('#7b8b92',{metalness:.5,roughness:.4}),dark:palette.dark,red:palette.red,skin:mat('#e2b48c'),scarf:mat('#e64a3b',{side:T.DoubleSide}),goggle:mat('#2b3a40',{metalness:.6,roughness:.2}),
  left:mat('#ff4a3a',{emissive:'#ff2a1a',emissiveIntensity:1.4}),right:mat('#3dff8a',{emissive:'#13d05e',emissiveIntensity:1.4}),white:mat('#fff7dd',{emissive:'#fff1c0',emissiveIntensity:1})};
 const cowl=add(new T.TorusGeometry(.5,.08,6,16),dm.metal,visual);cowl.position.z=-1.66;
 const exhausts=[];for(const s of [-1,1])for(let k=0;k<3;k++){const e=add(new T.CylinderGeometry(.06,.07,.32,6),dm.dark,visual);e.rotation.z=Math.PI/2*s*.6;e.position.set(s*.55,-.05-k*.12+.1,-1.25+k*.22);exhausts.push(e);}
 for(const x of [-3.55,3.55])box(visual,.6,.02,1.2,x*.86,1.09,-.3,palette.white);box(visual,7.82,.02,.18,0,1.09,-.92,palette.red);
 const tipL=add(new T.IcosahedronGeometry(.12,0),dm.left,visual);tipL.position.set(-3.9,1,-.3);const tipR=add(new T.IcosahedronGeometry(.12,0),dm.right,visual);tipR.position.set(3.9,1,-.3);const tail=add(new T.IcosahedronGeometry(.1,0),dm.white,visual);tail.position.set(0,1.25,2.05);
 const head=add(new T.IcosahedronGeometry(.2,1),dm.skin,visual);head.position.set(0,.86,.45);box(visual,.34,.08,.1,0,.9,.28,dm.goggle);
 const scarf=new T.Group();scarf.position.set(0,.72,.58);visual.add(scarf);const scarfMesh=box(scarf,.05,.16,1.1,0,0,.55,dm.scarf);scarfMesh.userData.noCast=true;
 const blur=add(new T.CircleGeometry(1.3,24),new T.MeshBasicMaterial({color:'#e8e2d0',transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide}),prop);blur.position.z=-.05;blur.userData.noCast=true;
 // Exhaust puffs.
 const puffMat=new T.MeshBasicMaterial({color:'#c9cdca',transparent:true,opacity:.5,depthWrite:false});const puffs=[];for(let k=0;k<26;k++){const p=new T.Mesh(new T.IcosahedronGeometry(.18,0),puffMat.clone());p.visible=false;p.userData.noCast=true;scene.add(p);puffs.push({mesh:p,life:0,v:new T.Vector3()});}
 let puffTick=0,puffIdx=0;
 // Splashes on the water.
 const splashes=[];const splashMat=new T.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.7,depthWrite:false,side:T.DoubleSide});
 function splash(world,size=1){const n=world.clone().normalize();const g=surface(n,.2);const ring=add(new T.RingGeometry(.6,1.1,20),splashMat.clone(),g);ring.rotation.x=-Math.PI/2;const drops=[];
  for(let k=0;k<14;k++){const d=add(new T.IcosahedronGeometry(.2*size,0),splashMat.clone(),g);d.userData.v=new T.Vector3((rnd()-.5)*5,4+rnd()*5,(rnd()-.5)*5).multiplyScalar(size);drops.push(d);}splashes.push({g,ring,drops,t:0,size});}

 shadowify(scene);
 const fwdV=new T.Vector3(),rightV=new T.Vector3(),sunDir=new T.Vector3(),world=new T.Vector3();
 // state: plane flight state; planeWorld: plane position; engine: 0..1 prop speed; night: 0..1.
 function update(dt,{state,planeWorld,engine=1,time=0}){
  waterTime.value=time;
  // Sun high behind and to the right of the plane, so its shadow sits just ahead-left on the ground.
  fwdV.copy(state.forward);rightV.crossVectors(state.forward,state.normal).normalize();sunDir.copy(state.normal).addScaledVector(fwdV,-.32).addScaledVector(rightV,.5).normalize();
  sun.position.copy(planeWorld).addScaledVector(sunDir,150);sun.target.position.copy(planeWorld);sun.target.updateMatrixWorld();
  fill.position.copy(planeWorld).addScaledVector(sunDir,-120);
  // Sky follows the scene's background color (which the night sky also changes).
  dome.position.copy(camera.position);skyMat.uniforms.horizon.value.copy(scene.background);
  const lum=scene.background.r*.3+scene.background.g*.59+scene.background.b*.11;skyMat.uniforms.zenith.value.copy(scene.background).lerp(lum<.3?nightSky:deepSky,.55);
  skyMat.uniforms.sunDir.value.copy(sunDir);skyMat.uniforms.upDir.value.copy(state.normal);skyMat.uniforms.glowAmt.value=Math.min(1,lum*1.6);
  foamMat.opacity=.36+Math.sin(time*1.6)*.14;
  // Plane details.
  scarf.rotation.y=Math.sin(time*13)*.25*Math.min(1,state.speed/15);scarf.rotation.x=-.15+Math.sin(time*9)*.08;scarfMesh.scale.z=.8+Math.sin(time*17)*.12;
  blur.material.opacity=Math.min(.22,engine*.22);
  const blink=(time*1.2)%1<.12;tail.visible=blink||engine<.1;
  puffTick+=dt;if(engine>.2&&puffTick>.07){puffTick=0;const e=exhausts[puffIdx%exhausts.length];const p=puffs[puffIdx++%puffs.length];e.getWorldPosition(world);p.mesh.position.copy(world);p.mesh.visible=true;p.life=.9;p.v.copy(state.forward).multiplyScalar(-4).addScaledVector(state.normal,.6);}
  for(const p of puffs){if(!p.mesh.visible)continue;p.life-=dt;p.mesh.position.addScaledVector(p.v,dt);p.mesh.scale.setScalar(1+(.9-p.life)*3);p.mesh.material.opacity=Math.max(0,p.life*.5);if(p.life<=0)p.mesh.visible=false;}
  for(let i=splashes.length-1;i>=0;i--){const s=splashes[i];s.t+=dt;s.ring.scale.setScalar(1+s.t*6*s.size);s.ring.material.opacity=Math.max(0,.7-s.t*.6);
   for(const d of s.drops){d.userData.v.y-=14*dt;d.position.addScaledVector(d.userData.v,dt);d.material.opacity=Math.max(0,.8-s.t*.7);}
   if(s.t>1.3){scene.remove(s.g);s.g.traverse(o=>{o.geometry?.dispose();o.material?.dispose?.();});splashes.splice(i,1);}}
 }
 return {update,shadowify,splash};
}
