import * as T from './vendor/three.module.js';
import {newFlight,advance,startStunt,RADIUS,fuelBurn,verticalSpeed} from './flight.js';
import {newRoute,makeParcel,stepParcel,predictDrop,safeDropAltitude,RELEASE_DELAY,resolveDelivery,padAt} from './delivery.js';
import {drawMinimap} from './minimap.js';
import {LOAD_TIME,SWOOP_TIME,ROLL_TIME,CLIMB_TIME,CUTSCENE_TIME,GROUND_ALT,takeoffPose,parkedPose,applyPose} from './takeoff.js';
import {createCrew,CAMERA_FOCUS} from './crew.js';
import {createPeopleKit} from './people.js';
import {createCelebrations} from './celebrate.js';
import {createAudio} from './audio.js';
import {DAYS,ISLANDS,dayStops,dayFeatures,allPadNormals,loadProgress,saveResult} from './days.js';
import {createExtras} from './extras.js';
import {planDay,clockText} from './run.js';
import {terrainCheck,pickRespawn,LIGHTHOUSE,floorAt,WATER_FLOOR} from './hazards.js';
import {createGraphics} from './graphics.js';
import {createSeaLife} from './sealife.js';
import {CELEBRATION_TIME} from './celebrate.js';
import {GATE_Z,GATE_ALT,GATE_RADIUS,BOUNCE_TIME,toRunway,runwayNormal,gateCrossing,gradeLanding,landingPath} from './landing.js';
const $=id=>document.getElementById(id), canvas=$('world');
let renderer;
try{renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(e){$('error').hidden=false;throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const scene=new T.Scene();scene.background=new T.Color('#83bdcd');
scene.fog=new T.Fog('#83bdcd',240,530);
const camera=new T.PerspectiveCamera(78,1,.1,1000);
const hemi=new T.HemisphereLight('#fff7de','#6590ab',2.5);scene.add(hemi);
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
const padNormals=allPadNormals(),nearPad=v=>padNormals.some(p=>p.dot(v)>Math.cos(10/RADIUS));
function island(n,size,label){n.normalize();islands.push({n,size,label});const rings=9,segments=42,verts=[],colors=[];const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),n);const noise=Array.from({length:segments},()=>.87+rand()*.24);
 function pt(r,i){const a=i/segments*Math.PI*2, rr=r*size*noise[i%segments];const h=r>.86?.25:1.0+Math.sin((1-r)*Math.PI)*1.1;return new T.Vector3(Math.cos(a)*rr,RADIUS,Math.sin(a)*rr).normalize().multiplyScalar(RADIUS+h).applyQuaternion(q);}
 islands[islands.length-1].outline=Array.from({length:segments},(_,i)=>pt(1,i).normalize());
 for(let r=0;r<rings;r++)for(let i=0;i<segments;i++){const a=pt(r/rings,i),b=pt((r+1)/rings,i),c=pt((r+1)/rings,i+1),d=pt(r/rings,i+1);for(const p of [a,c,b,a,d,c])verts.push(p.x,p.y,p.z);const color=new T.Color(r>=7?'#dec58f':r>=6?'#a5af74':['#78a46b','#6d9863','#83a970'][Math.floor(rand()*3)]);for(let j=0;j<6;j++)colors.push(color.r,color.g,color.b);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();mesh(geo,mat('#ffffff',{vertexColors:true,side:T.DoubleSide}));
 for(let i=0;i<24;i++){const a=rand()*Math.PI*2,r=Math.sqrt(rand())*size*.72;const normal=surfacePoint(n,Math.cos(a)*r,Math.sin(a)*r).normalize();if(normal.y>.98&&normal.x>-.03&&normal.x<.065&&Math.abs(normal.z)<.12||nearPad(normal))continue;const g=place(normal,1.4),h=2+rand()*3;box(g,.35,h*.6,.35,0,h*.3,0,palette.trunk);const leaf=mesh(new T.ConeGeometry(1.5,h,6),palette.leaf,g);leaf.position.y=h*.7;}
 for(let i=0;i<5;i++){const normal=surfacePoint(n,(rand()-.5)*size*.9,(rand()-.5)*size*.9).normalize();if(normal.y>.98&&normal.x>-.03&&normal.x<.065&&Math.abs(normal.z)<.12||nearPad(normal))continue;const g=place(normal,1.2),h=1+rand()*2;box(g,2,h,2.7,0,h/2,0,palette.white);const roof=mesh(new T.ConeGeometry(2,1.1,4),palette.red,g);roof.position.y=h+.45;roof.rotation.y=Math.PI/4;}
}
for(const i of ISLANDS)island(new T.Vector3(...i.n),i.size,i.label);
// A runway and striped lighthouse make home recognizable from every approach.
const home=place(new T.Vector3(0,1,0),2.25);box(home,5,.12,29,0,0,0,palette.dark);
for(let i=-12;i<=12;i+=4)box(home,.22,.05,1.7,0,.1,i,palette.white);
for(const x of [-2.8,2.8])for(let z=-12;z<=12;z+=6)sphere(home,.18,x,.2,z,mat('#ffdb84'));
const crew=createCrew({T,parent:home,mat});
const tower=place(LIGHTHOUSE.normal.clone(),1.8);
for(let i=0;i<5;i++){const m=mesh(new T.CylinderGeometry(1.2-i*.12,1.3-i*.12,1.1,8),i%2?palette.red:palette.white,tower);m.position.y=i*1.1+.55;}
sphere(tower,.85,0,5.8,0,mat('#ffe7a1',{emissive:'#ffb74c',emissiveIntensity:.5}));
// Faceted water glints hug the sphere rather than forming a flat ground plane.
const glintmat=mat('#8bc7cd',{transparent:true,opacity:.42});
for(let i=0;i<460;i++){const n=new T.Vector3(rand()-.5,rand()-.5,rand()-.5).normalize();const g=place(n,.15);box(g,.5+rand()*3,.025,.12,0,0,0,glintmat);}
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
const doorHinge=new T.Group();doorHinge.position.set(.5,.02,.42);visual.add(doorHinge);box(doorHinge,.07,.46,.6,.035,0,.3,palette.red);
const hook=new T.Group();hook.visible=false;visual.add(hook);box(hook,.05,1.6,.05,0,-1.5,.3,palette.dark);{const h=mesh(new T.TorusGeometry(.28,.07,6,12,Math.PI*1.4),palette.metal,hook);h.position.set(0,-2.35,.3);h.rotation.y=Math.PI/2;}
const prop=new T.Group();prop.position.z=-2.12;visual.add(prop);box(prop,.13,2.5,.09,0,0,0,palette.trunk);sphere(prop,.19,0,0,-.1,palette.metal,1);
for(const x of [-.65,.65]){const leg=box(visual,.1,.6,.1,x,-.75,-.45,palette.dark);leg.rotation.z=x>0?-.2:.2;const wheel=mesh(new T.CylinderGeometry(.33,.33,.19,10),palette.dark,visual);wheel.rotation.z=Math.PI/2;wheel.position.set(x,-1,-.45);}
const trailMaterial=mat('#ffffff',{transparent:true,opacity:.24});const trails=[];
for(let i=0;i<28;i++){const m=sphere(scene,.11,0,0,0,trailMaterial);m.visible=false;trails.push(m);}
let state=newFlight(),mode='intro',keys={},last=performance.now(),trailIndex=0,trailTick=0,noticeUntil=0,lapArmed=false,laps=0,tripAngle=0,previousLongitude=0;
const progress=loadProgress();let dayIndex=progress.unlocked-1;
// ── Endless run (the main game) vs training days ─────────────────────────────
// A run is a chain of days planned by run.js. Each day: deliver the quota and land at Kestrel
// before night falls, without ever landing. The run ends at nightfall or if the tank runs dry and the plane goes down.
let runMode=true;const run={active:false,over:false,seed:1,day:1,total:0,plan:planDay(1,1),warned:0,pendingNext:0};
function loadBestRun(){try{return JSON.parse(localStorage.getItem('special-delivery-best-run'))||{days:0,score:0};}catch{return {days:0,score:0};}}
let bestRun=loadBestRun();
function saveBestRun(days,score){if(days>bestRun.days||(days===bestRun.days&&score>bestRun.score)){bestRun={days,score};try{localStorage.setItem('special-delivery-best-run',JSON.stringify(bestRun));}catch{}return true;}return false;}
function currentDay(){return runMode?{title:`Day ${run.day}`,brief:run.plan.brief,par:run.plan.dayLength,stops:run.plan.stops,features:run.plan.features}
 :{title:DAYS[dayIndex].title,brief:DAYS[dayIndex].brief,par:DAYS[dayIndex].par,stops:dayStops(dayIndex),features:dayFeatures(dayIndex)};}
let curDay=currentDay();
const fmtTime=s=>{s=Math.max(0,Math.round(s));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;};
let route=newRoute(dayStops(dayIndex)),packages=[],dropCooldown=0,deliveryElapsed=0,pendingDrop=null;const fragments=[];
const destinations=[];
function label(text){const c=document.createElement('canvas');c.width=128;c.height=128;const cx=c.getContext('2d');cx.fillStyle='#173e49';cx.beginPath();cx.arc(64,64,52,0,Math.PI*2);cx.fill();cx.strokeStyle='#ffdd87';cx.lineWidth=6;cx.stroke();cx.font='bold 62px sans-serif';cx.fillStyle='#ffedbe';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(text,64,67);const texture=new T.CanvasTexture(c);const sp=new T.Sprite(new T.SpriteMaterial({map:texture,depthTest:true,toneMapped:false}));sp.scale.set(4,4,1);return sp;}
// Delivery pads for the current day; rebuilt whenever a route starts.
function buildPads(){for(const d of destinations){scene.remove(d.g);d.g.traverse(o=>{o.geometry?.dispose();if(o.material){o.material.map?.dispose();o.material.dispose();}});}destinations.length=0;
 for(const stop of route.stops){const g=place(stop.normal,2.6);const color=mat(stop.color,{emissive:stop.color,emissiveIntensity:.25});const ring=mesh(new T.TorusGeometry(7.7,.22,6,48),color,g);ring.rotation.x=-Math.PI/2;const pad=mesh(new T.CircleGeometry(7.5,32),mat(stop.color,{transparent:true,opacity:.25,side:T.DoubleSide}),g);pad.rotation.x=-Math.PI/2;const sign=label(String(stop.id+1));sign.position.y=5;g.add(sign);box(g,.15,6,.15,0,3,0,palette.white);box(g,2,1.3,.1,1,5,0,color);destinations.push({g,ring,sign,color});}}
buildPads();
const extras=createExtras({T,scene,mat,palette,label,hemi,sun,aircraft});let shake=0;
// Visual upgrade and life on the water. Details stay off the runway, apron, lighthouse and every pad.
const keepClear=n=>nearPad(n)||(n.y>.97&&n.x>-.06&&n.x<.08&&Math.abs(n.z)<.14)||n.dot(LIGHTHOUSE.normal)>Math.cos(5/RADIUS);
const seaLife=createSeaLife({T,scene,mat,palette,label});
const graphics=createGraphics({T,renderer,scene,camera,sun,hemi,fill,ocean,islands,visual,prop,clouds,mat,palette,blocked:keepClear,lite:matchMedia('(pointer:coarse)').matches});
let worldTime=0,spoutNotice=-99;
const depot=place(new T.Vector3(-.06,1,.045).normalize(),12);/* beside the runway, clear of takeoff and landing paths */const depotRing=mesh(new T.TorusGeometry(7,.3,8,48),mat('#63d6f6',{emissive:'#2599c5',emissiveIntensity:.8}),depot);const depotSign=label('↻');depotSign.position.y=9;depot.add(depotSign);
const aim=mesh(new T.TorusGeometry(1.5,.13,6,24),mat('#ffda6a',{emissive:'#ffb52c',emissiveIntensity:1}));aim.visible=false;
// Homecoming approach gate (shown after the fifth delivery) over the sea off the runway's +Z end,
// with three small rings tracing the glide path down to the runway.
const gateGroup=new T.Group();gateGroup.visible=false;scene.add(gateGroup);
const gateMat=mat('#ffd36a',{emissive:'#ffb52c',emissiveIntensity:.9});
function runwayPlace(x,z,alt){const n=runwayNormal(x,z,new T.Vector3());const g=new T.Group();g.position.copy(n).multiplyScalar(RADIUS+alt);g.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),n);gateGroup.add(g);return g;}
{const g=runwayPlace(0,GATE_Z,GATE_ALT);mesh(new T.TorusGeometry(GATE_RADIUS,.35,8,56),gateMat,g);const sign=label('H');sign.position.y=GATE_RADIUS+2.6;g.add(sign);
 for(let i=0;i<12;i++){const a=i/12*Math.PI*2;const b=mesh(new T.BoxGeometry(.5,.5,.5),gateMat,g);b.position.set(Math.cos(a)*GATE_RADIUS,Math.sin(a)*GATE_RADIUS,0);b.rotation.z=a;}
 const guide=landingPath({x:0,z:GATE_Z,altitude:GATE_ALT,speed:15});
 for(const z of [38,28,18]){let t=0;while(guide.pose(t).z>z&&t<20)t+=.01;const r=runwayPlace(0,z,guide.pose(t).altitude);mesh(new T.TorusGeometry(1.5,.14,6,32),gateMat,r);}}
