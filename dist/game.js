import * as T from './vendor/three.module.js';
import {newFlight,advance,startStunt,RADIUS} from './flight.js';
import {newRoute,makeParcel,stepParcel,predictDrop,safeDropAltitude,RELEASE_DELAY,resolveDelivery} from './delivery.js';
import {drawMinimap} from './minimap.js';
const $=id=>document.getElementById(id), canvas=$('world');
let renderer;
try{renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(e){$('error').hidden=false;throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const scene=new T.Scene();scene.background=new T.Color('#83bdcd');
scene.fog=new T.Fog('#83bdcd',240,530);
const camera=new T.PerspectiveCamera(78,1,.1,1000);
scene.add(new T.HemisphereLight('#fff7de','#6590ab',2.5));
const sun=new T.DirectionalLight('#fff2c5',3.1);sun.position.set(-150,260,180);scene.add(sun);
const fill=new T.DirectionalLight('#a7d7f5',1.2);fill.position.set(90,-180,-120);scene.add(fill);
const mat=(color,extra={})=>new T.MeshStandardMaterial({color,roughness:.85,flatShading:true,...extra});
const palette={sand:mat('#e0c489'),grass:mat('#6c9a62'),leaf:mat('#316858'),trunk:mat('#806948'),stone:mat('#788a87'),white:mat('#f1e5c6'),red:mat('#c14a38'),dark:mat('#263e45'),gold:mat('#edb949'),metal:mat('#8199a2')};
function mesh(geometry,material,parent=scene){const m=new T.Mesh(geometry,material);parent.add(m);return m;}
function box(parent,w,h,d,x,y,z,material){const m=mesh(new T.BoxGeometry(w,h,d),material,parent);m.position.set(x,y,z);return m;}
function sphere(parent,r,x,y,z,material,detail=0){const m=mesh(new T.IcosahedronGeometry(r,detail),material,parent);m.position.set(x,y,z);return m;}
let seed=8731;function rand(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
const ocean=mesh(new T.IcosahedronGeometry(RADIUS,5),mat('#258caa',{metalness:.16,roughness:.58}));
const islands=[];
function surfacePoint(n,x,z,r=RADIUS){const up=new T.Vector3(0,1,0);const q=new T.Quaternion().setFromUnitVectors(up,n);return new T.Vector3(x,r,z).normalize().multiplyScalar(r).applyQuaternion(q);}
function place(n,height=0){const g=new T.Group();g.position.copy(n).multiplyScalar(RADIUS+height);g.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),n);scene.add(g);return g;}
function island(n,size,label){n.normalize();islands.push({n,size,label});const rings=9,segments=42,verts=[],colors=[];const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),n);const noise=Array.from({length:segments},()=>.87+rand()*.24);
 function pt(r,i){const a=i/segments*Math.PI*2, rr=r*size*noise[i%segments];const h=r>.86?.25:1.0+Math.sin((1-r)*Math.PI)*1.1;return new T.Vector3(Math.cos(a)*rr,RADIUS,Math.sin(a)*rr).normalize().multiplyScalar(RADIUS+h).applyQuaternion(q);}
 islands[islands.length-1].outline=Array.from({length:segments},(_,i)=>pt(1,i).normalize());
 for(let r=0;r<rings;r++)for(let i=0;i<segments;i++){const a=pt(r/rings,i),b=pt((r+1)/rings,i),c=pt((r+1)/rings,i+1),d=pt(r/rings,i+1);for(const p of [a,c,b,a,d,c])verts.push(p.x,p.y,p.z);const color=new T.Color(r>=7?'#dec58f':r>=6?'#a5af74':['#78a46b','#6d9863','#83a970'][Math.floor(rand()*3)]);for(let j=0;j<6;j++)colors.push(color.r,color.g,color.b);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();mesh(geo,mat('#ffffff',{vertexColors:true,side:T.DoubleSide}));
 for(let i=0;i<24;i++){const a=rand()*Math.PI*2,r=Math.sqrt(rand())*size*.72;const normal=surfacePoint(n,Math.cos(a)*r,Math.sin(a)*r).normalize();if(normal.y>.98&&Math.abs(normal.x)<.03&&Math.abs(normal.z)<.12)continue;const g=place(normal,1.4),h=2+rand()*3;box(g,.35,h*.6,.35,0,h*.3,0,palette.trunk);const leaf=mesh(new T.ConeGeometry(1.5,h,6),palette.leaf,g);leaf.position.y=h*.7;}
 for(let i=0;i<5;i++){const normal=surfacePoint(n,(rand()-.5)*size*.9,(rand()-.5)*size*.9).normalize();if(normal.y>.98&&Math.abs(normal.x)<.03&&Math.abs(normal.z)<.12)continue;const g=place(normal,1.2),h=1+rand()*2;box(g,2,h,2.7,0,h/2,0,palette.white);const roof=mesh(new T.ConeGeometry(2,1.1,4),palette.red,g);roof.position.y=h+.45;roof.rotation.y=Math.PI/4;}
}
island(new T.Vector3(0,1,-.22),39,'KESTREL ISLAND');
island(new T.Vector3(.42,.42,-1),38,'THE EMERALD REACH');
island(new T.Vector3(-.2,-.6,-1),33,'SOUTHERN ATOLLS');
island(new T.Vector3(.1,-1,.15),43,'SUNSET ARCHIPELAGO');
island(new T.Vector3(-.5,-.25,1),35,'LIGHTHOUSE COAST');
island(new T.Vector3(.1,.65,1),31,'THE HOMEWARD ISLES');
island(new T.Vector3(1,.1,.1),42,'EASTERN WILDS');
island(new T.Vector3(-1,.3,-.1),37,'WESTERN REACH');
// A runway and striped lighthouse make home recognizable from every approach.
const home=place(new T.Vector3(0,1,0),2.25);box(home,5,.12,29,0,0,0,palette.dark);
for(let i=-12;i<=12;i+=4)box(home,.22,.05,1.7,0,.1,i,palette.white);
for(const x of [-2.8,2.8])for(let z=-12;z<=12;z+=6)sphere(home,.18,x,.2,z,mat('#ffdb84'));
const tower=place(new T.Vector3(.16,1,-.15).normalize(),1.8);
for(let i=0;i<5;i++){const m=mesh(new T.CylinderGeometry(1.2-i*.12,1.3-i*.12,1.1,8),i%2?palette.red:palette.white,tower);m.position.y=i*1.1+.55;}
sphere(tower,.85,0,5.8,0,mat('#ffe7a1',{emissive:'#ffb74c',emissiveIntensity:.5}));
// Faceted water glints hug the sphere rather than forming a flat ground plane.
const glintmat=mat('#8bc7cd',{transparent:true,opacity:.42});
for(let i=0;i<260;i++){const n=new T.Vector3(rand()-.5,rand()-.5,rand()-.5).normalize();const g=place(n,.15);box(g,.5+rand()*3,.025,.12,0,0,0,glintmat);}
const clouds=new T.Group();scene.add(clouds);const cloudmat=mat('#f4f1e4');
for(let i=0;i<45;i++){const n=new T.Vector3(rand()-.5,rand()-.5,rand()-.5).normalize();const g=new T.Group();g.position.copy(n).multiplyScalar(RADIUS+38+rand()*25);g.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),n);clouds.add(g);for(let j=0;j<4;j++){const puff=sphere(g,2.5+rand()*2,j*3-4,rand(),rand()*2,cloudmat,1);puff.scale.set(1.4,.65,1);}}
// Plane is built in local axes: up +Y, nose -Z. Each wing, strut and wheel is geometry.
const aircraft=new T.Group();scene.add(aircraft);const visual=new T.Group();aircraft.add(visual);
const fuselage=sphere(visual,1,0,0,0,palette.gold,1);fuselage.scale.set(.57,.55,2.05);
box(visual,7.8,.16,1.35,0,1,-.3,palette.gold);box(visual,7.1,.14,1.25,0,-.45,-.15,palette.gold);
for(const x of [-3.1,3.1]){box(visual,.09,1.45,.09,x,.25,-.75,palette.dark);box(visual,.09,1.45,.09,x,.25,.2,palette.dark);box(visual,.6,.18,1.37,x,1.01,-.3,palette.red);}
for(const x of [-.65,.65]){const strut=box(visual,.08,.9,.08,x,.65,-.6,palette.dark);strut.rotation.z=x>0?-.3:.3;}
box(visual,2.6,.13,.85,0,.15,1.65,palette.gold);const rudder=box(visual,.13,1.2,.9,0,.6,1.65,palette.red);rudder.rotation.x=-.2;
const cockpit=sphere(visual,.42,0,.43,.4,palette.dark,1);cockpit.scale.set(.85,.35,1.2);
sphere(visual,.25,0,.65,.45,palette.trunk,1);const glass=sphere(visual,.33,0,.6,.02,mat('#8dc9d3',{metalness:.3}),1);glass.scale.set(1,.9,.35);
const nose=mesh(new T.CylinderGeometry(.48,.52,.4,12),palette.dark,visual);nose.rotation.x=Math.PI/2;nose.position.z=-1.85;
const prop=new T.Group();prop.position.z=-2.12;visual.add(prop);box(prop,.13,2.5,.09,0,0,0,palette.trunk);sphere(prop,.19,0,0,-.1,palette.metal,1);
for(const x of [-.65,.65]){const leg=box(visual,.1,.6,.1,x,-.75,-.45,palette.dark);leg.rotation.z=x>0?-.2:.2;const wheel=mesh(new T.CylinderGeometry(.33,.33,.19,10),palette.dark,visual);wheel.rotation.z=Math.PI/2;wheel.position.set(x,-1,-.45);}
const trailMaterial=mat('#ffffff',{transparent:true,opacity:.24});const trails=[];
for(let i=0;i<28;i++){const m=sphere(scene,.11,0,0,0,trailMaterial);m.visible=false;trails.push(m);}
let state=newFlight(),mode='intro',keys={},last=performance.now(),trailIndex=0,trailTick=0,noticeUntil=0,lapArmed=false,laps=0,tripAngle=0,previousLongitude=0;
let route=newRoute(),packages=[],dropCooldown=0,deliveryElapsed=0,pendingDrop=null;const fragments=[];
const destinations=[];
function label(text){const c=document.createElement('canvas');c.width=128;c.height=128;const cx=c.getContext('2d');cx.fillStyle='#173e49';cx.beginPath();cx.arc(64,64,52,0,Math.PI*2);cx.fill();cx.strokeStyle='#ffdd87';cx.lineWidth=6;cx.stroke();cx.font='bold 62px sans-serif';cx.fillStyle='#ffedbe';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(text,64,67);const texture=new T.CanvasTexture(c);const sp=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:true,toneMapped:false}));sp.scale.set(4,4,1);return sp;}
for(const stop of route.stops){const g=place(stop.normal,2.6);const color=mat(stop.color,{emissive:stop.color,emissiveIntensity:.25});const ring=mesh(new T.TorusGeometry(7.7,.22,6,48),color,g);ring.rotation.x=-Math.PI/2;const pad=mesh(new T.CircleGeometry(7.5,32),mat(stop.color,{transparent:true,opacity:.25,side:T.DoubleSide}),g);pad.rotation.x=-Math.PI/2;const sign=label(String(stop.id+1));sign.position.y=5;g.add(sign);box(g,.15,6,.15,0,3,0,palette.white);box(g,2,1.3,.1,1,5,0,color);destinations.push({g,ring,sign,color});}
const depot=place(new T.Vector3(0,1,.06).normalize(),12);const depotRing=mesh(new T.TorusGeometry(7,.3,8,48),mat('#63d6f6',{emissive:'#2599c5',emissiveIntensity:.8}),depot);const depotSign=label('↻');depotSign.position.y=9;depot.add(depotSign);
const aim=mesh(new T.TorusGeometry(1.5,.13,6,24),mat('#ffda6a',{emissive:'#ffb52c',emissiveIntensity:1}));aim.visible=false;
let audio,osc,gain,sound=false;
function initSound(){try{audio??=new AudioContext();audio.resume();if(!osc){osc=audio.createOscillator();osc.type='sawtooth';gain=audio.createGain();gain.gain.value=0;const filter=audio.createBiquadFilter();filter.type='lowpass';filter.frequency.value=280;osc.connect(filter).connect(gain).connect(audio.destination);osc.start();}}catch{sound=false;}}
$('sound').onclick=()=>{sound=!sound;if(sound)initSound();$('sound').textContent=sound?'SOUND ON':'SOUND OFF';$('sound').setAttribute('aria-label',sound?'Disable engine sound':'Enable engine sound');};
function clearNotice(){$('notice').textContent='';$('notice').classList.remove('lost');}
function notify(text){$('notice').classList.remove('lost');$('notice').textContent=text;noticeUntil=performance.now()+4000;}
function reset(){clearNotice();noticeUntil=0;pendingDrop=null;for(const f of fragments){scene.remove(f.mesh);f.mesh.geometry.dispose();}fragments.length=0;for(const p of packages)disposeParcel(p);packages=[];route=newRoute();dropCooldown=0;deliveryElapsed=0;for(const d of destinations){d.color.color.set(route.stops[destinations.indexOf(d)].color);d.sign.visible=true;}state=newFlight();state.normal.set(0,1,.18).normalize();state.forward.set(0,.18,-1).normalize();state.throttle=8/26;state.speed=18;$('throttle').value=31;tripAngle=0;previousLongitude=0;lapArmed=false;laps=0;keys={};trails.forEach(t=>t.visible=false);$('laptext').textContent='Fly straight. Find your way home.';camera.position.copy(state.normal).multiplyScalar(RADIUS+26).addScaledVector(state.forward,-17);}
function launch(){if(mode==='intro'||mode==='complete')reset();mode='flight';$('overlay').hidden=true;document.body.classList.add('playing');$('pause').innerHTML='PAUSE <kbd>P</kbd>';last=performance.now();}
function pause(){if(mode==='intro'||mode==='complete')return;if(mode==='paused'){launch();return;}mode='paused';keys={};$('overlay').hidden=false;$('overlay').querySelector('.eyebrow').textContent='HOLDING PATTERN';$('overlay').querySelector('h1').innerHTML='Take a<br><em>breather.</em>';$('introtext').textContent='Your little world will be right here.';$('start').innerHTML='RESUME FLIGHT <span>↗</span>';$('pause').innerHTML='RESUME <kbd>P</kbd>';}
$('start').onclick=launch;$('pause').onclick=pause;$('reset').onclick=()=>{reset();launch();notify('BACK OVER KESTREL ISLAND');};
const bindings={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',ArrowUp:'up',w:'up',W:'up',ArrowDown:'down',s:'down',S:'down',Shift:'boost','-':'slower','=':'faster','+':'faster'};
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement)return;if(bindings[e.key]){e.preventDefault();keys[bindings[e.key]]=true;}if(e.code==='Space'){e.preventDefault();if(!e.repeat)drop();}if(e.repeat)return;if(e.key.toLowerCase()==='q')stunt('roll',-1);if(e.key.toLowerCase()==='e')stunt('roll',1);if(e.key.toLowerCase()==='l')stunt('loop');if(e.key==='p'||e.key==='P')pause();if((e.key==='r'||e.key==='R')&&mode!=='intro'){reset();launch();}if(e.key==='Escape'&&mode==='flight')pause();});
window.addEventListener('keyup',e=>{if(bindings[e.key])keys[bindings[e.key]]=false;});
window.addEventListener('blur',()=>{keys={};if(mode==='flight')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='flight')pause();});
document.querySelectorAll('[data-control]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[b.dataset.control]=true;};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>keys[b.dataset.control]=false;});
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);resize();reset();
const right=new T.Vector3(),up=new T.Vector3(),back=new T.Vector3(),basis=new T.Matrix4(),target=new T.Vector3(),camTarget=new T.Vector3();
function stunt(type,direction=1){if(mode!=='flight')return;if(pendingDrop){notify('Cargo release in progress.');return;}const error=startStunt(state,type,direction);notify(error||(type==='loop'?'LOOP · HOLD ON TO YOUR PARCELS':'BARREL ROLL'));}
function disposeParcel(p){scene.remove(p.mesh);p.mesh.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
function parcelModel(){const g=new T.Group();box(g,.85,.85,.85,0,0,0,palette.trunk);box(g,.16,.88,.88,0,0,0,palette.white);const canopy=new T.Group();g.add(canopy);for(let i=0;i<8;i++){const m=mesh(new T.SphereGeometry(2,4,5,i*Math.PI/4,Math.PI/4,0,Math.PI/2),i%2?palette.white:palette.red,canopy);m.position.y=3;}
 for(let i=0;i<8;i++){const angle=i*Math.PI/4;const geo=new T.BufferGeometry().setFromPoints([new T.Vector3(Math.cos(angle)*1.95,3,Math.sin(angle)*1.95),new T.Vector3(0,.35,0)]);canopy.add(new T.Line(geo,cordMaterial));}canopy.visible=false;scene.add(g);return {mesh:g,canopy};}
const cordMaterial=new T.LineBasicMaterial({color:'#f8edcf'});
function smash(p){const normal=p.position.clone().normalize();for(let i=0;i<18;i++){const shard=box(scene,.15+rand()*.5,.08+rand()*.16,.12+rand()*.5,0,0,0,i%3?palette.trunk:palette.white);shard.position.copy(p.position);fragments.push({mesh:shard,velocity:new T.Vector3(rand()-.5,rand()-.5,rand()-.5).multiplyScalar(10).addScaledVector(normal,5),life:1.8+rand()});}while(fragments.length>90){const f=fragments.shift();scene.remove(f.mesh);f.mesh.geometry.dispose();}notify('LOST GOODS · Parcel smashed. Drop higher for the parachute.');$('notice').classList.add('lost');}
function drop(){if(mode!=='flight'||pendingDrop||dropCooldown>0)return;if(state.stunt){notify('Level out before releasing cargo.');return;}if(!route.parcels){notify('Out of parcels. Fly through the blue depot hoop to refill.');return;}route.parcels--;route.drops++;pendingDrop={remaining:RELEASE_DELAY,condition:route.condition};dropCooldown=RELEASE_DELAY+.2;notify('RELEASING CARGO…');}
$('drop').onclick=drop;$('rollleft').onclick=()=>stunt('roll',-1);$('rollright').onclick=()=>stunt('roll',1);$('loop').onclick=()=>stunt('loop');$('throttle').oninput=e=>{state.throttle=Number(e.target.value)/100;};
function completeRoute(){route.complete=true;mode='complete';keys={};aim.visible=false;const bonus=Math.max(0,300-Math.floor(route.elapsed));route.score+=bonus;let best=route.score;try{best=Math.max(Number(localStorage.getItem('special-delivery-best'))||0,best);localStorage.setItem('special-delivery-best',String(best));}catch{}$('overlay').hidden=false;$('overlay').querySelector('.eyebrow').textContent='KESTREL COURIER · ROUTE COMPLETE';$('overlay').querySelector('h1').innerHTML='Signed.<br><em>Delivered.</em>';$('introtext').textContent=`5 deliveries · ${route.score} points · ${Math.round(route.elapsed)} seconds. Accuracy ${Math.round(5/route.drops*100)}%. Time bonus +${bonus}. Personal best ${best}.`;$('start').innerHTML='REPLAY ROUTE <span>↗</span>';$('pause').textContent='ROUTE COMPLETE';}
function updateDelivery(dt){
 route.elapsed+=dt;
 if(pendingDrop){pendingDrop.remaining-=dt;if(pendingDrop.remaining<=0){const p=makeParcel(state);p.condition=pendingDrop.condition;Object.assign(p,parcelModel());p.mesh.position.copy(p.position);packages.push(p);pendingDrop=null;notify('PARCEL AWAY · Parachute opens in 1 second');}}
 for(let i=fragments.length-1;i>=0;i--){const f=fragments[i];f.life-=dt;f.velocity.addScaledVector(f.mesh.position.clone().normalize(),-12*dt);f.mesh.position.addScaledVector(f.velocity,dt);if(f.mesh.position.length()<152.7){f.mesh.position.setLength(152.7);f.velocity.multiplyScalar(.25);}f.mesh.rotation.x+=dt*4;f.mesh.rotation.z+=dt*3;f.mesh.scale.setScalar(Math.min(1,f.life*2));if(f.life<=0){scene.remove(f.mesh);f.mesh.geometry.dispose();fragments.splice(i,1);}}
 dropCooldown=Math.max(0,dropCooldown-dt);deliveryElapsed+=dt;
 if(state.stunt)route.condition=Math.max(50,route.condition-dt*1.5);
 const pos=state.normal.clone().multiplyScalar(RADIUS+state.altitude);
 if(route.parcels<12&&pos.distanceTo(depot.position)<8){route.parcels=12;route.condition=100;notify('DEPOT REFILL · 12 FRESH PARCELS');}
 for(let i=packages.length-1;i>=0;i--){const p=packages[i];let hit=false;for(let t=0;t<dt;t+=1/120){if(stepParcel(p,Math.min(1/120,dt-t))){hit=true;break;}}p.mesh.position.copy(p.position);p.mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),p.position.clone().normalize());p.canopy.visible=p.inflation>0;p.canopy.scale.set(Math.max(.04,p.inflation),.6+.4*p.inflation,Math.max(.04,p.inflation));p.canopy.rotation.z=Math.sin(p.age*3)*.07*p.inflation;
  if(hit||p.age>50){const saved=route.condition;route.condition=p.condition;const result=hit?resolveDelivery(route,p.position,p):null;route.condition=saved;disposeParcel(p);packages.splice(i,1);if(hit&&p.broken){smash(p);continue;}if(result){notify(`DELIVERED · ${result.name} · +${result.points}`);destinations.forEach((d,j)=>{if(route.stops[j].done){d.color.color.set('#61dca4');d.sign.visible=false;}});if(route.complete){completeRoute();break;}}else notify('MISSED · Try less throttle and release before the pad.');}
 }
 if(deliveryElapsed>.08){deliveryElapsed=0;const prediction=state.stunt?null:predictDrop(state);const landing=prediction?.position;const minimum=safeDropAltitude(state);const safe=state.altitude>=minimum&&!prediction?.broken;$('dropalt').textContent=`${safe?'SAFE DROP':'TOO LOW / DESCENDING'} · MIN ${minimum*10}m`;$('dropalt').classList.toggle('unsafe',!safe);$('altfill').style.width=Math.min(100,state.altitude/90*100)+'%';$('altmark').style.left=Math.min(98,minimum/90*100)+'%';$('drop').textContent=pendingDrop?`RELEASING ${Math.max(0,pendingDrop.remaining).toFixed(1)}s`:'DROP';aim.material.color.set(prediction?.broken?'#ff6262':'#ffda6a');aim.visible=!!landing&&!route.complete;if(landing){aim.position.copy(landing);aim.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),landing.clone().normalize());}
  const remaining=route.stops.filter(s=>!s.done);let next=remaining.sort((a,b)=>state.normal.distanceTo(a.normal)-state.normal.distanceTo(b.normal))[0];if(!next&&!route.complete)return;
  if(route.parcels===0){next={name:'Blue depot · refill',normal:depot.position.clone().normalize()};}
  if(next){const toward=next.normal.clone().addScaledVector(state.normal,-next.normal.dot(state.normal)).normalize();const side=new T.Vector3().crossVectors(state.forward,state.normal);const angle=Math.atan2(toward.dot(side),toward.dot(state.forward))*180/Math.PI;const distance=Math.acos(Math.max(-1,Math.min(1,state.normal.dot(next.normal))))*RADIUS;$('nextstop').textContent=next.name;$('bearing').textContent=(Math.abs(angle)<12?'AHEAD':(angle>0?'RIGHT ':'LEFT ')+Math.round(Math.abs(angle))+'°')+' · '+Math.round(distance*10)+'m';}
  $('cargo').textContent=`${route.parcels} PARCELS · CARGO ${Math.round(route.condition)}% · SCORE ${route.score}`;$('laptext').textContent=`${Math.round(route.elapsed)}s · ${route.drops} drops`;
 }
}
let mapWorld=false,mapTick=0;const mapCanvas=$('missionmap');$('mapmode').onclick=()=>{mapWorld=!mapWorld;$('mapmode').textContent=mapWorld?'WORLD':'ROUTE';$('mapmode').setAttribute('aria-pressed',String(mapWorld));};
let hudTick=0;
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.04);last=now;
 if(mode==='flight'||mode==='intro'){
  advance(state,{turn:mode==='flight'?(Number(!!keys.right)-Number(!!keys.left)):0,climb:mode==='flight'?(Number(!!keys.up)-Number(!!keys.down)):0,boost:mode==='flight'&&keys.boost,throttle:mode==='flight'?(Number(!!keys.faster)-Number(!!keys.slower)):0},dt*(mode==='intro'?.28:1));
  prop.rotation.z+=dt*(keys.boost?95:65);clouds.rotation.y+=dt*.001;
 }
 const position=state.normal.clone().multiplyScalar(RADIUS+state.altitude);aircraft.position.copy(position);
 right.crossVectors(state.forward,state.normal).normalize();up.copy(state.normal);back.copy(state.forward).negate();basis.makeBasis(right,up,back);aircraft.quaternion.setFromRotationMatrix(basis);
 visual.rotation.z=-state.bank-state.roll;visual.rotation.x=state.pitch;
 target.copy(position).addScaledVector(state.forward,-17).addScaledVector(state.normal,12);
 camera.position.lerp(target,1-Math.exp(-5*dt));camera.up.copy(state.normal);camTarget.copy(position).addScaledVector(state.forward,12);camera.lookAt(camTarget);
 const wantedFov=keys.boost&&mode==='flight'?85:78;camera.fov+=(wantedFov-camera.fov)*(1-Math.exp(-2*dt));camera.updateProjectionMatrix();
 if(mode==='flight'){
  updateDelivery(dt);
  trailTick+=dt;if(trailTick>.06){trailTick=0;const t=trails[trailIndex++%trails.length];t.position.copy(position).addScaledVector(state.forward,-2.2);t.visible=!!keys.boost;}
 }
 if(audio&&gain){gain.gain.setTargetAtTime(sound&&mode==='flight'?.025:0,audio.currentTime,.1);osc.frequency.setTargetAtTime(55+state.speed*1.4,audio.currentTime,.12);}
 if(now>noticeUntil)clearNotice();
 hudTick+=dt;if(hudTick>.1){hudTick=0;$('speed').textContent=Math.round(state.speed*3);$('altitude').textContent=Math.round(state.altitude*10);const pct=route.delivered*20;$('progress').textContent=route.delivered+'/5';$('progressbar').style.width=pct+'%';$('throttle').value=Math.round(state.throttle*100);$('throttlevalue').textContent=Math.round(state.throttle*100)+'%';let nearest=null,best=-1;for(const i of islands){const dot=state.normal.dot(i.n);if(dot>best){best=dot;nearest=i;}}$('region').textContent=best>.85?nearest.label:'OPEN OCEAN';}
 mapTick+=dt;if(mapTick>.08){mapTick=0;const summary=drawMinimap(mapCanvas,state,islands,route.stops,depot.position.clone().normalize(),mapWorld,now/1000);$('mapstatus').textContent=`${summary.remaining} / ${summary.total} stops left`;}
 renderer.render(scene,camera);
}requestAnimationFrame(frame);