const gateNormal=runwayNormal(0,GATE_Z,new T.Vector3());
const audio=createAudio();
function audioLabels(){$('sound').innerHTML=`SOUND <span>${audio.sfxOn?'ON':'OFF'}</span>`;$('sound').setAttribute('aria-pressed',String(audio.sfxOn));$('music').innerHTML=`MUSIC <span>${audio.musicOn?'ON':'OFF'}</span>`;$('music').setAttribute('aria-pressed',String(audio.musicOn));}
$('sound').onclick=()=>{audio.unlock();audio.setSfx(!audio.sfxOn);audioLabels();};$('music').onclick=()=>{audio.unlock();audio.setMusic(!audio.musicOn);audioLabels();};audioLabels();
const celebrations=createCelebrations({T,mat,kit:createPeopleKit({T,mat})});
// Postmark stamp shown over the scene for each successful delivery.
let stampTimer=0;
function showStamp(result,stop){const el=$('stamp');el.style.setProperty('--ink',stop.color);$('stampgoods').textContent=result.goods;$('stampname').textContent=result.name;$('stamppoints').textContent='+'+result.points;$('stampdetail').textContent=`ACCURACY ${result.accuracy}% · ${route.delivered} OF ${route.stops.length}`;el.hidden=false;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');clearTimeout(stampTimer);stampTimer=setTimeout(()=>{el.hidden=true;},3200);}
// Picture-in-picture "live from the doorstep" view of each delivery celebration.
const pipCam=new T.PerspectiveCamera(46,1.6,.1,500);let pip=null;const pipEye=new T.Vector3(),pipLook=new T.Vector3(),viewSize=new T.Vector2();
function startPip(stop,padGroup,landingWorld){pip={g:padGroup,local:padGroup.worldToLocal(landingWorld.clone()),t:0,a0:Math.random()*Math.PI*2};pip.local.y=0;$('pipname').textContent=stop.name;const el=$('pip');el.hidden=false;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');}
function stopPip(){pip=null;$('pip').hidden=true;}
function renderPip(dt){
 if(!pip)return;if(mode!=='paused')pip.t+=dt;if(pip.t>CELEBRATION_TIME-.2||mode==='complete'){stopPip();return;}
 const r=$('pip').getBoundingClientRect(),cr=canvas.getBoundingClientRect();if(r.width<10)return;
 const a=pip.a0+pip.t*.22;pipEye.set(pip.local.x+Math.cos(a)*8,4.6,pip.local.z+Math.sin(a)*8);pip.g.localToWorld(pipEye);pipLook.set(pip.local.x,1.4,pip.local.z);pip.g.localToWorld(pipLook);
 pipCam.position.copy(pipEye);pipCam.up.copy(pip.g.position).normalize();pipCam.lookAt(pipLook);pipCam.aspect=r.width/r.height;pipCam.updateProjectionMatrix();
 const x=r.left-cr.left,y=cr.bottom-r.bottom;renderer.getSize(viewSize);
 renderer.setScissorTest(true);renderer.setViewport(x,y,r.width,r.height);renderer.setScissor(x,y,r.width,r.height);renderer.render(scene,pipCam);
 renderer.setScissorTest(false);renderer.setViewport(0,0,viewSize.x,viewSize.y);
}
// Homecoming: after the fifth delivery, fly through the gate to land.
let landing=null;const prevNormal=new T.Vector3(),landAhead=new T.Vector3(),tz=new T.Vector3(),tx=new T.Vector3();
function startHomeward(){gateGroup.visible=true;audio.sfx.refill();notify(`ALL ${route.stops.length} DELIVERED · HEAD HOME · FLY THROUGH THE GOLD GATE OFF THE RUNWAY END TO LAND`);noticeUntil=performance.now()+7000;}
function beginLanding(c){const r=toRunway(state.normal),grade=gradeLanding(state.speed,c.offset);
 landing={path:landingPath({x:r.x,z:r.z,altitude:state.altitude,speed:state.speed},grade.bouncy),t:0,grade,touched:false,stopped:false,second:false};
 mode='landing';keys={};releaseMouse();pendingDrop=null;notify(grade.knots>51?'ON APPROACH · TOO FAST FOR A SMOOTH ONE — HOLD ON':'ON APPROACH · NICE AND SLOW');}
function updateLanding(dt){
 const L=landing;L.t+=dt;const p=L.path.pose(L.t),q=L.path.pose(L.t+.05);
 runwayNormal(p.x,p.z,state.normal);
 let hx=q.x-p.x,hz=q.z-p.z;if(Math.hypot(hx,hz)<1e-4){hx=0;hz=-1;}
 const b=p.z/(RADIUS+GROUND_ALT);tz.set(0,-Math.sin(b),Math.cos(b));tz.addScaledVector(state.normal,-tz.dot(state.normal)).normalize();tx.crossVectors(state.normal,tz);
 state.forward.copy(tx).multiplyScalar(hx).addScaledVector(tz,hz).normalize();
 state.altitude=p.altitude;state.speed=p.speed;state.pitch=p.pitch;state.bank=p.bank;state.roll=0;state.stunt=null;
 prop.rotation.z+=dt*(L.stopped?Math.max(3,30-(L.t-L.path.stopped)*10):40+p.speed*2);
 if(!L.touched&&L.t>=L.path.touchdown){L.touched=true;route.score+=L.grade.bonus;audio.sfx.touchdown(L.grade.bouncy);notify(`${L.grade.label} · ${'★'.repeat(L.grade.stars)}${'☆'.repeat(3-L.grade.stars)} · +${L.grade.bonus}${L.grade.centered?' · RIGHT ON THE CENTERLINE':''}`);noticeUntil=performance.now()+5000;}
 if(L.grade.bouncy&&L.touched&&!L.second&&L.t>=L.path.touchdown+BOUNCE_TIME){L.second=true;audio.sfx.touchdown(false);}
 if(!L.stopped&&L.t>=L.path.stopped){L.stopped=true;audio.sfx.cheer();}
 crew.update(LOAD_TIME+2+L.t);
 if(L.t>=L.path.done){completeRoute();return true;}
 if(!L.stopped)return false;
 // Parked: slow orbit around the plane while the crew cheers.
 const pos=state.normal.clone().multiplyScalar(RADIUS+state.altitude),ang=(L.t-L.path.stopped)*.35;
 target.copy(state.forward).multiplyScalar(-13).applyAxisAngle(state.normal,ang).add(pos).addScaledVector(state.normal,5);
 camera.position.lerp(target,1-Math.exp(-3*dt));camera.up.copy(state.normal);camTarget.copy(pos).addScaledVector(state.normal,1);camera.lookAt(camTarget);return true;
}
// ── Run flow: day complete, next day, run over ───────────────────────────────
function runOver(reason){
 if(run.over)return;run.over=true;mode='complete';keys={};releaseMouse();aim.visible=false;warnOn=false;document.body.classList.remove('pullup');crash=null;visual.rotation.set(0,0,0);
 const days=run.day-1,total=run.total+route.score,best=saveBestRun(days,total);
 $('overlay').hidden=false;$('overlay').querySelector('.eyebrow').textContent=`RUN OVER · DAY ${run.day}`;$('overlay').querySelector('h1').innerHTML=reason==='night'?'Out of<br><em>daylight.</em>':'Out of<br><em>fuel.</em>';
 $('introtext').textContent=`${reason==='night'?'Night fell':'The tank ran dry and you went down'} with ${route.delivered} of ${route.stops.length} parcels delivered on Day ${run.day}. You completed ${days} day${days===1?'':'s'} for ${total} points.${best&&days>0?' New best run!':bestRun.days?` Best run: ${bestRun.days} day${bestRun.days>1?'s':''}.`:''}`;
 renderDays();$('pause').textContent='RUN OVER';reason==='night'?audio.sfx.late():audio.sfx.engineOut();
}
// No landings in a run: when the quota (and any mailbags) is done, the day ends in the air. A few
// seconds later dawn breaks and the next day's stops are planned from wherever the plane is.
// Fuel and position carry over; the crew air-drops fresh parcels.
function restartFlight(){if(runMode)startRun();newMission();}
function queueNextDay(){if(!runMode||run.pendingNext>0)return;run.pendingNext=4.5;const len=run.plan.dayLength,left=Math.max(0,len-route.elapsed);
 notify(`DAY ${run.day} COMPLETE AT ${clockText(route.elapsed,len)} · ${fmtTime(left)} OF DAYLIGHT TO SPARE`);noticeUntil=performance.now()+4500;audio.sfx.complete();}
function nextDay(){
 run.pendingNext=0;const len=run.plan.dayLength,left=Math.max(0,len-route.elapsed),daylight=Math.round(left*2),clean=route.crashes===0?100:0;
 route.score+=daylight+clean;run.total+=route.score;const done=run.day;saveBestRun(done,run.total);
 run.day++;run.plan=planDay(run.day,run.seed,state.normal);curDay=currentDay();run.warned=0;
 celebrations.clear();stopPip();for(const p of packages)disposeParcel(p);packages=[];pendingDrop=null;
 route=newRoute(curDay.stops);route.crashes=0;buildPads();extras.start(curDay.features,route,destinations);seaLife.setDay(curDay.features);graphics.shadowify(scene);prevNormal.copy(state.normal);lowFuelStage=state.fuel<25?1:0;
 const el=$('dawn');el.classList.remove('go');void el.offsetWidth;el.classList.add('go');
 notify(`DAY ${run.day} · ${curDay.brief.toUpperCase()} · RUN ${run.total} PTS · FUEL ${Math.ceil(state.fuel)}%`);noticeUntil=performance.now()+6000;audio.sfx.refill();
}
// Nightfall: warnings at sunset and dusk, run over when it's dark and you're still out.
function checkDaylight(){
 if(!runMode||!run.active||run.over||run.pendingNext>0||!(mode==='flight'||mode==='crash'))return;const len=run.plan.dayLength,u=route.elapsed/len;
 if(u>=.72&&run.warned<1){run.warned=1;notify(`SUNSET · ${fmtTime(len-route.elapsed)} OF DAYLIGHT LEFT`);noticeUntil=performance.now()+4000;}
 if(u>=.88&&run.warned<2){run.warned=2;audio.sfx.lowfuel();notify(route.complete?'DUSK · GET HOME AND LAND NOW':`DUSK · ${route.stops.length-route.delivered} PARCEL${route.stops.length-route.delivered===1?'':'S'} LEFT · HURRY`);noticeUntil=performance.now()+4000;}
 if(u>=1)runOver('night');
}
// ── Fuel, PULL UP warnings and crashes ────────────────────────────────────────
// Forgiving rules: running dry means a glide, and a crash costs a parcel, cargo condition and 15 s,
// then the plane is put back in the air at a safe spot from a few seconds earlier.
const crumbs=[];let crumbTick=0,crash=null,lowFuelStage=0,warnOn=false,warnBeep=0;
function obstacles(){return [LIGHTHOUSE,...extras.obstacles(),...seaLife.obstacles(worldTime)];}
function updateFuelAndTerrain(dt){
 state.fuel=Math.max(0,state.fuel-fuelBurn(state.throttle,!!keys.boost&&state.fuel>0)*dt);
 if(state.fuel<25&&lowFuelStage<1){lowFuelStage=1;audio.sfx.lowfuel();const h=extras.nearestFuel(state.normal);notify(`LOW FUEL · ${h?'FLY THROUGH A GREEN F HOOP OR ':''}HEAD FOR THE BLUE DEPOT AT HOME`);noticeUntil=performance.now()+5000;}
 if(state.fuel<10&&lowFuelStage<2){lowFuelStage=2;audio.sfx.lowfuel();notify('FUEL CRITICAL · THE ENGINE IS SPUTTERING');}
 if(state.fuel<=0&&lowFuelStage<3){lowFuelStage=3;audio.sfx.engineOut();notify(runMode?'OUT OF FUEL · GLIDE THROUGH A GREEN F HOOP OR THE BLUE DEPOT, OR THE RUN IS OVER':'OUT OF FUEL · GLIDING · REACH A FUEL HOOP OR BRACE FOR A BUMPY LANDING');noticeUntil=performance.now()+6000;}
 const chk=terrainCheck(state.normal,state.altitude,obstacles());
 if(chk.crash){beginCrash(chk.what);return;}
 const sinking=verticalSpeed(state)<.6;warnOn=chk.warn&&sinking&&!state.stunt;document.body.classList.toggle('pullup',warnOn);
 if(warnOn){warnBeep-=dt;if(warnBeep<=0){warnBeep=.38;audio.sfx.warn();}}else warnBeep=0;
 crumbTick+=dt;if(crumbTick>=.5){crumbTick=0;if(chk.clearance>6&&!state.stunt){crumbs.push({normal:state.normal.clone(),forward:state.forward.clone(),altitude:state.altitude});if(crumbs.length>60)crumbs.shift();}}
}
function beginCrash(what){
 const noFuel=state.fuel<=0;mode='crash';keys={};releaseMouse();warnOn=false;document.body.classList.remove('pullup');pendingDrop=null;lineTarget=0;
 route.crashes++;route.elapsed+=15;if(route.parcels>0)route.parcels--;route.condition=Math.max(40,route.condition-15);
 crash={t:0,what,noFuel,spin:(Math.random()<.5?-1:1),start:state.altitude};
 audio.sfx.crash();shake=.9;if(floorAt(state.normal)===WATER_FLOOR)graphics.splash(state.normal.clone().multiplyScalar(RADIUS),2.2);
 // Debris and smoke where the plane went down.
 const at=state.normal.clone().multiplyScalar(RADIUS+state.altitude),n=state.normal.clone();
 for(let i=0;i<22;i++){const shard=box(scene,.2+rand()*.6,.06+rand()*.14,.2+rand()*.5,0,0,0,[palette.gold,palette.red,palette.dark][i%3]);shard.position.copy(at);fragments.push({mesh:shard,velocity:new T.Vector3(rand()-.5,rand()-.5,rand()-.5).multiplyScalar(14).addScaledVector(n,7),life:2.2+rand()});}
 notify(`CRASHED INTO ${what.toUpperCase()} · −1 PARCEL · −15% CARGO · +15 s`);noticeUntil=performance.now()+3500;$('notice').classList.add('lost');
}
function updateCrash(dt){
 crash.t+=dt;visual.rotation.z+=dt*7*crash.spin;visual.rotation.x+=dt*2;prop.rotation.z+=dt*4;
 state.altitude=Math.max(0,state.altitude-dt*2);
 for(let i=fragments.length-1;i>=0;i--){const f=fragments[i];f.life-=dt;f.velocity.addScaledVector(f.mesh.position.clone().normalize(),-12*dt);f.mesh.position.addScaledVector(f.velocity,dt);f.mesh.rotation.x+=dt*4;if(f.life<=0){scene.remove(f.mesh);f.mesh.geometry.dispose();fragments.splice(i,1);}}
 const pos=state.normal.clone().multiplyScalar(RADIUS+state.altitude);camTarget.copy(pos);camera.up.copy(state.normal);camera.lookAt(camTarget);
 if(crash.t<2.3)return true;
 if(crash.noFuel&&runMode&&run.active){runOver('fuel');return true;}
 // Back in the air a few seconds behind the crash, level and steady.
 const c=pickRespawn(crumbs,5);if(c){state.normal.copy(c.normal);state.forward.copy(c.forward);state.altitude=Math.max(c.altitude,16);}else{state.altitude=Math.max(state.altitude,16);}
 state.speed=18;state.pitch=0;state.bank=0;state.roll=0;state.stunt=null;state.throttle=Math.max(state.throttle,8/26);$('throttle').value=Math.round(state.throttle*100);
 if(crash.noFuel){state.fuel=35;lowFuelStage=0;}
 visual.rotation.set(0,0,0);crumbs.length=Math.max(0,crumbs.length-10);
 notify(crash.noFuel?'THE TOW CREW TOPPED YOU UP TO 35% · FIND FUEL':'BACK IN THE AIR · KEEP ABOVE THE PULL-UP LINE');noticeUntil=performance.now()+3500;
 crash=null;mode='flight';snapChaseCamera();return true;
}
// Score and announce what the day's challenges reported this frame.
function handleChallenge(e){const quick=ms=>{noticeUntil=performance.now()+ms;};
 if(e.type==='ring'){audio.sfx.ring(e.streak);notify(`SKY RING +${e.points}${e.streak>1?` · STREAK ×${Math.min(4,e.streak)}`:''}`);quick(1400);}
 else if(e.type==='bird'){audio.sfx.squawk();shake=.5;notify('BIRD STRIKE · CARGO CONDITION −12%');}
 else if(e.type==='mail'){audio.sfx.snag();route.score+=100;if(e.left){notify(`MAILBAG SNAGGED +100 · ${e.left} TO GO`);}else if(route.complete){if(runMode)queueNextDay();else startHomeward();}else notify('ALL MAILBAGS ABOARD +100');}
 else if(e.type==='thunder')audio.sfx.thunder(e.dist);
 else if(e.type==='fuel'){if(state.fuel<97){state.fuel=100;lowFuelStage=0;audio.sfx.refill();notify('FUEL HOOP · TANK FULL');}}
 else if(e.type==='storm')notify('STORM CELL · TURBULENCE IS SHAKING THE CARGO · FLY AROUND IT');
 else if(e.type==='late'){audio.sfx.late();notify(`${e.stop.goods.toUpperCase()} IS LATE · THE RUSH BONUS IS GONE, BUT STILL DELIVER IT`);}
 else if(e.type==='tick')audio.sfx.tick();
}
function clearNotice(){$('notice').textContent='';$('notice').classList.remove('lost');}
function notify(text){$('notice').classList.remove('lost');$('notice').textContent=text;noticeUntil=performance.now()+4000;}
function reset(){lineLen=lineTarget=0;crumbs.length=0;crash=null;lowFuelStage=0;warnOn=false;document.body.classList.remove('pullup');clearNotice();aim.visible=false;celebrations.clear();$('stamp').hidden=true;stopPip();landing=null;gateGroup.visible=false;noticeUntil=0;pendingDrop=null;for(const f of fragments){scene.remove(f.mesh);f.mesh.geometry.dispose();}fragments.length=0;for(const p of packages)disposeParcel(p);packages=[];curDay=currentDay();run.warned=0;route=newRoute(curDay.stops);route.crashes=0;buildPads();extras.start(curDay.features,route,destinations);seaLife.setDay(curDay.features);graphics.shadowify(scene);hook.visible=false;dropCooldown=0;deliveryElapsed=0;state=newFlight();state.normal.set(0,1,.18).normalize();state.forward.set(0,.18,-1).normalize();state.throttle=8/26;state.speed=18;$('throttle').value=31;tripAngle=0;previousLongitude=0;lapArmed=false;laps=0;keys={};trails.forEach(t=>t.visible=false);$('laptext').textContent='Fly straight. Find your way home.';camera.position.copy(state.normal).multiplyScalar(RADIUS+26).addScaledVector(state.forward,-17);}
// ── Missions start with a cutscene: crew loads the plane, camera pulls back, takeoff roll, climb-out.
let pausedFrom='flight';const cine={t:0,swoop:false};
// Day picker on the title and route-complete cards. Locked days unlock as each day is finished.
function renderDays(){$('modes').hidden=false;$('moderun').setAttribute('aria-selected',String(runMode));$('modetrain').setAttribute('aria-selected',String(!runMode));
 if(runMode){$('days').hidden=true;$('runinfo').hidden=false;$('runinfo').innerHTML=bestRun.days?`Best run: <b>${bestRun.days} day${bestRun.days>1?'s':''}</b> · ${bestRun.score} points`:'Deliver each day\u2019s parcels before dark. You never land, so fuel is everything. How many days can you last?';
  $('start').innerHTML=run.active&&!run.over?`FLY DAY ${run.day} <span>↗</span>`:'START RUN <span>↗</span>';return;}
 $('runinfo').hidden=true;const box=$('days');box.hidden=false;box.innerHTML='';
 DAYS.forEach((d,i)=>{const b=document.createElement('button');const locked=i>=progress.unlocked;b.className='day'+(i===dayIndex?' selected':'');b.disabled=locked;b.setAttribute('aria-pressed',String(i===dayIndex));
  b.innerHTML=`<small>DAY ${i+1}</small><b>${d.title}</b><span>${locked?'Locked':progress.best[i]?`Best ${progress.best[i]}`:`${d.stops.length} stops`}</span>`;
  b.onclick=()=>{dayIndex=i;renderDays();};box.appendChild(b);});
 $('start').innerHTML=`START DAY ${dayIndex+1} <span>↗</span>`;}
$('moderun').onclick=()=>{runMode=true;renderDays();};$('modetrain').onclick=()=>{runMode=false;renderDays();};
renderDays();
function startRun(){run.pendingNext=0;run.active=true;run.over=false;run.seed=Math.floor(Math.random()*1e9);run.day=1;run.total=0;run.plan=planDay(1,run.seed);}
function showPlaying(){$('overlay').hidden=true;document.body.classList.add('playing');$('pause').innerHTML='PAUSE <kbd>P</kbd>';last=performance.now();}
function newMission(){audio.unlock();reset();startCutscene();showPlaying();}
function launch(){if(mode==='intro'||mode==='complete'){if(runMode&&(!run.active||run.over))startRun();newMission();return;}if(mode==='paused'){mode=pausedFrom;audio.setPaused(false);}showPlaying();}
function pause(){if(mode==='intro'||mode==='complete')return;if(mode==='paused'){launch();return;}pausedFrom=mode;mode='paused';keys={};releaseMouse();audio.setPaused(true);$('days').hidden=true;$('modes').hidden=true;$('runinfo').hidden=true;$('overlay').hidden=false;$('overlay').querySelector('.eyebrow').textContent='HOLDING PATTERN';$('overlay').querySelector('h1').innerHTML='Take a<br><em>breather.</em>';$('introtext').textContent='Your little world will be right here.';$('start').innerHTML=(pausedFrom==='cutscene'?'RESUME':'RESUME FLIGHT')+' <span>↗</span>';$('pause').innerHTML='RESUME <kbd>P</kbd>';}
$('start').onclick=launch;$('pause').onclick=pause;$('reset').onclick=()=>restartFlight();$('skip').onclick=()=>skipCutscene();
// Mouse + keyboard: the mouse steers, W/S set the throttle, Q/E roll, F loops, Space drops. Arrow keys still steer.
const bindings={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',w:'faster',W:'faster',s:'slower',S:'slower',Shift:'boost','-':'slower','=':'faster','+':'faster'};
// Mouse steering: the cursor's offset from screen center sets bank (left/right) and climb (up = nose up).
// Steering starts on the first mouse move after takeoff or resume, so a resting cursor never yanks the plane.
const mouse={active:false,x:0,y:0},MOUSE_DEAD=.06,MOUSE_FULL=.45;
const mouseAxis=v=>{const a=Math.abs(v);return a<MOUSE_DEAD?0:Math.sign(v)*Math.min(1,(a-MOUSE_DEAD)/(MOUSE_FULL-MOUSE_DEAD));};
function releaseMouse(){mouse.active=false;document.body.classList.remove('mousefly');}
window.addEventListener('pointermove',e=>{if(e.pointerType&&e.pointerType!=='mouse')return;const r=canvas.getBoundingClientRect();mouse.x=Math.max(-1,Math.min(1,(e.clientX-r.left)/r.width*2-1));mouse.y=Math.max(-1,Math.min(1,(e.clientY-r.top)/r.height*2-1));
 const el=$('reticle');el.style.transform=`translate(${e.clientX-r.left}px,${e.clientY-r.top}px)`;if(mode==='flight'&&!mouse.active){mouse.active=true;document.body.classList.add('mousefly');}});
document.documentElement.addEventListener('mouseleave',releaseMouse);
// Mouse wheel winch: scroll down to pay out a hook line under the plane, up to reel it in.
// The hook snags mailbags on Day 4; it can never hang lower than just above the ground.
const LINE_MAX=14,LINE_STEP=1.4;let lineLen=0,lineTarget=0,winchTick=0;
window.addEventListener('wheel',e=>{if(!(mode==='flight'||mode==='landing')||e.target.closest?.('.overlay,#days'))return;e.preventDefault();
 const notches=Math.max(-3,Math.min(3,e.deltaY/(e.deltaMode===1?3:100)));lineTarget=Math.max(0,Math.min(LINE_MAX,lineTarget+notches*LINE_STEP));},{passive:false});
const lineMesh=new T.Mesh(new T.CylinderGeometry(.05,.05,1,5),palette.dark);lineMesh.visible=false;scene.add(lineMesh);
const hookEnd=new T.Group();hookEnd.visible=false;scene.add(hookEnd);{const h=mesh(new T.TorusGeometry(.42,.1,6,14,Math.PI*1.35),palette.metal,hookEnd);h.rotation.set(0,Math.PI/2,Math.PI*.8);sphere(hookEnd,.22,0,.45,0,palette.red,0);}
const hookWorld=new T.Vector3(),lineTop=new T.Vector3(),lineDir=new T.Vector3();
function updateLine(dt,position){
 if(mode==='landing')lineTarget=0;lineTarget=Math.min(lineTarget,Math.max(0,state.altitude-2.8));
 const before=lineLen;lineLen+=(lineTarget-lineLen)*(1-Math.exp(-5*dt));if(Math.abs(lineLen-lineTarget)<.02)lineLen=lineTarget;
 winchTick+=Math.abs(lineLen-before);if(winchTick>.7){winchTick=0;audio.sfx.winch();}
 const out=lineLen>.15;lineMesh.visible=hookEnd.visible=out;if(!out)return null;
 // The line streams back a little with airspeed.
 lineTop.copy(position).addScaledVector(state.normal,-1.1);
 hookWorld.copy(lineTop).addScaledVector(state.normal,-lineLen).addScaledVector(state.forward,-lineLen*Math.min(.45,state.speed*.018));
 lineDir.subVectors(hookWorld,lineTop);const len=lineDir.length();lineMesh.position.copy(lineTop).addScaledVector(lineDir,.5);lineMesh.scale.set(1,len,1);
 lineMesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),lineDir.normalize());hookEnd.position.copy(hookWorld);hookEnd.quaternion.copy(aircraft.quaternion);
 return hookWorld;
}
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement)return;if(bindings[e.key]){e.preventDefault();keys[bindings[e.key]]=true;}if(e.code==='Space'){e.preventDefault();if(!e.repeat){if(mode==='cutscene')skipCutscene();else drop();}}if(e.repeat)return;if(e.key==='Enter'&&mode==='cutscene'){e.preventDefault();skipCutscene();}if(e.key.toLowerCase()==='q')stunt('roll',-1);if(e.key.toLowerCase()==='e')stunt('roll',1);if(e.key.toLowerCase()==='l'||e.key.toLowerCase()==='f')stunt('loop');if(e.key==='p'||e.key==='P')pause();if((e.key==='r'||e.key==='R')&&mode!=='intro')restartFlight();if(e.key==='Escape'){if(mode==='cutscene')skipCutscene();else if(mode==='flight')pause();}});
window.addEventListener('keyup',e=>{if(bindings[e.key])keys[bindings[e.key]]=false;});
window.addEventListener('blur',()=>{keys={};if(mode==='flight'||mode==='cutscene'||mode==='landing'||mode==='crash')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&(mode==='flight'||mode==='cutscene'||mode==='landing'))pause();});
document.querySelectorAll('[data-control]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[b.dataset.control]=true;};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>keys[b.dataset.control]=false;});
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);resize();reset();
const right=new T.Vector3(),up=new T.Vector3(),back=new T.Vector3(),basis=new T.Matrix4(),target=new T.Vector3(),camTarget=new T.Vector3();
function stunt(type,direction=1){if(mode!=='flight')return;if(pendingDrop){notify('Cargo release in progress.');return;}const error=startStunt(state,type,direction);if(!error)audio.sfx.whoosh();notify(error||(type==='loop'?'LOOP · HOLD ON TO YOUR PARCELS':'BARREL ROLL'));}
function disposeParcel(p){scene.remove(p.mesh);p.mesh.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
function parcelModel(){const g=new T.Group();box(g,.85,.85,.85,0,0,0,palette.trunk);box(g,.16,.88,.88,0,0,0,palette.white);const canopy=new T.Group();g.add(canopy);for(let i=0;i<8;i++){const m=mesh(new T.SphereGeometry(2,4,5,i*Math.PI/4,Math.PI/4,0,Math.PI/2),i%2?palette.white:palette.red,canopy);m.position.y=3;}
 for(let i=0;i<8;i++){const angle=i*Math.PI/4;const geo=new T.BufferGeometry().setFromPoints([new T.Vector3(Math.cos(angle)*1.95,3,Math.sin(angle)*1.95),new T.Vector3(0,.35,0)]);canopy.add(new T.Line(geo,cordMaterial));}canopy.visible=false;scene.add(g);return {mesh:g,canopy};}
const cordMaterial=new T.LineBasicMaterial({color:'#f8edcf'});
function smash(p){const normal=p.position.clone().normalize();for(let i=0;i<18;i++){const shard=box(scene,.15+rand()*.5,.08+rand()*.16,.12+rand()*.5,0,0,0,i%3?palette.trunk:palette.white);shard.position.copy(p.position);fragments.push({mesh:shard,velocity:new T.Vector3(rand()-.5,rand()-.5,rand()-.5).multiplyScalar(10).addScaledVector(normal,5),life:1.8+rand()});}while(fragments.length>90){const f=fragments.shift();scene.remove(f.mesh);f.mesh.geometry.dispose();}notify('LOST GOODS · Parcel smashed. Drop higher for the parachute.');$('notice').classList.add('lost');}
function drop(){if(mode!=='flight'||pendingDrop||dropCooldown>0)return;if(state.stunt){notify('Level out before releasing cargo.');return;}if(!route.parcels){notify('Out of parcels. Fly through the blue depot hoop to refill.');return;}route.parcels--;route.drops++;pendingDrop={remaining:RELEASE_DELAY,condition:route.condition};dropCooldown=RELEASE_DELAY+.2;notify('RELEASING CARGO…');}
$('drop').onclick=drop;$('rollleft').onclick=()=>stunt('roll',-1);$('rollright').onclick=()=>stunt('roll',1);$('loop').onclick=()=>stunt('loop');$('throttle').oninput=e=>{state.throttle=Number(e.target.value)/100;};
function completeRoute(){releaseMouse();route.complete=true;mode='complete';keys={};aim.visible=false;const day=DAYS[dayIndex],finished=dayIndex,bonus=Math.max(0,day.par-Math.floor(route.elapsed)),clean=route.crashes===0?100:0;route.score+=clean;route.score+=bonus;saveResult(progress,finished,route.score);const best=progress.best[finished];if(dayIndex+1<DAYS.length)dayIndex++;$('overlay').hidden=false;$('overlay').querySelector('.eyebrow').textContent=`DAY ${finished+1} · ${day.title.toUpperCase()} · COMPLETE`;$('overlay').querySelector('h1').innerHTML='Signed.<br><em>Delivered.</em>';$('introtext').textContent=`${route.stops.length} deliveries · ${route.score} points · ${Math.round(route.elapsed)} seconds. Accuracy ${Math.round(route.stops.length/route.drops*100)}%. Time bonus +${bonus}.${landing?` ${landing.grade.label[0]+landing.grade.label.slice(1).toLowerCase()} +${landing.grade.bonus}.`:''} ${extras.summary()?' '+extras.summary():''} ${route.crashes?`Crashes ${route.crashes}.`:'Clean flight, no crashes +100.'} Day best ${best}.${dayIndex>finished?` Day ${dayIndex+1} unlocked.`:''}`;renderDays();$('pause').textContent='ROUTE COMPLETE';audio.sfx.complete();}
function updateDelivery(dt){
 route.elapsed+=dt;
 if(route.complete&&mode==='flight'&&gateGroup.visible){const c=gateCrossing(prevNormal,state.normal,state.altitude,state.forward);if(c){if(c.inside){prevNormal.copy(state.normal);beginLanding(c);return;}notify(c.aligned?'MISSED THE GATE · Circle around and fly through the middle':'LINE UP WITH THE RUNWAY · Fly through the gate heading toward the field');}}
 prevNormal.copy(state.normal);
 if(pendingDrop){pendingDrop.remaining-=dt;if(pendingDrop.remaining<=0){const p=makeParcel(state);p.wind=extras.wind;p.windTime=route.elapsed;p.condition=pendingDrop.condition;Object.assign(p,parcelModel());p.mesh.position.copy(p.position);packages.push(p);pendingDrop=null;audio.sfx.drop();notify('PARCEL AWAY · Parachute opens in 1 second');}}
 for(let i=fragments.length-1;i>=0;i--){const f=fragments[i];f.life-=dt;f.velocity.addScaledVector(f.mesh.position.clone().normalize(),-12*dt);f.mesh.position.addScaledVector(f.velocity,dt);if(f.mesh.position.length()<RADIUS+2.7){f.mesh.position.setLength(RADIUS+2.7);f.velocity.multiplyScalar(.25);}f.mesh.rotation.x+=dt*4;f.mesh.rotation.z+=dt*3;f.mesh.scale.setScalar(Math.min(1,f.life*2));if(f.life<=0){scene.remove(f.mesh);f.mesh.geometry.dispose();fragments.splice(i,1);}}
 dropCooldown=Math.max(0,dropCooldown-dt);deliveryElapsed+=dt;
 if(state.stunt)route.condition=Math.max(50,route.condition-dt*1.5);
 const pos=state.normal.clone().multiplyScalar(RADIUS+state.altitude);
 if((route.parcels<12||state.fuel<95)&&pos.distanceTo(depot.position)<8){route.parcels=12;route.condition=100;state.fuel=100;lowFuelStage=0;audio.sfx.refill();notify('DEPOT · 12 FRESH PARCELS AND A FULL TANK');}
 for(let i=packages.length-1;i>=0;i--){const p=packages[i];let hit=false;for(let t=0;t<dt;t+=1/120){if(stepParcel(p,Math.min(1/120,dt-t))){hit=true;break;}}p.mesh.position.copy(p.position);p.mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),p.position.clone().normalize());p.canopy.visible=p.inflation>0;p.canopy.scale.set(Math.max(.04,p.inflation),.6+.4*p.inflation,Math.max(.04,p.inflation));p.canopy.rotation.z=Math.sin(p.age*3)*.07*p.inflation;if(p.inflation>0&&!p.chuted){p.chuted=true;audio.sfx.chute();}
  if(hit||p.age>50){const saved=route.condition;route.condition=p.condition;const result=hit?resolveDelivery(route,p.position,p):null;route.condition=saved;disposeParcel(p);packages.splice(i,1);if(hit&&p.broken){audio.sfx.smash();smash(p);continue;}if(result){const stop=route.stops[result.id];celebrations.start(destinations[result.id].g,p.position,stop.color);startPip(stop,destinations[result.id].g,p.position);audio.sfx.delivered();showStamp(result,stop);if(result.onTime){audio.sfx.ontime();$('stampdetail').textContent='RIGHT ON TIME · +150 RUSH BONUS';}clearNotice();destinations.forEach((d,j)=>{if(route.stops[j].done){d.color.color.set('#61dca4');d.sign.visible=false;}});if(route.complete){if(extras.mailLeft){notify(`ALL PARCELS DELIVERED · SNAG ${extras.mailLeft} MORE MAILBAG${extras.mailLeft>1?'S':''}${runMode?' TO FINISH THE DAY':' BEFORE HEADING HOME'}`);noticeUntil=performance.now()+6000;}else if(runMode)queueNextDay();else startHomeward();break;}}else{if(hit){audio.sfx.thud();audio.sfx.missed();if(floorAt(p.position.clone().normalize())===WATER_FLOOR)graphics.splash(p.position);}notify('MISSED · Try less throttle and release before the pad.');}}
 }
 if(deliveryElapsed>.08){deliveryElapsed=0;const prediction=state.stunt?null:predictDrop(state,extras.wind,route.elapsed);const landing=prediction?.position;const minimum=safeDropAltitude(state);const tooLow=state.altitude<minimum,safe=!tooLow&&!prediction?.broken;$('dropalt').textContent=safe?`SAFE DROP · MIN ${minimum*10}m`:tooLow?`TOO LOW · CLIMB TO ${minimum*10}m`:`DIVING TOO STEEPLY · LEVEL OUT`;$('dropalt').classList.toggle('unsafe',!safe);if(route.complete){const kt=Math.round(state.speed*3),slow=kt<=51;$('dropalt').textContent=slow?`READY TO LAND · ${kt} KNOTS · NICE AND SLOW`:`SLOW DOWN TO LAND · ${kt} KNOTS · AIM FOR 51 OR LESS`;$('dropalt').classList.toggle('unsafe',!slow);}$('altfill').style.width=Math.min(100,state.altitude/90*100)+'%';$('altmark').style.left=Math.min(98,minimum/90*100)+'%';$('drop').textContent=pendingDrop?`RELEASING ${Math.max(0,pendingDrop.remaining).toFixed(1)}s`:'DROP';extras.setLead(landing&&!route.complete?prediction.time:null);const onTarget=!!landing&&!prediction.broken&&!!padAt(route,landing,route.elapsed+prediction.time);aim.material.color.set(prediction?.broken?'#ff6262':onTarget?'#5fe39a':'#ffda6a');aim.material.emissive.set(prediction?.broken?'#c02a2a':onTarget?'#1fae5c':'#ffb52c');aim.scale.setScalar(onTarget?1.35:1);aim.visible=!!landing&&!route.complete;if(landing){aim.position.copy(landing);aim.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),landing.clone().normalize());}
  const remaining=route.stops.filter(s=>!s.done);let next=remaining.sort((a,b)=>state.normal.distanceTo(a.normal)-state.normal.distanceTo(b.normal))[0];const nav=extras.navTarget(state);if(nav)next=nav;else if(route.complete&&runMode){$('nextstop').textContent='DAY COMPLETE · NEW MANIFEST AT DAWN';$('bearing').textContent='';return;}else if(route.complete)next={name:'Kestrel Field · fly through the gold gate to land',normal:gateNormal};else if(!next)return;$('routehint').textContent=next.motion?'Moving boat: drop when the gold ring sits on the green DROP HERE ring ahead of it':'Space: release · 1s free fall · parachute opens';
  if(route.parcels===0&&!route.complete&&!nav?.urgent){next={name:'Blue depot · refill',normal:depot.position.clone().normalize()};}
  if(next){const toward=next.normal.clone().addScaledVector(state.normal,-next.normal.dot(state.normal)).normalize();const side=new T.Vector3().crossVectors(state.forward,state.normal);const angle=Math.atan2(toward.dot(side),toward.dot(state.forward))*180/Math.PI;const distance=Math.acos(Math.max(-1,Math.min(1,state.normal.dot(next.normal))))*RADIUS;$('nextstop').textContent=next.goods?`${next.name} · ${next.goods}`:next.name;$('bearing').textContent=(Math.abs(angle)<12?'AHEAD':(angle>0?'RIGHT ':'LEFT ')+Math.round(Math.abs(angle))+'°')+' · '+Math.round(distance*10)+'m';}
  {let st=extras.status(state);if(extras.hasMail)st+=` · HOOK LINE ${Math.round(lineLen*10)}m`;$('challenge').innerHTML=st;$('challenge').hidden=!st;}$('cargo').textContent=`${route.parcels} PARCELS · CONDITION ${Math.round(route.condition)}% · SCORE ${route.score}`;$('laptext').textContent=runMode?`DAY ${run.day} · ${clockText(route.elapsed,run.plan.dayLength)} · ${fmtTime(run.plan.dayLength-route.elapsed)} OF DAYLIGHT`:`${Math.round(route.elapsed)}s · ${route.drops} drops`;
 }
}
let mapWorld=false,mapTick=0;const mapCanvas=$('missionmap');$('mapmode').onclick=()=>{mapWorld=!mapWorld;$('mapmode').textContent=mapWorld?'WORLD':'ROUTE';$('mapmode').setAttribute('aria-pressed',String(mapWorld));};
let hudTick=0;
const camLook=new T.Vector3(),swoopFrom=new T.Vector3(),swoopLook=new T.Vector3(),swoopUp=new T.Vector3(0,1,0);
const smoother=u=>u*u*u*(u*(u*6-15)+10);
function chaseTarget(pos,look){const p=state.normal.clone().multiplyScalar(RADIUS+state.altitude);pos.copy(p).addScaledVector(state.forward,-17).addScaledVector(state.normal,12);look.copy(p).addScaledVector(state.forward,12);}
function snapChaseCamera(){chaseTarget(target,camTarget);camera.position.copy(target);camera.up.copy(state.normal);camera.lookAt(camTarget);}
// Low close-up that slowly circles the cargo door while the crew works (runway-local coordinates).
function closeupCamera(t,pos,look){home.updateMatrixWorld(true);const u=Math.min(1,t/LOAD_TIME),e=u*u*(3-2*u),theta=-.7+.55*e,r=8.2-1.4*e;
 pos.set(CAMERA_FOCUS.x+Math.cos(theta)*r,2.5-.5*e,CAMERA_FOCUS.z+Math.sin(theta)*r);look.set(CAMERA_FOCUS.x-.3*e,CAMERA_FOCUS.y,CAMERA_FOCUS.z);home.localToWorld(pos);home.localToWorld(look);}
function startCutscene(){mode='cutscene';cine.t=0;cine.swoop=false;keys={};applyPose(state,parkedPose());doorHinge.rotation.y=1.3;depot.visible=false;crew.update(0);
 document.body.classList.add('cinematic');$('cinema').hidden=false;$('caption').textContent=`${runMode?`DAY ${run.day}`:`DAY ${dayIndex+1} · ${DAYS[dayIndex].title.toUpperCase()}`} · LOADING ${route.stops.length} PARCELS`;
 closeupCamera(0,camera.position,camLook);camera.up.set(0,1,0);camera.lookAt(camLook);}
function endCutscene(){releaseMouse();applyPose(state,takeoffPose(ROLL_TIME+CLIMB_TIME));state.throttle=8/26;state.fuel=100;$('throttle').value=31;doorHinge.rotation.y=0;depot.visible=true;crew.rest();
 document.body.classList.remove('cinematic');$('cinema').hidden=true;mode='flight';keys={};last=performance.now();notify(runMode?`DAY ${run.day} · ${curDay.brief.toUpperCase()} · FINISH BEFORE DARK · NO LANDINGS, SO WATCH YOUR FUEL`:`DAY ${dayIndex+1} · ${DAYS[dayIndex].brief}`);noticeUntil=performance.now()+6000;}
function skipCutscene(){if(mode!=='cutscene')return;endCutscene();snapChaseCamera();}
// Returns true while the cutscene owns the camera; during the takeoff roll the normal chase camera takes over.
function updateCutscene(dt){
 cine.t+=dt;const t=cine.t;crew.update(t);
 if(t<LOAD_TIME){prop.rotation.z+=dt*8;closeupCamera(t,camera.position,camLook);camera.up.set(0,1,0);camera.lookAt(camLook);return true;}
 if(t<LOAD_TIME+SWOOP_TIME){
  if(!cine.swoop){cine.swoop=true;closeupCamera(LOAD_TIME,swoopFrom,swoopLook);$('caption').textContent='ALL LOADED · CLEARED FOR TAKEOFF';depot.visible=true;}
  const u=(t-LOAD_TIME)/SWOOP_TIME,e=smoother(u);doorHinge.rotation.y=1.3*(1-Math.min(1,u*1.8));prop.rotation.z+=dt*(8+40*u);
  chaseTarget(target,camTarget);camera.position.lerpVectors(swoopFrom,target,e).addScaledVector(state.normal,Math.sin(u*Math.PI)*5);
  camLook.lerpVectors(swoopLook,camTarget,e);camera.up.copy(swoopUp).lerp(state.normal,e).normalize();camera.lookAt(camLook);return true;
 }
 const tt=t-LOAD_TIME-SWOOP_TIME;
 if(tt>=ROLL_TIME+CLIMB_TIME){endCutscene();return false;}
 applyPose(state,takeoffPose(tt));prop.rotation.z+=dt*65;
 $('caption').textContent=tt<ROLL_TIME?'TAKEOFF ROLL':tt<ROLL_TIME+1.2?'WHEELS UP':'';
 return false;
}

function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.04);last=now;let camHandled=false;
 if(mode==='cutscene')camHandled=updateCutscene(dt);
 else if(mode==='landing')camHandled=updateLanding(dt);
 else if(mode==='crash')camHandled=updateCrash(dt);
 else if(mode==='flight'||mode==='intro'){
  const steer=mode==='flight'&&mouse.active,clamp1=v=>Math.max(-1,Math.min(1,v));
  advance(state,{turn:mode==='flight'?clamp1(Number(!!keys.right)-Number(!!keys.left)+(steer?mouseAxis(mouse.x):0)+extras.buffet.turn+Math.sin(worldTime*8.1)*seaLife.pull(state.normal,worldTime)*1.3):0,climb:mode==='flight'?clamp1(Number(!!keys.up)-Number(!!keys.down)+(steer?mouseAxis(-mouse.y):0)+extras.buffet.climb+Math.sin(worldTime*6.3+1)*seaLife.pull(state.normal,worldTime)):0,boost:mode==='flight'&&keys.boost&&state.fuel>0,throttle:mode==='flight'?(Number(!!keys.faster)-Number(!!keys.slower)):0,engineOut:mode==='flight'&&state.fuel<=0,floor:mode==='flight'?0:7},dt*(mode==='intro'?.28:1));
  if(mode==='flight'){updateFuelAndTerrain(dt);if(run.pendingNext>0&&(run.pendingNext-=dt)<=0)nextDay();}
  prop.rotation.z+=dt*(state.fuel<=0&&mode==='flight'?Math.max(0,8):keys.boost?95:65);clouds.rotation.y+=dt*.001;
 }
 const position=state.normal.clone().multiplyScalar(RADIUS+state.altitude);aircraft.position.copy(position);
 right.crossVectors(state.forward,state.normal).normalize();up.copy(state.normal);back.copy(state.forward).negate();basis.makeBasis(right,up,back);aircraft.quaternion.setFromRotationMatrix(basis);
 if(mode!=='crash'){visual.rotation.z=-state.bank-state.roll;visual.rotation.x=state.pitch;}
 if(!camHandled&&!(mode==='paused'&&(pausedFrom==='cutscene'&&cine.t<LOAD_TIME+SWOOP_TIME||pausedFrom==='landing'&&landing?.stopped))&&mode!=='complete'){target.copy(position).addScaledVector(state.forward,-17).addScaledVector(state.normal,12);
 camera.position.lerp(target,1-Math.exp(-5*dt));camera.up.copy(state.normal);camTarget.copy(position).addScaledVector(state.forward,12);camera.lookAt(camTarget);}
 const wantedFov=keys.boost&&mode==='flight'?85:mode==='cutscene'&&cine.t<LOAD_TIME?58:78;camera.fov+=(wantedFov-camera.fov)*(1-Math.exp(-2*dt));camera.updateProjectionMatrix();
 if(mode==='landing'&&mode!=='complete')updateDelivery(dt);
 if(gateGroup.visible)gateMat.emissiveIntensity=.65+.35*Math.sin(now*.005);
 if(mode==='flight'){
  updateDelivery(dt);
  trailTick+=dt;if(trailTick>.06){trailTick=0;const t=trails[trailIndex++%trails.length];t.position.copy(position).addScaledVector(state.forward,-2.2);t.visible=!!keys.boost;}
 }
 audio.update({sputter:mode==='flight'&&state.fuel<10?(state.fuel<=0?1:.5):0,windy:extras.windy?1:0,speed:state.speed,boost:mode==='flight'&&!!keys.boost,pitch:state.pitch,active:mode==='flight'||mode==='cutscene'||mode==='landing'});
 checkDaylight();
 if(mode!=='paused'){worldTime+=dt;for(const e of seaLife.update(dt,worldTime,mode==='flight'?position:null))if(e.type==='horn')audio.sfx.horn(e.ship);
  if(mode==='flight'){const pull=seaLife.pull(state.normal,worldTime);if(pull>0){route.condition=Math.max(40,route.condition-dt*3*pull);if(worldTime-spoutNotice>6){spoutNotice=worldTime;notify('WATERSPOUT · HOLD ON · FLY AROUND IT');}}}
  graphics.update(dt,{state,planeWorld:position,time:worldTime,engine:mode==='flight'||mode==='landing'?(state.fuel>0?Math.min(1,state.speed/12):0):mode==='cutscene'?(cine.t<LOAD_TIME?.25:1):mode==='intro'?1:0});
  celebrations.update(dt);for(const e of extras.update(dt,{state,planeWorld:position,hookWorld:mode==='flight'?updateLine(dt,position):(updateLine(dt,position),null),active:mode==='flight',par:curDay.par}))handleChallenge(e);}
 if(shake>0){shake=Math.max(0,shake-dt);camera.position.add(new T.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).multiplyScalar(shake*1.6));}
 if(now>noticeUntil)clearNotice();
 hudTick+=dt;if(hudTick>.1){hudTick=0;{const f=Math.ceil(state.fuel);$('fuel').textContent=f;$('fuelbar').style.width=f+'%';$('fuelbox').classList.toggle('low',f<25);}$('speed').textContent=Math.round(state.speed*3);$('altitude').textContent=Math.round(state.altitude*10);const pct=route.delivered/route.stops.length*100;$('progress').textContent=route.delivered+'/'+route.stops.length;$('progressbar').style.width=pct+'%';$('throttle').value=Math.round(state.throttle*100);$('throttlevalue').textContent=Math.round(state.throttle*100)+'%';let nearest=null,best=-1;for(const i of islands){const dot=state.normal.dot(i.n);if(dot>best){best=dot;nearest=i;}}$('region').textContent=best>.85?nearest.label:'OPEN OCEAN';}
 mapTick+=dt;if(mapTick>.08){mapTick=0;const summary=drawMinimap(mapCanvas,state,islands,route.stops,depot.position.clone().normalize(),mapWorld,now/1000,gateGroup.visible?gateNormal:null,extras.markers());$('mapstatus').textContent=route.complete?'Head home · H marks the gate':`${summary.remaining} / ${summary.total} stops left`;}
 renderer.render(scene,camera);
 renderPip(dt);
}requestAnimationFrame(frame);
