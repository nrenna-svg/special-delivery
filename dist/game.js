import * as T from './vendor/three.module.js';
import {newFlight,advance,startStunt,RADIUS,fuelBurn,verticalSpeed} from './flight.js';
import {newRoute,makeParcel,stepParcel,predictDrop,safeDropAltitude,RELEASE_DELAY,resolveDelivery,padAt,releaseState} from './delivery.js';
import {drawMinimap} from './minimap.js';
import {LOAD_TIME,SWOOP_TIME,ROLL_TIME,CLIMB_TIME,CUTSCENE_TIME,GROUND_ALT,takeoffPose,parkedPose,applyPose} from './takeoff.js';
import {createCrew,CAMERA_FOCUS} from './crew.js';
import {createPeopleKit} from './people.js';
import {createCelebrations} from './celebrate.js';
import {createAudio} from './audio.js';
import {DAYS,ISLANDS,dayStops,dayFeatures,allPadNormals,loadProgress,saveResult} from './days.js';
import {createExtras} from './extras.js';
import {planDay,clockText} from './run.js';
import {terrainCheck,pickRespawn,LIGHTHOUSE,floorAt,WATER_FLOOR,groundHeight,mesaHeight} from './hazards.js';
import {GROUND} from './days.js';
import {DESERT as IN_DESERT,WORLD as HERE,WORLDS as ALL_WORLDS} from './worlds.js';
import {createGraphics} from './graphics.js';
import {createSeaLife} from './sealife.js';
import {CELEBRATION_TIME} from './celebrate.js';
import {GATE_Z,GATE_ALT,GATE_RADIUS,BOUNCE_TIME,toRunway,runwayNormal,gateCrossing,gradeLanding,landingPath} from './landing.js';
import {PHASES,ROLLOUT_TIME,rolloutPose,applyRunwayPose,runwayForward,airfieldClear,onRunway,gradeTouchdown,BRAKE,RUNWAY_HALF,MAX_SINK} from './airfield.js';
import {createAirfield} from './hangar.js';
import {CARGO,cargoEffect} from './cargo.js';
import {createShortcuts} from './shortcuts.js';
import {createThreats,RADAR_FLOOR,FLAK_DAMAGE,DODGE_NEAR,DODGE_FAR} from './threats.js';
import {PARTS,PART,RANKS,MAX_LEVEL,rankOf,nextRank,nextAction,buy,stats,statAfter,partState,newParts,levelCost} from './upgrades.js';
import {WORLDS,WORLD_ORDER,WORLD,setWorld} from './worlds.js';
import {CRATE_WEIGHTS} from './career.js';
import {routeLength} from './career.js';
import {TIERS,JOB_TYPES,jobBoard,jobRoute,objectivePay,settle,loadCareer,saveCareer,newCareer,loadBestCareer,saveBestCareer,money,allSiteNormals} from './career.js';
// v0.70: the game is now a career flown from the hangar. Endless Run and Training Days are hidden
// (their code is kept; set LEGACY_MODES to true to bring the old menus back).
const LEGACY_MODES=false;
// Upgrade effects (v0.74): perf = stats(career), refreshed whenever the plane leaves the hangar.
let perf=null;const chuteOpts=()=>({chuteDelay:perf.chute,drift:perf.drift,soft:perf.soft}),crateOpts=()=>({...chuteOpts(),chuteDelay:.1});
const $=id=>document.getElementById(id), canvas=$('world');
let renderer;
try{renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}catch(e){$('error').hidden=false;throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.outputColorSpace=T.SRGBColorSpace;
renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const scene=new T.Scene();scene.background=new T.Color(IN_DESERT?'#f2c18c':'#83bdcd');
scene.fog=new T.Fog(IN_DESERT?'#f2c18c':'#83bdcd',240,530);
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
const padNormals=[...allPadNormals(),...allSiteNormals()],nearPad=v=>padNormals.some(p=>p.dot(v)>Math.cos(10/RADIUS));
const cactusMat=mat('#5d8a4a'),adobe=mat('#d9a87a'),adobe2=mat('#c48e60');
function cactus(g,h){box(g,.42,h,.42,0,h/2,0,cactusMat);for(const sx of [-1,1]){if(rand()<.35)continue;const y=h*(.35+rand()*.3),l=.5+rand()*.3;box(g,l,.3,.3,sx*(l/2+.18),y,0,cactusMat);box(g,.3,.7+rand()*.6,.3,sx*(l+.05),y+.4,0,cactusMat);}}
function island(n,size,label,mh=0){n.normalize();islands.push({n,size,label,h:mh});const rings=mh?16:9,segments=42,verts=[],colors=[];const q=new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),n);const noise=Array.from({length:segments},()=>.87+rand()*.24);
 function pt(r,i){const a=i/segments*Math.PI*2, rr=r*size*noise[i%segments];const h=mh?mesaHeight(mh,r):r>.86?.25:1.0+Math.sin((1-r)*Math.PI)*1.1;return new T.Vector3(Math.cos(a)*rr,RADIUS,Math.sin(a)*rr).normalize().multiplyScalar(RADIUS+h).applyQuaternion(q);}
 islands[islands.length-1].outline=Array.from({length:segments},(_,i)=>pt(1,i).normalize());
 for(let r=0;r<rings;r++)for(let i=0;i<segments;i++){const a=pt(r/rings,i),b=pt((r+1)/rings,i),c=pt((r+1)/rings,i+1),d=pt(r/rings,i+1);for(const p of [a,c,b,a,d,c])verts.push(p.x,p.y,p.z);const color=new T.Color(mh?(r/rings>=.9?'#e2bd86':r/rings>=.72?['#b4553a','#c9683f','#9c4630','#d27a48'][r%4]:['#d9a066','#cf9358','#e0ad72'][Math.floor(rand()*3)]):IN_DESERT?(r>=7?'#e2bd86':r>=6?'#d0a46c':['#c99a62','#cfa36c','#bf9a5e'][Math.floor(rand()*3)]):r>=7?'#dec58f':r>=6?'#a5af74':['#78a46b','#6d9863','#83a970'][Math.floor(rand()*3)]);for(let j=0;j<6;j++)colors.push(color.r,color.g,color.b);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));geo.computeVertexNormals();mesh(geo,mat('#ffffff',{vertexColors:true,side:T.DoubleSide}));
 for(let i=0;i<24;i++){const a=rand()*Math.PI*2,r=Math.sqrt(rand())*size*.72;const normal=surfacePoint(n,Math.cos(a)*r,Math.sin(a)*r).normalize();if(airfieldClear(normal)||nearPad(normal))continue;if(IN_DESERT){if(mh&&r>size*.66)continue;const g=place(normal,mh?mh-.1:1.2),h=1.6+rand()*2;cactus(g,h);continue;}const g=place(normal,1.4),h=2+rand()*3;box(g,.35,h*.6,.35,0,h*.3,0,palette.trunk);const leaf=mesh(new T.ConeGeometry(1.5,h,6),palette.leaf,g);leaf.position.y=h*.7;}
 for(let i=0;i<5;i++){const normal=surfacePoint(n,(rand()-.5)*size*.9,(rand()-.5)*size*.9).normalize();if(airfieldClear(normal)||nearPad(normal))continue;if(IN_DESERT){const rr=Math.acos(Math.min(1,normal.dot(n)))*RADIUS/size;if(mh&&rr>.66)continue;const g=place(normal,mh?mh-.1:1.2),h=1+rand()*1.6;box(g,2.4,h,2.8,0,h/2,0,adobe);box(g,2.6,.25,3,0,h+.1,0,adobe2);for(const x of [-.9,.3])box(g,.18,.18,.6,x,h-.3,1.5,palette.trunk);continue;}const g=place(normal,1.2),h=1+rand()*2;box(g,2,h,2.7,0,h/2,0,palette.white);const roof=mesh(new T.ConeGeometry(2,1.1,4),palette.red,g);roof.position.y=h+.45;roof.rotation.y=Math.PI/4;}
}
for(const i of ISLANDS)island(new T.Vector3(...i.n),i.size,i.label,i.h||0);
// A runway and striped lighthouse make home recognizable from every approach.
const home=place(new T.Vector3(0,1,0),2.25);home.visible=false;/* v0.70: the old short runway and loading crew, replaced by hangar.js */box(home,5,.12,29,0,0,0,palette.dark);
for(let i=-12;i<=12;i+=4)box(home,.22,.05,1.7,0,.1,i,palette.white);
for(const x of [-2.8,2.8])for(let z=-12;z<=12;z+=6)sphere(home,.18,x,.2,z,mat('#ffdb84'));
const crew=createCrew({T,parent:home,mat});const field=createAirfield({T,scene,mat,palette,signText:IN_DESERT?'DUSTWATER COURIER CO.':'KESTREL COURIER CO.'});
// The other world hangs in the sky like a moon: the goal you can see from the start (v0.74).
{const other=IN_DESERT?'kestrel':'mesa',dir=new T.Vector3(-.5,.3,-.8).normalize(),g=new T.Group();g.position.copy(dir).multiplyScalar(800);scene.add(g);
 const lit=(c,e)=>new T.MeshLambertMaterial({color:c,emissive:c,emissiveIntensity:e,fog:false,flatShading:true});
 g.add(new T.Mesh(new T.IcosahedronGeometry(60,3),lit(other==='mesa'?'#e0a467':'#2e8fb0',.35)));
 let k=7;const rr=()=>{k=(k*1664525+1013904223)>>>0;return k/4294967296;};
 for(let i=0;i<14;i++){const n=new T.Vector3(rr()-.5,rr()-.5,rr()-.5).normalize(),b=new T.Mesh(new T.IcosahedronGeometry(6+rr()*9,1),lit(other==='mesa'?['#b4553a','#c9683f','#9c4630'][i%3]:['#6d9863','#dec58f','#78a46b'][i%3],.3));b.position.copy(n).multiplyScalar(56);b.scale.set(1,.35,1);b.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),n);g.add(b);}
 const halo=new T.Mesh(new T.IcosahedronGeometry(68,3),new T.MeshBasicMaterial({color:other==='mesa'?'#ffd2a0':'#bfe8ff',transparent:true,opacity:.18,side:T.BackSide,fog:false,depthWrite:false}));g.add(halo);g.traverse(o=>{if(o.isMesh)o.userData.noCast=true;});}
const tower=place(LIGHTHOUSE.normal.clone(),1.8);
for(let i=0;i<5;i++){const m=mesh(new T.CylinderGeometry(1.2-i*.12,1.3-i*.12,1.1,8),i%2?palette.red:palette.white,tower);m.position.y=i*1.1+.55;}
sphere(tower,.85,0,5.8,0,mat('#ffe7a1',{emissive:'#ffb74c',emissiveIntensity:.5}));
// Faceted water glints hug the sphere rather than forming a flat ground plane.
const glintmat=mat('#8bc7cd',{transparent:true,opacity:.42});
for(let i=0;i<(IN_DESERT?0:460);i++){const n=new T.Vector3(rand()-.5,rand()-.5,rand()-.5).normalize();const g=place(n,.15);box(g,.5+rand()*3,.025,.12,0,0,0,glintmat);}
const clouds=new T.Group();scene.add(clouds);const cloudmat=mat('#f4f1e4');
for(let i=0;i<(IN_DESERT?14:45);i++){const n=new T.Vector3(rand()-.5,rand()-.5,rand()-.5).normalize();const g=new T.Group();g.position.copy(n).multiplyScalar(RADIUS+38+rand()*25);g.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),n);clouds.add(g);for(let j=0;j<4;j++){const puff=sphere(g,2.5+rand()*2,j*3-4,rand(),rand()*2,cloudmat,1);puff.scale.set(1.4,.65,1);}}
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
// Career state (v0.70; see the Career section near the end).
let career=loadCareer();if(!career.alive)career=saveCareer(newCareer());if(!career.parts)career.parts=newParts();perf=stats(career);
let job=null,board=[],selectedJob=0,touch=null;const roll={t:0},fieldPos=new T.Vector3(),fieldLook=new T.Vector3();
const NO_FEATURES={rings:[],wind:null,mail:[],flocks:[],storms:[],fuel:[],crates:[],night:false,spouts:false};
let runMode=LEGACY_MODES;const run={active:false,over:false,seed:1,day:1,total:0,plan:LEGACY_MODES?planDay(1,1):null,warned:0,pendingNext:0};
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
 for(const stop of route.stops){const g=place(stop.normal,stop.motion?2.6:groundHeight(stop.normal)+.6);const color=mat(stop.color,{emissive:stop.color,emissiveIntensity:.25});const ring=mesh(new T.TorusGeometry(7.7,.22,6,48),color,g);ring.rotation.x=-Math.PI/2;const pad=mesh(new T.CircleGeometry(7.5,32),mat(stop.color,{transparent:true,opacity:.25,side:T.DoubleSide}),g);pad.rotation.x=-Math.PI/2;const sign=label(String(stop.id+1));sign.position.y=5;g.add(sign);box(g,.15,6,.15,0,3,0,palette.white);box(g,2,1.3,.1,1,5,0,color);destinations.push({g,ring,sign,color});}}
buildPads();
const extras=createExtras({T,scene,mat,palette,label,hemi,sun,aircraft});const threats=createThreats({T,scene,mat,label,ground:groundHeight});let lockBeep=0;let shake=0;const shortcuts=createShortcuts(scene);let cargoTurn=0;
const cargoRack=new T.Group();visual.add(cargoRack);for(let i=0;i<2;i++){const b=new T.Mesh(new T.BoxGeometry(.65,.5,.7),new T.MeshStandardMaterial({color:0xd6b279}));b.position.set((i-.5)*.7,-.65,.55);cargoRack.add(b);}cargoRack.visible=false;
// Visual upgrade and life on the water. Details stay off the runway, apron, lighthouse and every pad.
const keepClear=n=>nearPad(n)||airfieldClear(n,5)||n.dot(LIGHTHOUSE.normal)>Math.cos(5/RADIUS);
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
 for(const z of [66,52,38]){let t=0;while(guide.pose(t).z>z&&t<20)t+=.01;const r=runwayPlace(0,z,guide.pose(t).altitude);mesh(new T.TorusGeometry(1.5,.14,6,32),gateMat,r);}}
const gateNormal=runwayNormal(0,GATE_Z,new T.Vector3());
const audio=createAudio();
function audioLabels(){$('sound').innerHTML=`SOUND <span>${audio.sfxOn?'ON':'OFF'}</span>`;$('sound').setAttribute('aria-pressed',String(audio.sfxOn));$('music').innerHTML=`MUSIC <span>${audio.musicOn?'ON':'OFF'}</span>`;$('music').setAttribute('aria-pressed',String(audio.musicOn));}
$('sound').onclick=()=>{audio.unlock();audio.setSfx(!audio.sfxOn);audioLabels();};$('music').onclick=()=>{audio.unlock();audio.setMusic(!audio.musicOn);audioLabels();};audioLabels();
const celebrations=createCelebrations({T,mat,kit:createPeopleKit({T,mat})});
// Postmark stamp shown over the scene for each successful delivery.
let stampTimer=0;
function showStamp(result,stop){const el=$('stamp');el.style.setProperty('--ink',stop.color);$('stampgoods').textContent=result.goods;$('stampname').textContent=result.name;$('stamppoints').textContent=job?'+'+money(result.points):'+'+result.points;$('stampdetail').textContent=`ACCURACY ${result.accuracy}% · ${job?`${route.done} OF ${job.units}`:`${route.delivered} OF ${route.stops.length}`}`;el.hidden=false;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');clearTimeout(stampTimer);stampTimer=setTimeout(()=>{el.hidden=true;},3200);}
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
function startHomeward(){if(job)return;gateGroup.visible=true;audio.sfx.refill();notify(`ALL ${route.stops.length} DELIVERED · HEAD HOME · FLY THROUGH THE GOLD GATE OFF THE RUNWAY END TO LAND`);noticeUntil=performance.now()+7000;}
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
 if(!L.touched&&L.t>=L.path.touchdown){L.touched=true;route.score+=L.grade.bonus;audio.sfx.touchdown(L.grade.bouncy);if(job)notify('AUTO-LANDING · WELCOME HOME');else notify(`${L.grade.label} · ${'★'.repeat(L.grade.stars)}${'☆'.repeat(3-L.grade.stars)} · +${L.grade.bonus}${L.grade.centered?' · RIGHT ON THE CENTERLINE':''}`);noticeUntil=performance.now()+5000;}
 if(L.grade.bouncy&&L.touched&&!L.second&&L.t>=L.path.touchdown+BOUNCE_TIME){L.second=true;audio.sfx.touchdown(false);}
 if(!L.stopped&&L.t>=L.path.stopped){L.stopped=true;audio.sfx.cheer();}
 crew.update(LOAD_TIME+2+L.t);
 if(L.t>=L.path.done){if(job){if(mode==='landing')finishJob({landing:null});return true;}completeRoute();return true;}
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
function restartFlight(){if(job){finishJob({failed:true,abandoned:true});return;}if(runMode)startRun();newMission();}
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
function obstacles(){return [LIGHTHOUSE,field.obstacle,...threats.obstacles(),...extras.obstacles(),...seaLife.obstacles(worldTime)];}
function updateFuelAndTerrain(dt){
 state.fuel=Math.max(0,state.fuel-fuelBurn(state.throttle,!!keys.boost&&state.fuel>0,perf)*dt);
 if(state.fuel<25&&lowFuelStage<1){lowFuelStage=1;audio.sfx.lowfuel();const h=extras.nearestFuel(state.normal);notify(`LOW FUEL · ${h?'FLY THROUGH A GREEN F HOOP OR ':''}HEAD FOR THE BLUE DEPOT AT HOME`);noticeUntil=performance.now()+5000;}
 if(state.fuel<10&&lowFuelStage<2){lowFuelStage=2;audio.sfx.lowfuel();notify('FUEL CRITICAL · THE ENGINE IS SPUTTERING');}
 if(state.fuel<=0&&lowFuelStage<3){lowFuelStage=3;audio.sfx.engineOut();notify(runMode?'OUT OF FUEL · GLIDE THROUGH A GREEN F HOOP OR THE BLUE DEPOT, OR THE RUN IS OVER':'OUT OF FUEL · GLIDING · REACH A FUEL HOOP OR BRACE FOR A BUMPY LANDING');noticeUntil=performance.now()+6000;}
 const chk=terrainCheck(state.normal,state.altitude,obstacles());
 if(chk.crash){beginCrash(chk.what);return;}
 const sinking=verticalSpeed(state)<.6;warnOn=chk.warn&&sinking&&!state.stunt&&!nearRunway();document.body.classList.toggle('pullup',warnOn);
 if(warnOn){warnBeep-=dt;if(warnBeep<=0){warnBeep=.38;audio.sfx.warn();}}else warnBeep=0;
 crumbTick+=dt;if(crumbTick>=.5){crumbTick=0;if(chk.clearance>6&&!state.stunt){crumbs.push({normal:state.normal.clone(),forward:state.forward.clone(),altitude:state.altitude});if(crumbs.length>60)crumbs.shift();}}
}
function beginCrash(what){shortcuts.resetTrack();
 const noFuel=state.fuel<=0;mode='crash';keys={};releaseMouse();warnOn=false;document.body.classList.remove('pullup');pendingDrop=null;lineTarget=0;
 route.crashes++;route.elapsed+=15;if(route.parcels>0)route.parcels--;route.condition=Math.max(40,route.condition-15);
 crash={t:0,what,noFuel,spin:(Math.random()<.5?-1:1),start:state.altitude};
 audio.sfx.crash();shake=.9;if(floorAt(state.normal)===WATER_FLOOR)graphics.splash(state.normal.clone().multiplyScalar(RADIUS),2.2);
 // Debris and smoke where the plane went down.
 const at=state.normal.clone().multiplyScalar(RADIUS+state.altitude),n=state.normal.clone();
 for(let i=0;i<22;i++){const shard=box(scene,.2+rand()*.6,.06+rand()*.14,.2+rand()*.5,0,0,0,[palette.gold,palette.red,palette.dark][i%3]);shard.position.copy(at);fragments.push({mesh:shard,velocity:new T.Vector3(rand()-.5,rand()-.5,rand()-.5).multiplyScalar(14).addScaledVector(n,7),life:2.2+rand()});}
 notify(job?`CRASHED INTO ${what.toUpperCase()} · ${TIERS[job.tier].crash==='career'&&state.normal.y<.97?'YOUR CAREER IS OVER':`REPAIRS ${money(TIERS[job.tier].repair)}`}${TIERS[job.tier].crash==='fail'&&state.normal.y<.97?' · JOB FAILED':''}`:`CRASHED INTO ${what.toUpperCase()} · −1 PARCEL · −15% CARGO · +15 s`);noticeUntil=performance.now()+3500;$('notice').classList.add('lost');
}
function updateCrash(dt){
 crash.t+=dt;visual.rotation.z+=dt*7*crash.spin;visual.rotation.x+=dt*2;prop.rotation.z+=dt*4;
 state.altitude=Math.max(0,state.altitude-dt*2);
 for(let i=fragments.length-1;i>=0;i--){const f=fragments[i];f.life-=dt;f.velocity.addScaledVector(f.mesh.position.clone().normalize(),-12*dt);f.mesh.position.addScaledVector(f.velocity,dt);f.mesh.rotation.x+=dt*4;if(f.life<=0){scene.remove(f.mesh);f.mesh.geometry.dispose();fragments.splice(i,1);}}
 const pos=state.normal.clone().multiplyScalar(RADIUS+state.altitude);camTarget.copy(pos);camera.up.copy(state.normal);camera.lookAt(camTarget);
 if(crash.t<2.3)return true;
 if(crash.noFuel&&runMode&&run.active){runOver('fuel');return true;}
  if(job){const rule=TIERS[job.tier].crash,home=state.normal.y>.97;if(rule==='career'&&!home){careerOver(crash.what);return true;}if(home||rule==='fail'){finishJob({failed:rule==='fail'&&!home});return true;}}
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
 else if(e.type==='tooheavy'){audio.sfx.missed();notify(`TOO HEAVY · THIS ${CRATE_WEIGHTS[e.weight]} CRATE NEEDS A STRONGER WINCH`);noticeUntil=performance.now()+3000;}
  else if(e.type==='crate'){audio.sfx.snag();notify(`${e.goods.toUpperCase()} ON THE HOOK · KEEP THE LINE OUT · SPACE DROPS IT ON THE PAD`);noticeUntil=performance.now()+6000;}
  else if(e.type==='mail'&&job){audio.sfx.snag();const pay=objectivePay(job,{});route.earned+=pay;route.done++;notify(e.left?`MAILBAG SNAGGED +${money(pay)} · ${e.left} TO GO`:`ALL MAILBAGS ABOARD +${money(pay)}`);}
  else if(e.type==='mail'){audio.sfx.snag();route.score+=100;if(e.left){notify(`MAILBAG SNAGGED +100 · ${e.left} TO GO`);}else if(route.complete){if(runMode)queueNextDay();else startHomeward();}else notify('ALL MAILBAGS ABOARD +100');}
 else if(e.type==='thunder')audio.sfx.thunder(e.dist);
 else if(e.type==='fuel'){if(state.fuel<97){state.fuel=100;lowFuelStage=0;audio.sfx.refill();notify('FUEL HOOP · TANK FULL');}}
 else if(e.type==='storm')notify('STORM CELL · TURBULENCE IS SHAKING THE CARGO · FLY AROUND IT');
 else if(e.type==='late'){audio.sfx.late();notify(`${e.stop.goods.toUpperCase()} IS LATE · THE RUSH BONUS IS GONE, BUT STILL DELIVER IT`);}
 else if(e.type==='tick')audio.sfx.tick();
}
function clearNotice(){$('notice').textContent='';$('notice').classList.remove('lost');}
function notify(text){$('notice').classList.remove('lost');$('notice').textContent=text;noticeUntil=performance.now()+4000;}
function reset(){shortcuts.start(job);cargoTurn=0;cargoRack.visible=false;lineLen=lineTarget=0;crumbs.length=0;crash=null;lowFuelStage=0;warnOn=false;document.body.classList.remove('pullup');clearNotice();aim.visible=false;celebrations.clear();$('stamp').hidden=true;stopPip();landing=null;gateGroup.visible=false;noticeUntil=0;pendingDrop=null;for(const f of fragments){scene.remove(f.mesh);f.mesh.geometry.dispose();}fragments.length=0;for(const p of packages)disposeParcel(p);packages=[];const plan=careerPlan();plan.features.flares=partState(career,'flares').unlocked?perf.flares:0;run.warned=0;route=newRoute(plan.stops);route.crashes=0;route.earned=0;route.done=0;route.jobDone=false;buildPads();extras.start(plan.features,route,destinations);threats.start(plan.features);seaLife.setDay(plan.features);$('approach').hidden=true;graphics.shadowify(scene);hook.visible=false;dropCooldown=0;deliveryElapsed=0;state=newFlight();state.perf=perf;state.normal.set(0,1,.18).normalize();state.forward.set(0,.18,-1).normalize();state.throttle=8/26;state.speed=18;$('throttle').value=31;tripAngle=0;previousLongitude=0;lapArmed=false;laps=0;keys={};trails.forEach(t=>t.visible=false);$('laptext').textContent='Fly straight. Find your way home.';camera.position.copy(state.normal).multiplyScalar(RADIUS+26).addScaledVector(state.forward,-17);}
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
if(LEGACY_MODES)renderDays();
function startRun(){run.pendingNext=0;run.active=true;run.over=false;run.seed=Math.floor(Math.random()*1e9);run.day=1;run.total=0;run.plan=planDay(1,run.seed);}
// Clean HUD (v0.68): the control hints show for a few seconds after each takeoff or resume, then fade; H toggles the full HUD.
let hintTimer=0;function flashHints(){document.body.classList.add('hints');clearTimeout(hintTimer);hintTimer=setTimeout(()=>document.body.classList.remove('hints'),8000);}
function showPlaying(){$('overlay').hidden=true;document.body.classList.add('playing');flashHints();$('pause').innerHTML='PAUSE <kbd>P</kbd>';last=performance.now();}
function newMission(){audio.unlock();reset();startCutscene();showPlaying();}
function launch(){if(mode==='intro'||mode==='complete'){if(runMode&&(!run.active||run.over))startRun();newMission();return;}if(mode==='paused'){mode=pausedFrom;audio.setPaused(false);}showPlaying();}
function pause(){if(mode==='intro'||mode==='complete'||mode==='hangar'||mode==='tow')return;if(mode==='paused'){launch();return;}pausedFrom=mode;mode='paused';keys={};releaseMouse();audio.setPaused(true);$('days').hidden=true;$('modes').hidden=true;$('runinfo').hidden=true;$('overlay').hidden=false;$('overlay').querySelector('.eyebrow').textContent='HOLDING PATTERN';$('overlay').querySelector('h1').innerHTML='Take a<br><em>breather.</em>';$('introtext').textContent='Your little world will be right here.';$('start').innerHTML=(pausedFrom==='cutscene'?'RESUME':'RESUME FLIGHT')+' <span>↗</span>';$('pause').innerHTML='RESUME <kbd>P</kbd>';}
$('start').onclick=launch;$('pause').onclick=pause;$('reset').onclick=()=>restartFlight();$('skip').onclick=()=>skipCutscene();
// Mouse + keyboard: the mouse steers, W/S set the throttle, Q/E roll, F loops, Space drops. Arrow keys still steer.
const bindings={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',w:'faster',W:'faster',s:'slower',S:'slower',Shift:'boost','-':'slower','=':'faster','+':'faster'};
// Mouse steering: the cursor's offset from screen center sets bank (left/right) and climb (up = nose up).
// Steering starts on the first mouse move after takeoff or resume, so a resting cursor never yanks the plane.
const mouse={active:false,x:0,y:0},MOUSE_DEAD=.06,MOUSE_FULL=.45;
// Sensitivity (Settings, v0.84) shortens or lengthens the throw to full deflection.
const mouseAxis=v=>{const a=Math.abs(v),full=MOUSE_DEAD+(MOUSE_FULL-MOUSE_DEAD)*100/((typeof settings!=='undefined'&&settings.sens)||100);return a<MOUSE_DEAD?0:Math.sign(v)*Math.min(1,(a-MOUSE_DEAD)/(full-MOUSE_DEAD));};
function releaseMouse(){mouse.active=false;document.body.classList.remove('mousefly');}
window.addEventListener('pointermove',e=>{if(e.pointerType&&e.pointerType!=='mouse')return;const r=canvas.getBoundingClientRect();mouse.x=Math.max(-1,Math.min(1,(e.clientX-r.left)/r.width*2-1));mouse.y=Math.max(-1,Math.min(1,(e.clientY-r.top)/r.height*2-1));
 const el=$('reticle');el.style.transform=`translate(${e.clientX-r.left}px,${e.clientY-r.top}px)`;if(mode==='flight'&&!mouse.active){mouse.active=true;document.body.classList.add('mousefly');}});
document.documentElement.addEventListener('mouseleave',releaseMouse);
// Mouse wheel winch: scroll down to pay out a hook line under the plane, up to reel it in.
// The hook snags mailbags on Day 4; it can never hang lower than just above the ground.
const LINE_MAX=14,LINE_STEP=1.4;let lineLen=0,lineTarget=0,winchTick=0;
window.addEventListener('wheel',e=>{if(!(mode==='flight'||mode==='landing')||e.target.closest?.('.overlay,#days'))return;e.preventDefault();if(!winchOK()){if(performance.now()>noticeUntil-2500){notify('NO HOOK FITTED · UNLOCK THE WINCH & HOOK IN THE PLANE SHOP');}return;}
 const notches=Math.max(-3,Math.min(3,e.deltaY/(e.deltaMode===1?3:100)));lineTarget=Math.max(0,Math.min(perf.line,lineTarget+notches*LINE_STEP));},{passive:false});
const lineMesh=new T.Mesh(new T.CylinderGeometry(.05,.05,1,5),palette.dark);lineMesh.visible=false;scene.add(lineMesh);
const hookEnd=new T.Group();hookEnd.visible=false;scene.add(hookEnd);{const h=mesh(new T.TorusGeometry(.42,.1,6,14,Math.PI*1.35),palette.metal,hookEnd);h.rotation.set(0,Math.PI/2,Math.PI*.8);sphere(hookEnd,.22,0,.45,0,palette.red,0);}
const hookWorld=new T.Vector3(),lineTop=new T.Vector3(),lineDir=new T.Vector3();
function updateLine(dt,position){
 if(mode==='landing')lineTarget=0;lineTarget=Math.min(lineTarget,Math.max(0,state.altitude-2.8-(groundHeight(state.normal)-GROUND)));
 const before=lineLen;lineLen+=(lineTarget-lineLen)*(1-Math.exp(-perf.reel*dt));if(Math.abs(lineLen-lineTarget)<.02)lineLen=lineTarget;
 winchTick+=Math.abs(lineLen-before);if(winchTick>.7){winchTick=0;audio.sfx.winch();}
 const out=lineLen>.15;lineMesh.visible=hookEnd.visible=out;if(!out)return null;
 // The line streams back a little with airspeed.
 lineTop.copy(position).addScaledVector(state.normal,-1.1);
 hookWorld.copy(lineTop).addScaledVector(state.normal,-lineLen).addScaledVector(state.forward,-lineLen*Math.min(.45,state.speed*.018));
 lineDir.subVectors(hookWorld,lineTop);const len=lineDir.length();lineMesh.position.copy(lineTop).addScaledVector(lineDir,.5);lineMesh.scale.set(1,len,1);
 lineMesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),lineDir.normalize());hookEnd.position.copy(hookWorld);hookEnd.quaternion.copy(aircraft.quaternion);
 return hookWorld;
}
window.addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement)return;if(bindings[e.key]){e.preventDefault();keys[bindings[e.key]]=true;}if(e.code==='Space'){e.preventDefault();if(!e.repeat){if(mode==='cutscene')skipCutscene();else if(mode==='rollout')endRollout();else if(mode==='hangar'&&!$('board').hidden&&hangarTab==='jobs')takeJob();else drop();}}if(e.repeat)return;if(e.key==='Enter'&&mode==='cutscene'){e.preventDefault();skipCutscene();}if(e.key.toLowerCase()==='q')stunt('roll',-1);if(e.key.toLowerCase()==='e')stunt('roll',1);if(e.key.toLowerCase()==='l'||e.key.toLowerCase()==='f')stunt('loop');if(e.key==='p'||e.key==='P')pause();if((e.key==='c'||e.key==='C')&&mode==='flight')dropFlares();if(e.key==='h'||e.key==='H')document.body.classList.toggle('fullhud');if((e.key==='r'||e.key==='R')&&mode!=='intro'&&!job)restartFlight();if(e.key==='Escape'){if(mode==='cutscene')skipCutscene();else if(mode==='flight')pause();}});
window.addEventListener('keyup',e=>{if(bindings[e.key])keys[bindings[e.key]]=false;});
window.addEventListener('blur',()=>{keys={};if(mode==='flight'||mode==='cutscene'||mode==='landing'||mode==='crash'||mode==='rollout'||mode==='touchdown')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&(mode==='flight'||mode==='cutscene'||mode==='landing'))pause();});
document.querySelectorAll('[data-control]').forEach(b=>{b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys[b.dataset.control]=true;};b.onpointerup=b.onpointercancel=b.onlostpointercapture=()=>keys[b.dataset.control]=false;});
function resize(){renderer.setSize(innerWidth,innerHeight);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();}window.addEventListener('resize',resize);resize();reset();
const right=new T.Vector3(),up=new T.Vector3(),back=new T.Vector3(),basis=new T.Matrix4(),target=new T.Vector3(),camTarget=new T.Vector3();
function stunt(type,direction=1){if(mode!=='flight')return;if(pendingDrop){notify('Cargo release in progress.');return;}const error=startStunt(state,type,direction);if(!error){const dodged=threats.dodge(aircraft.position.clone());if(dodged){audio.sfx.whoosh();notify(`DODGED! THE MISSILE${dodged>1?'S':''} LOST YOU`);noticeUntil=performance.now()+2200;}}if(!error)audio.sfx.whoosh();notify(error||(type==='loop'?'LOOP · HOLD ON TO YOUR PARCELS':'BARREL ROLL'));}
function disposeParcel(p){scene.remove(p.mesh);p.mesh.traverse(o=>{if(o.geometry)o.geometry.dispose();});}
function parcelModel(){const g=new T.Group();box(g,.85,.85,.85,0,0,0,palette.trunk);box(g,.16,.88,.88,0,0,0,palette.white);const canopy=new T.Group();g.add(canopy);for(let i=0;i<8;i++){const m=mesh(new T.SphereGeometry(2,4,5,i*Math.PI/4,Math.PI/4,0,Math.PI/2),i%2?palette.white:palette.red,canopy);m.position.y=3;}
 for(let i=0;i<8;i++){const angle=i*Math.PI/4;const geo=new T.BufferGeometry().setFromPoints([new T.Vector3(Math.cos(angle)*1.95,3,Math.sin(angle)*1.95),new T.Vector3(0,.35,0)]);canopy.add(new T.Line(geo,cordMaterial));}canopy.visible=false;scene.add(g);return {mesh:g,canopy};}
const cordMaterial=new T.LineBasicMaterial({color:'#f8edcf'});
function smash(p){const normal=p.position.clone().normalize();for(let i=0;i<18;i++){const shard=box(scene,.15+rand()*.5,.08+rand()*.16,.12+rand()*.5,0,0,0,i%3?palette.trunk:palette.white);shard.position.copy(p.position);fragments.push({mesh:shard,velocity:new T.Vector3(rand()-.5,rand()-.5,rand()-.5).multiplyScalar(10).addScaledVector(normal,5),life:1.8+rand()});}while(fragments.length>90){const f=fragments.shift();scene.remove(f.mesh);f.mesh.geometry.dispose();}notify('LOST GOODS · Parcel smashed. Drop higher for the parachute.');$('notice').classList.add('lost');}
function drop(){if(mode!=='flight'||pendingDrop||dropCooldown>0)return;if(state.stunt){notify('Level out before releasing cargo.');return;}const crateDrop=extras.carrying;if(!crateDrop&&!route.parcels){notify(job?(job.type==='crate'?'HOOK THE CRATE FIRST · SCROLL DOWN TO LOWER THE LINE, SWEEP IT THROUGH THE RING':job.type==='mail'?'NO PARCELS ON A MAIL JOB · SNAG THE MAILBAGS WITH THE HOOK LINE':'OUT OF PARCELS'):'Out of parcels. Fly through the blue depot hoop to refill.');return;}if(!crateDrop)route.parcels--;route.drops++;pendingDrop={remaining:RELEASE_DELAY,condition:route.condition,crate:crateDrop};dropCooldown=RELEASE_DELAY+.2;notify('RELEASING CARGO…');}
$('drop').onclick=drop;$('rollleft').onclick=()=>stunt('roll',-1);$('rollright').onclick=()=>stunt('roll',1);$('loop').onclick=()=>stunt('loop');$('throttle').oninput=e=>{state.throttle=Number(e.target.value)/100;};
function completeRoute(){releaseMouse();route.complete=true;mode='complete';keys={};aim.visible=false;const day=DAYS[dayIndex],finished=dayIndex,bonus=Math.max(0,day.par-Math.floor(route.elapsed)),clean=route.crashes===0?100:0;route.score+=clean;route.score+=bonus;saveResult(progress,finished,route.score);const best=progress.best[finished];if(dayIndex+1<DAYS.length)dayIndex++;$('overlay').hidden=false;$('overlay').querySelector('.eyebrow').textContent=`DAY ${finished+1} · ${day.title.toUpperCase()} · COMPLETE`;$('overlay').querySelector('h1').innerHTML='Signed.<br><em>Delivered.</em>';$('introtext').textContent=`${route.stops.length} deliveries · ${route.score} points · ${Math.round(route.elapsed)} seconds. Accuracy ${Math.round(route.stops.length/route.drops*100)}%. Time bonus +${bonus}.${landing?` ${landing.grade.label[0]+landing.grade.label.slice(1).toLowerCase()} +${landing.grade.bonus}.`:''} ${extras.summary()?' '+extras.summary():''} ${route.crashes?`Crashes ${route.crashes}.`:'Clean flight, no crashes +100.'} Day best ${best}.${dayIndex>finished?` Day ${dayIndex+1} unlocked.`:''}`;renderDays();$('pause').textContent='ROUTE COMPLETE';audio.sfx.complete();}
function updateDelivery(dt){
 route.elapsed+=dt;
 if((route.complete||route.jobDone||route.failed||route.outOfCargo)&&mode==='flight'&&gateGroup.visible){const c=gateCrossing(prevNormal,state.normal,state.altitude,state.forward);if(c){if(c.inside){prevNormal.copy(state.normal);beginLanding(c);return;}notify(c.aligned?'MISSED THE GATE · Circle around and fly through the middle':'LINE UP WITH THE RUNWAY · Fly through the gate heading toward the field');}}
 prevNormal.copy(state.normal);
 if(pendingDrop){pendingDrop.remaining-=dt;if(pendingDrop.remaining<=0){const crateOut=pendingDrop.crate&&extras.releaseCrate();const p=makeParcel(crateOut?{...state,altitude:Math.max(4,state.altitude-lineLen)}:state,crateOut?crateOpts():chuteOpts());if(crateOut)p.kind='crate';p.wind=extras.wind;p.windTime=route.elapsed;p.condition=pendingDrop.condition;Object.assign(p,parcelModel());if(crateOut){p.mesh.scale.setScalar(1.6);lineTarget=0;}p.mesh.position.copy(p.position);packages.push(p);pendingDrop=null;audio.sfx.drop();notify(p.kind==='crate'?'CRATE AWAY · Parachute opens in 1 second':'PARCEL AWAY · Parachute opens in 1 second');}}
 for(let i=fragments.length-1;i>=0;i--){const f=fragments[i];f.life-=dt;f.velocity.addScaledVector(f.mesh.position.clone().normalize(),-12*dt);f.mesh.position.addScaledVector(f.velocity,dt);if(f.mesh.position.length()<RADIUS+2.7){f.mesh.position.setLength(RADIUS+2.7);f.velocity.multiplyScalar(.25);}f.mesh.rotation.x+=dt*4;f.mesh.rotation.z+=dt*3;f.mesh.scale.setScalar(Math.min(1,f.life*2));if(f.life<=0){scene.remove(f.mesh);f.mesh.geometry.dispose();fragments.splice(i,1);}}
 dropCooldown=Math.max(0,dropCooldown-dt);deliveryElapsed+=dt;
 if(state.stunt)route.condition=Math.max(0,route.condition-dt*1.5);
 const pos=state.normal.clone().multiplyScalar(RADIUS+state.altitude);
 if(depot.visible&&(route.parcels<12||state.fuel<95)&&pos.distanceTo(depot.position)<8){route.parcels=12;route.condition=100;state.fuel=100;lowFuelStage=0;audio.sfx.refill();notify('DEPOT · 12 FRESH PARCELS AND A FULL TANK');}
 for(let i=packages.length-1;i>=0;i--){const p=packages[i];let hit=false;for(let t=0;t<dt;t+=1/120){if(stepParcel(p,Math.min(1/120,dt-t))){hit=true;break;}}p.mesh.position.copy(p.position);p.mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),p.position.clone().normalize());p.canopy.visible=p.inflation>0;p.canopy.scale.set(Math.max(.04,p.inflation),.6+.4*p.inflation,Math.max(.04,p.inflation));p.canopy.rotation.z=Math.sin(p.age*3)*.07*p.inflation;if(p.inflation>0&&!p.chuted){p.chuted=true;audio.sfx.chute();}
  if(hit||p.age>50){const saved=route.condition;route.condition=p.condition;const result=hit?resolveDelivery(route,p.position,p):null;route.condition=saved;disposeParcel(p);packages.splice(i,1);if(hit&&p.broken){audio.sfx.smash();smash(p);if(p.kind==='crate'&&job)crateLost(p,true);continue;}if(result){const stop=route.stops[result.id];if(job){const pay=objectivePay(job,{accuracy:result.accuracy,condition:p.condition,onTime:result.onTime});route.earned+=pay;route.done++;result.points=pay;}celebrations.start(destinations[result.id].g,p.position,stop.color);startPip(stop,destinations[result.id].g,p.position);audio.sfx.delivered();showStamp(result,stop);if(result.onTime){audio.sfx.ontime();$('stampdetail').textContent=job?'RIGHT ON TIME · +40% RUSH BONUS':'RIGHT ON TIME · +150 RUSH BONUS';}clearNotice();destinations.forEach((d,j)=>{if(route.stops[j].done){d.color.color.set('#61dca4');d.sign.visible=false;}});if(route.complete){if(extras.mailLeft){notify(`ALL PARCELS DELIVERED · SNAG ${extras.mailLeft} MORE MAILBAG${extras.mailLeft>1?'S':''}${runMode?' TO FINISH THE DAY':' BEFORE HEADING HOME'}`);noticeUntil=performance.now()+6000;}else if(runMode)queueNextDay();else startHomeward();break;}}else{if(hit){audio.sfx.thud();audio.sfx.missed();if(floorAt(p.position.clone().normalize())===WATER_FLOOR)graphics.splash(p.position);}notify('MISSED · Try less throttle and release before the pad.');if(p.kind==='crate'&&job)crateLost(p,false);}}
 }
 if(deliveryElapsed>.08){deliveryElapsed=0;const carryingCrate=extras.carrying,dropFrom=carryingCrate?{...state,altitude:Math.max(4,state.altitude-lineLen)}:state;const prediction=state.stunt?null:predictDrop(dropFrom,extras.wind,route.elapsed,carryingCrate?crateOpts():chuteOpts());const landing=prediction?.position;const groundLift=groundHeight(state.normal)-GROUND,minimum=Math.ceil((carryingCrate?Math.ceil(lineLen+5):safeDropAltitude(state,chuteOpts()))+groundLift);const tooLow=state.altitude<minimum,safe=!tooLow&&!prediction?.broken;$('dropalt').textContent=safe?`SAFE DROP · MIN ${minimum*10}m`:tooLow?`TOO LOW · CLIMB TO ${minimum*10}m`:`DIVING TOO STEEPLY · LEVEL OUT`;$('dropalt').classList.toggle('unsafe',!safe);if(route.complete&&!job){const kt=Math.round(state.speed*3),slow=kt<=51;$('dropalt').textContent=slow?`READY TO LAND · ${kt} KNOTS · NICE AND SLOW`:`SLOW DOWN TO LAND · ${kt} KNOTS · AIM FOR 51 OR LESS`;$('dropalt').classList.toggle('unsafe',!slow);}$('altfill').style.width=Math.min(100,state.altitude/90*100)+'%';$('altmark').style.left=Math.min(98,minimum/90*100)+'%';$('drop').textContent=pendingDrop?`RELEASING ${Math.max(0,pendingDrop.remaining).toFixed(1)}s`:'DROP';extras.setLead(landing&&!route.complete?prediction.time:null);const onTarget=!!landing&&!prediction.broken&&!!padAt(route,landing,route.elapsed+prediction.time,extras.carrying?'crate':'parcel');aim.material.color.set(prediction?.broken?'#ff6262':onTarget?'#5fe39a':'#ffda6a');aim.material.emissive.set(prediction?.broken?'#c02a2a':onTarget?'#1fae5c':'#ffb52c');aim.scale.setScalar(onTarget?1.35:1);aim.visible=!!landing&&!route.complete;if(landing){aim.position.copy(landing);aim.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),landing.clone().normalize());}
  let next=null,nav=null;if(job)next=careerNext();else{const remaining=route.stops.filter(s=>!s.done);next=remaining.sort((a,b)=>state.normal.distanceTo(a.normal)-state.normal.distanceTo(b.normal))[0];nav=extras.navTarget(state);if(nav)next=nav;else if(route.complete&&runMode){$('nextstop').textContent='DAY COMPLETE · NEW MANIFEST AT DAWN';$('bearing').textContent='';return;}else if(route.complete)next={name:'Kestrel Field · fly through the gold gate to land',normal:gateNormal};}if(!next)return;$('routehint').textContent=next.motion?'Moving boat: drop when the gold ring sits on the green DROP HERE ring ahead of it':'Space: release · 1s free fall · parachute opens';
  if(depot.visible&&route.parcels===0&&!route.complete&&!nav?.urgent){next={name:'Blue depot · refill',normal:depot.position.clone().normalize()};}
  if(next){const toward=next.normal.clone().addScaledVector(state.normal,-next.normal.dot(state.normal)).normalize();const side=new T.Vector3().crossVectors(state.forward,state.normal);const angle=Math.atan2(toward.dot(side),toward.dot(state.forward))*180/Math.PI;const distance=Math.acos(Math.max(-1,Math.min(1,state.normal.dot(next.normal))))*RADIUS;$('nextstop').textContent=next.goods?`${next.name} · ${next.goods}`:next.name;{const d=document.querySelector('.dispatch');d.classList.toggle('far',distance>40&&!pendingDrop);d.classList.toggle('boat',!!next.motion);}$('bearing').textContent=(Math.abs(angle)<12?'AHEAD':(angle>0?'RIGHT ':'LEFT ')+Math.round(Math.abs(angle))+'°')+' · '+Math.round(distance*10)+'m';}
  {let st=extras.status(state);if(job&&!route.jobDone)st+=` · ${CARGO[job.cargo].name.toUpperCase()}${job.cargo==='fragile'?' · FLY SMOOTHLY':cargoTurn?' · LOAD SHIFTING':''}`;if(shortcuts.boost)st+=' · SHORTCUT TAILWIND';const ts=threats.status;if(ts.inbound)st=`<em class="hot">MISSILE INBOUND${ts.inbound>1?' ×'+ts.inbound:''} · ${Math.round(ts.nearest*10)}m · ${ts.nearest<=DODGE_FAR&&ts.nearest>=DODGE_NEAR?'ROLL NOW (Q/E)!':`ROLL (Q/E) AT ${DODGE_FAR*10}m`}${threats.flares?' OR C FOR FLARES':''}</em>`+(st?' · '+st:'');else if(ts.locking>0)st=`<em class="hot">RADAR LOCK ${Math.round(ts.locking*100)}% · DIVE BELOW ${RADAR_FLOOR*10}m</em>`+(st?' · '+st:'');if(threats.armed)st+=partState(career,'flares').unlocked?` · FLARES ${threats.flares} (C)`:' · NO FLARES';if(extras.hasMail)st+=` · HOOK LINE ${Math.round(lineLen*10)}m`;$('challenge').innerHTML=st;$('challenge').hidden=!st;}$('cargo').textContent=job?`${extras.carrying?'CRATE ON HOOK':job.type==='crate'||job.type==='mail'?'HOOK JOB':route.parcels+' PARCELS'} · CONDITION ${Math.round(route.condition)}% · EARNED ${money(route.earned)}`:`${route.parcels} PARCELS · CONDITION ${Math.round(route.condition)}% · SCORE ${route.score}`;$('laptext').textContent=job?`${job.typeLabel} · ${TIERS[job.tier].name} · PAYS ${money(job.pay)}`:runMode?`DAY ${run.day} · ${clockText(route.elapsed,run.plan.dayLength)} · ${fmtTime(run.plan.dayLength-route.elapsed)} OF DAYLIGHT`:`${Math.round(route.elapsed)}s · ${route.drops} drops`;
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
 document.body.classList.remove('cinematic');$('cinema').hidden=true;mode='flight';flashHints();keys={};last=performance.now();notify(runMode?`DAY ${run.day} · ${curDay.brief.toUpperCase()} · FINISH BEFORE DARK · NO LANDINGS, SO WATCH YOUR FUEL`:`DAY ${dayIndex+1} · ${DAYS[dayIndex].brief}`);noticeUntil=performance.now()+6000;}
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

// ── Career (v0.70): hangar job board, rollout, flying the job, landing, payout ───────────────
function careerPlan(){if(job)return jobRoute(job);if(LEGACY_MODES){curDay=currentDay();return curDay;}return {stops:[],features:NO_FEATURES};}
const titleCase=t=>t.toLowerCase().replace(/(^|\s)\S/g,c=>c.toUpperCase());
function careerHud(){devRefill();rankHud();$('cash').textContent=money(career.cash);$('jobsdone').textContent=career.jobsDone;const b=loadBestCareer();$('bestcareer').textContent=b?money(b.earned):'—';}
function renderBoard(){board=jobBoard(career.boardSeed);selectedJob=Math.max(0,Math.min(selectedJob,board.length-1));const list=$('jobs');list.innerHTML='';
 board.forEach((j,i)=>{const t=TIERS[j.tier],b=document.createElement('button');b.className='job'+(i===selectedJob?' selected':'');b.setAttribute('role','option');b.setAttribute('aria-selected',String(i===selectedJob));
  b.style.setProperty('--tilt',`${((i*37)%5-2)*.45}deg`);b.style.setProperty('--tc',t.color);
  const need=jobNeeds(j),fuelPct=fuelNeed(j);b.innerHTML=`<span class="type">${JOB_TYPES[j.type].icon} ${j.typeLabel}${j.islands.length>1?` · ${j.islands.length} ISLANDS`:''}</span><span class="where">${titleCase(j.island)}</span><span class="pay">${money(j.pay)}</span><span class="meta"><span class="tier">${t.name}</span>${j.sams.length?`<span class="sam">⚠ ${j.sams.length} SAM${j.flak.length?` + ${j.flak.length} FLAK`:''}</span>`:''}${need?`<span class="need">🔒 ${need}</span>`:''}${fuelPct>95?`<span class="sam">⛽ ${fuelPct}% FUEL</span>`:''}${j.title} · ${(j.dist/100).toFixed(1)} km</span>`;if(need)b.classList.add('needs');
  b.onclick=()=>{selectedJob=i;renderBoard();};b.ondblclick=()=>{selectedJob=i;takeJob();};list.appendChild(b);});
 const j=board[selectedJob],t=TIERS[j.tier];$('jobinfo').style.setProperty('--tc',t.color);
 const need=jobNeeds(j),fuel=fuelNeed(j);$('jobinfo').innerHTML=`<b>${j.typeLabel} · ${j.islands.map(titleCase).join(' → ')}</b><br>${j.how}<br><b>CARGO:</b> ${CARGO[j.cargo].name} · ${CARGO[j.cargo].hint}<br><b>OPTIONAL SHORTCUT:</b> Teal arch (↗ on map). Solid edges; fly through its center for a 6-second tailwind. Once per job. Fly around to stay safe.<br><b>FUEL:</b> about ${fuel}% of your tank${fuel>95?' · <span class="risk" style="--tc:#ff8a7a">you may not make it back: upgrade the fuel tank or fly very efficiently</span>':fuel>70?' · tight, so go easy on the boost':''}${j.sams.length?`<br><b>AIR DEFENCES:</b> ${j.sams.length} missile site${j.sams.length>1?'s':''}${j.flak.length?` and ${j.flak.length} flak gun${j.flak.length>1?'s':''}`:''}. Fly below ${RADAR_FLOOR*10} m to hide from radar, barrel roll (Q/E) when a missile is ${DODGE_FAR*10} m out${partState(career,'flares').unlocked?`, or press C for flares (${perf.flares} per flight)`:' (a flare dispenser from the Plane Shop helps a lot)'}. A missile hit is a crash.`:''}<br><span class="risk">${t.name}: ${t.risk}</span>${need?`<br><span class="risk" style="--tc:#ff8a7a">🔒 ${need}: buy it in the Plane Shop.</span>`:''}`;$('takejob').disabled=!!need;}
function showLedger(d){$('board').hidden=true;$('ledger').hidden=false;$('ledgertitle').textContent=d.title;$('ledgerhead').textContent=d.head;
 $('ledgerlines').innerHTML=d.lines.map(l=>`<div><span>${l.label}</span><b class="${l.amount<0?'neg':'pos'}">${money(l.amount)}</b></div>`).join('')+`<div class="total"><span>${d.totalLabel}</span><span>${money(d.total)}</span></div>`+(d.note?`<p>${d.note}</p>`:'');
 $('ledgerok').innerHTML=d.over?'START A NEW CAREER <span>↗</span>':'BACK TO THE BOARD <span>↗</span>';
 $('ledgerok').onclick=()=>{if(d.over){career=saveCareer(newCareer());if(HERE.id!=='kestrel'){setWorld('kestrel');location.reload();return;}perf=stats(career);state.perf=perf;planeLook();}$('ledger').hidden=true;$('board').hidden=false;careerHud();renderBoard();$('takejob').focus();};}
// Park the plane in the hangar and show the board (or a ledger first).
function enterHangar(ledger=null){job=null;reset();mode='hangar';releaseMouse();keys={};document.body.classList.remove('playing','pullup');document.body.classList.add('inhangar');
 $('overlay').hidden=true;$('hangarui').hidden=false;applyRunwayPose(state,rolloutPose(0));state.speed=0;state.fuel=100;field.setDoors(0);gateGroup.visible=false;aim.visible=false;
 visual.rotation.set(0,0,0);field.hangarView(fieldPos,fieldLook,innerWidth>760?'right':'bottom');camera.position.copy(fieldPos);camera.up.copy(state.normal);camera.lookAt(fieldLook);camera.fov=62;camera.updateProjectionMatrix();
 depot.visible=LEGACY_MODES;{const b=document.querySelector('.hgbar .brand div');b.firstChild.nodeValue=IN_DESERT?'DUSTWATER COURIER CO.':'KESTREL COURIER CO.';b.querySelector('small').textContent=`HANGAR · ${HERE.name.toUpperCase()}`;$('boardsub').textContent=IN_DESERT?'Pick a job. Higher, harsher mesas pay more.':'Pick a job. Harder islands pay more.';}careerHud();if(ledger)showLedger(ledger);else{$('ledger').hidden=true;$('board').hidden=false;renderBoard();setTab(hangarTab);}}
function takeJob(){if(mode!=='hangar'||!board[selectedJob]||jobNeeds(board[selectedJob]))return;audio.unlock();job=board[selectedJob];reset();route.parcels=job.parcels+perf.spares;
 $('hangarui').hidden=true;document.body.classList.remove('inhangar');applyRunwayPose(state,rolloutPose(0));state.fuel=100;state.throttle=8/26;$('throttle').value=31;lowFuelStage=0;
 roll.t=0;bingoWarned=false;mode='rollout';$('nextstop').textContent=`${job.typeLabel} · ${titleCase(job.island)}`;$('bearing').textContent='';$('cargo').textContent=`PAYS ${money(job.pay)} · ${TIERS[job.tier].name}`;showPlaying();notify(`${job.typeLabel} · ${job.island} · ${money(job.pay)} · ${TIERS[job.tier].name}${job.tier===3?' · A CRASH OUT THERE ENDS YOUR CAREER':''} · SPACE TO SKIP`);noticeUntil=performance.now()+6500;}
$('takejob').onclick=takeJob;$('reset').innerHTML='↺ CALL OFF FLIGHT';
// Read-only hooks for automated play tests.
window.__sd={get mode(){return mode;},get state(){return state;},get route(){return route;},get job(){return job;},get career(){return career;},roll,keys:()=>keys,extras,get hook(){return hookWorld;},get lineLen(){return lineLen;},finishJob:o=>finishJob(o)};
function updateRollout(dt){roll.t+=dt;const p=rolloutPose(roll.t);applyRunwayPose(state,p);field.setDoors(p.doors);prop.rotation.z+=dt*(roll.t<PHASES.doors?5:p.airborne?65:25+p.speed*3);
 if(roll.t>=ROLLOUT_TIME){endRollout();return false;}
 const pos=state.normal.clone().multiplyScalar(RADIUS+state.altitude);
 if(roll.t<PHASES.doors+.6){field.hangarView(fieldPos,fieldLook);camera.position.copy(fieldPos);camera.up.copy(state.normal);camera.lookAt(fieldLook);return true;}
 // Taxi: watch from the apron, then slide in behind the plane for the takeoff roll.
 const k=smoother(Math.min(1,Math.max(0,(roll.t-(PHASES.taxi-1.4))/2.4)));field.apronView(fieldPos);chaseTarget(target,camTarget);
 camera.position.lerpVectors(fieldPos,target,k);camLook.copy(pos).addScaledVector(state.normal,1).lerp(camTarget,k);camera.up.copy(state.normal);camera.lookAt(camLook);
 camera.fov+=((k<1?66:78)-camera.fov)*(1-Math.exp(-2*dt));camera.updateProjectionMatrix();return true;}
function endRollout(){if(mode!=='rollout')return;applyRunwayPose(state,rolloutPose(ROLLOUT_TIME));state.throttle=8/26;field.setDoors(0);mode='flight';flashHints();keys={};last=performance.now();snapChaseCamera();
 notify(JOB_TYPES[job.type].how.toUpperCase());noticeUntil=performance.now()+6500;}
function jobDone(){return !!job&&route.stops.every(s=>s.done)&&extras.mailLeft===0&&!extras.crateTarget()&&!extras.carrying;}
function careerNext(){const n=state.normal,near=list=>[...list].sort((a,b)=>n.distanceTo(a.normal)-n.distanceTo(b.normal))[0];
 const urgent=extras.navTarget(state);if(urgent&&urgent.urgent)return urgent;
 const crate=extras.crateTarget();if(crate)return crate;
 const open=route.stops.filter(s=>!s.done&&((s.kind||'parcel')!=='crate'||extras.carrying));if(open.length)return near(open);
 const masts=extras.mastTargets();if(masts.length)return near(masts);
 if(!route.jobDone&&!route.failed&&!route.outOfCargo)return null;return {name:route.failed?'Job failed · fly home, land or take the gold ring':'Home field · land on the runway for a bonus, or fly the gold ring',normal:new T.Vector3(0,1,0)};}
function runwayAxis(z){const b=z/(RADIUS+GROUND_ALT);return new T.Vector3(0,-Math.sin(b),Math.cos(b));}
function nearRunway(){if(state.normal.y<.95)return false;const r=toRunway(state.normal);return Math.abs(r.x)<16&&r.z>-RUNWAY_HALF-25&&r.z<RUNWAY_HALF+90;}
// Every frame in flight: finish the job, show the approach readout, and catch a touchdown.
function careerFlight(dt){if(!job)return;
 if(!route.jobDone&&jobDone()){route.jobDone=true;gateGroup.visible=true;audio.sfx.refill();notify('JOB DONE · HEAD HOME · LAND ON THE RUNWAY YOURSELF FOR A CASH BONUS, OR FLY THROUGH THE GOLD RING TO AUTO-LAND');noticeUntil=performance.now()+8000;}
 const r=toRunway(state.normal),show=nearRunway()&&state.altitude<34&&(route.jobDone||route.failed||route.outOfCargo||route.elapsed>25);
 // Out of parcels with stops still open (and nothing still falling): head home, you're paid for what you delivered.
 if(!route.jobDone&&!route.failed&&!route.outOfCargo&&!extras.carrying&&!pendingDrop&&!packages.length&&route.parcels===0&&route.stops.some(s=>!s.done&&(s.kind||'parcel')==='parcel')){route.outOfCargo=true;gateGroup.visible=true;notify('OUT OF PARCELS · HEAD HOME · YOU GET PAID FOR WHAT YOU DELIVERED');noticeUntil=performance.now()+7000;}$('approach').hidden=!show;
 if(show){const sink=-verticalSpeed(state),along=Math.abs(state.forward.dot(runwayAxis(r.z))),cls=(v,a,b)=>v<=a?'ok':v<=b?'':'bad';
  $('approach').innerHTML=`<span>SPEED <b class="${cls(state.speed,18,perf.landSpeed)}">${Math.round(state.speed*3)}</b> KT</span><span>SINK <b class="${cls(sink,.9,perf.sink)}">${Math.max(0,Math.round(sink*10))}</b> M/S</span><span>LINE-UP <b class="${along>.97?'ok':along>.8?'':'bad'}">${along>.97?'GOOD':along>.8?'FAIR':'OFF'}</b></span><span>${onRunway(r.x,r.z)?'<b class="ok">OVER RUNWAY</b>':'TO LAND: SLOW DOWN, EASE THE NOSE DOWN'}</span>`;}
 if(onRunway(r.x,r.z)&&state.altitude<=GROUND_ALT+.02)touchdownNow(r);}
function touchdownNow(r){const along=state.forward.dot(runwayAxis(r.z));
 const g=gradeTouchdown({sink:-verticalSpeed(state),speed:state.speed,bank:state.bank,x:r.x,along:Math.abs(along)},{sink:perf.sink,landSpeed:perf.landSpeed});
 if(!g.ok){beginCrash(`the runway · ${g.why}`);return;}
 touch={grade:g,h:along>0?Math.PI:0,stopped:0};mode='touchdown';keys={};releaseMouse();state.altitude=GROUND_ALT;state.stunt=null;lineTarget=0;$('approach').hidden=true;
 audio.sfx.touchdown(g.stars===1);notify(`${g.label} ${'★'.repeat(g.stars)} · +${Math.round(g.bonus*100)}% LANDING BONUS`);noticeUntil=performance.now()+5000;}
function updateTouchdown(dt){state.speed=Math.max(0,state.speed-perf.brake*dt);state.pitch+=(.1-state.pitch)*Math.min(1,dt*4);state.bank*=Math.exp(-6*dt);state.altitude=GROUND_ALT;
 const r=toRunway(state.normal),want=runwayForward(r.x,r.z,touch.h,state.normal,new T.Vector3());
 // Steer gently back toward the centerline while braking.
 const side=new T.Vector3().crossVectors(want,state.normal);const toCenter=Math.max(-.25,Math.min(.25,r.x*.1));const xdir=runwayForward(r.x,r.z,Math.PI/2,state.normal,new T.Vector3());want.addScaledVector(xdir,-toCenter);
 state.forward.lerp(want.normalize(),1-Math.exp(-3*dt)).addScaledVector(state.normal,-state.forward.dot(state.normal)).normalize();
 const travel=state.speed*dt;if(travel>0){const axis=new T.Vector3().crossVectors(state.normal,state.forward).normalize(),q=new T.Quaternion().setFromAxisAngle(axis,travel/(RADIUS+state.altitude));state.normal.applyQuaternion(q).normalize();state.forward.applyQuaternion(q);}
 prop.rotation.z+=dt*(8+state.speed*3);
 const rr=toRunway(state.normal);if(Math.abs(rr.z)>RUNWAY_HALF+1.5&&state.speed>2){beginCrash('the end of the runway · ran out of runway');return true;}
 if(state.speed===0){touch.stopped+=dt;if(touch.stopped>1.1&&mode==='touchdown')finishJob({landing:touch.grade});}
 return false;}
// A crate missed its pad (smashed=false) or broke (smashed=true). CALM and BREEZY: try again, for a cut of the pay.
// ROUGH and DEADLY: one shot, the job fails and you head home.
function crateLost(p,smashed){if(TIERS[job.tier].crash==='repair'){route.condition=Math.max(40,route.condition-(smashed?30:15));
  if(smashed){extras.crateRestock();notify('CRATE SMASHED · THE CREW STACKED A NEW ONE ON THE TOWER · −30% CARGO CONDITION · GO HOOK IT');}
  else{extras.crateDown(p.position);notify('MISSED THE PAD · THE CRATE IS DOWN WHERE IT LANDED · HOOK IT AGAIN · −15% CARGO CONDITION');}
  noticeUntil=performance.now()+7000;return;}
 route.failed=true;gateGroup.visible=true;audio.sfx.late?.();notify(`CRATE ${smashed?'SMASHED':'LOST'} · ON ${TIERS[job.tier].name} ISLANDS YOU GET ONE SHOT · JOB FAILED · HEAD HOME`);noticeUntil=performance.now()+8000;}
function fadeTo(fn){mode='tow';document.body.classList.add('fading');setTimeout(()=>{fn();setTimeout(()=>document.body.classList.remove('fading'),120);},700);}
function finishJob({landing:land=null,failed=false,abandoned=false}={}){if(!job||mode==='tow')return;failed=failed||!!route.failed;const j=job,earned=failed?0:route.earned,s=settle(j,{earned,done:route.done,crashes:route.crashes,landing:land,failed});
 career.cash=Math.max(0,career.cash+s.total);career.flights++;const complete=!failed&&route.done>=j.units;if(complete)career.jobsDone++;career.earned+=Math.max(0,s.total);career.boardSeed=Math.floor(Math.random()*1e9);saveCareer(career);saveBestCareer(career);
 if(complete)audio.sfx.complete();
 const head=abandoned?'Flight called off':failed?'Job failed':complete?'Job complete':route.done?'Partly done':'Nothing delivered';
 const note=route.failed&&!abandoned?`The crate was lost. On ${TIERS[j.tier].name} islands you only get one shot, so the client paid nothing.`:abandoned?'You called it off. The tow crew brought the plane back to the hangar.':failed?'You went down in rough country. The tow crew hauled what was left of the plane home, and the client paid nothing.':land&&earned>0?'You landed it yourself, and the client tipped well.':land?'Nice landing, but there was nothing to get paid for this time.':'Auto-landed through the gold ring. Land it yourself next time for a cash bonus.';
 fadeTo(()=>enterHangar({title:`${j.typeLabel} · ${j.island}`,head,lines:s.lines,total:s.total,totalLabel:'Net for this flight',note}));}
function careerOver(what){if(mode==='tow')return;const c=career;c.alive=false;c.flights++;saveCareer(c);const best=saveBestCareer(c);
 fadeTo(()=>{job=null;enterHangar({title:'CAREER OVER',head:'Lost on a deadly job',over:true,lines:[{label:'Cash in the bank',amount:c.cash},{label:'Earned over the whole career',amount:c.earned}],total:c.earned,totalLabel:best?'New best career!':'Career earnings',
  note:`You went down at ${what} on a DEADLY island. ${c.jobsDone} job${c.jobsDone===1?'':'s'} done in ${c.flights} flight${c.flights===1?'':'s'}. The hangar goes to a new pilot.`});});}
// ── Plane shop, ranks and worlds (v0.74) ─────────────────────────────────────────────────
let hangarTab='jobs';
function setTab(t){hangarTab=t;for(const k of ['jobs','shop','worlds']){$('tab'+k).hidden=k!==t;$('tab'+k+'btn').setAttribute('aria-selected',String(k===t));}if(t==='shop')renderShop();if(t==='worlds')renderWorlds();}
$('tabjobsbtn').onclick=()=>setTab('jobs');$('tabshopbtn').onclick=()=>setTab('shop');$('tabworldsbtn').onclick=()=>setTab('worlds');
function rankHud(){const r=rankOf(career),n=nextRank(career);$('rank').textContent=RANKS[r].name;
 if(!n){$('rankfill').style.width='100%';$('ranknext').textContent='Top rank';return;}
 const cur=RANKS[r],u=Math.min((career.jobsDone-cur.jobs)/Math.max(1,n.jobs-cur.jobs),(career.earned-cur.earned)/Math.max(1,n.earned-cur.earned));
 $('rankfill').style.width=Math.max(0,Math.min(100,u*100))+'%';$('ranknext').textContent=`Next: ${n.name} · ${Math.max(0,n.jobs-career.jobsDone)} jobs, ${money(Math.max(0,n.earned-career.earned))} more earned`;}
function renderShop(){const box=$('parts');box.innerHTML='';const s=stats(career);
 for(const p of PARTS){const st=partState(career,p.id),a=nextAction(career,p.id),el=document.createElement('div');el.className='part'+(st.unlocked?'':' locked');
  const after=a.kind==='upgrade'?statAfter(career,p.id,st.level+1):null;
  const stat=p.show.map(([k,label,f])=>after?`${label}: <s>${f(s[k])}</s> → ${f(after[k])}`:`${label}: ${f(s[k])}`).join(' · ');
  const btn=a.kind==='max'?'MAXED':a.kind==='rank'?`LOCKED<small>${RANKS[p.rank].name}</small>`:a.kind==='unlock'?`UNLOCK<small>${money(a.cost)}</small>`:`LEVEL ${st.level+1}<small>${money(a.cost)}</small>`;
  el.innerHTML=`<span class="pi">${p.icon}</span><h3>${p.name} <span class="pips"><i class="key ${st.unlocked?'on':''}" title="Unlock">${st.unlocked?'🔓':'🔒'}</i>${Array.from({length:MAX_LEVEL},(_,i)=>`<i class="${i<st.level?'on':''}"></i>`).join('')}</span></h3><button ${a.ok?'class="buyable"':'disabled'} title="${a.why||''}">${btn}</button><p>${p.blurb}${!st.unlocked&&a.kind==='rank'?` Unlocks at ${RANKS[p.rank].name} rank for ${money(p.unlock)}.`:''}</p>${st.unlocked?`<span class="stat">${stat}</span>`:''}`;
  el.querySelector('button').onclick=()=>{if(fxPart)return;const kind=a.kind;if(buy(career,p.id)){saveCareer(career);perf=stats(career);state.perf=perf;workshopFx(p.id,kind);careerHud();renderShop();}};box.appendChild(el);}}
function worldReady(w){const r=rankOf(career);const checks=[{ok:r>=w.rank,text:`${RANKS[w.rank].name} rank or higher`}];
 for(const [id,lv] of Object.entries(w.req))checks.push({ok:partState(career,id).level>=lv,text:`${PART[id].name} level ${lv}`});
 checks.push({ok:career.cash>=w.fee,text:`${money(w.fee)} ferry license`});return checks;}
function renderWorlds(){const box=$('worlds');box.innerHTML='';const owned=career.worlds||['kestrel'];
 for(const id of WORLD_ORDER){const w=WORLDS[id],have=owned.includes(id),here=WORLD.id===id,el=document.createElement('div');el.className='world'+(here?' here':'');
  const checks=have?[]:worldReady(w),ready=checks.every(c=>c.ok);
  el.innerHTML=`<div class="art" style="background:${w.art}">${w.name.toUpperCase()}</div><div class="body"><span>${w.tagline}</span>${have?'':`<ul>${checks.map(c=>`<li class="${c.ok?'ok':'no'}">${c.ok?'✓':'✗'} ${c.text}</li>`).join('')}</ul>`}<button ${here?'disabled':have||ready?'class="buyable"':'disabled'}>${here?'YOU ARE HERE':have?`FERRY TO ${w.name.toUpperCase()}`:`BUY FERRY LICENSE · ${money(w.fee)}`}</button></div>`;
  el.querySelector('button').onclick=()=>{if(here)return;if(!have){if(!ready)return;career.cash-=w.fee;career.spent=(career.spent||0)+w.fee;career.worlds=[...owned,id];saveCareer(career);}ferryTo(w);};box.appendChild(el);}}
function ferryTo(w){const el=document.createElement('div');el.id='ferry';el.innerHTML=`<small>FERRY FLIGHT</small><h1>${w.name.toUpperCase()}</h1><p>${w.tagline}</p><div class="trail"><i></i></div>`;$('flight').appendChild(el);audio.unlock();audio.sfx.complete();
 setWorld(w.id);setTimeout(()=>location.reload(),3800);}

// Upgrades show on the plane (v0.76): every level of every part adds or changes something you can
// see. Each part builds into its own group, so a purchase can animate just that part while the
// workshop sounds play (sparks fly and the new pieces pop into place).
const upgradeLook=new T.Group();visual.add(upgradeLook);const lookGroups={};
const LM={chrome:mat('#d9dfe2',{metalness:.85,roughness:.22}),gold:mat('#f2c14e',{metalness:.7,roughness:.3,emissive:'#7a5410',emissiveIntensity:.25}),red:palette.red,dark:palette.dark,
 wing:palette.gold,white:mat('#f4efe2'),tank:mat('#c94f3d',{metalness:.3,roughness:.45}),canvas:mat('#7d8a5c'),crate:mat('#b88a52'),strap:mat('#3b4a50'),rubber:mat('#1e2427'),blue:mat('#2f6f8c',{metalness:.3})};
const LOOKS={
 engine(g,L){const ring=mesh(new T.CylinderGeometry(.5+L*.02,.58+L*.02,.36+L*.03,16,1,true),L>=5?LM.gold:LM.red,g);ring.rotation.x=Math.PI/2;ring.position.z=-1.6;
  if(L>=2)for(const s of [-1,1])for(let k=0;k<3+(L>=4?1:0);k++){const e=mesh(new T.CylinderGeometry(.05,.07,.42,8),LM.chrome,g);e.rotation.z=s*1.1;e.position.set(s*.6,.12-k*.12,-1.35+k*.2);}
  if(L>=3)for(let k=0;k<9;k++){const a=k/9*Math.PI*2,c=box(g,.16,.2,.22,Math.cos(a)*.56,Math.sin(a)*.56,-1.72,LM.chrome);c.rotation.z=a;}
  if(L>=4){const sp=mesh(new T.ConeGeometry(.22,.5,14),L>=5?LM.gold:LM.chrome,prop);sp.rotation.x=-Math.PI/2;sp.position.z=-.25;g.userData.extra=(g.userData.extra||[]).concat(sp);}
  if(L>=5){const scoop=box(g,.32,.2,.7,0,.55,-1.3,LM.dark);scoop.rotation.x=-.12;}},
 fuel(g,L){const belly=mesh(new T.CapsuleGeometry(.2+Math.min(L,3)*.04,.8+Math.min(L,3)*.18,4,10),LM.tank,g);belly.rotation.x=Math.PI/2;belly.position.set(0,-.8,-.1);
  if(L>=3)for(const s of [-1,1]){const t=mesh(new T.CapsuleGeometry(.16+(L-3)*.04,.7+(L-3)*.2,4,10),LM.tank,g);t.rotation.x=Math.PI/2;t.position.set(s*2.2,-.72,-.15);box(g,.06,.22,.3,s*2.2,-.55,-.15,LM.dark);}
  if(L>=5)for(const z of [-.45,.25]){const b=mesh(new T.TorusGeometry(.33,.04,6,16),LM.gold,g);b.position.set(0,-.8,z);}
  if(L>=2){const cap=mesh(new T.CylinderGeometry(.08,.08,.1,8),LM.chrome,g);cap.position.set(0,.6,-.9);}},
 cargo(g,L){box(g,.8+Math.min(L,3)*.06,.32,.8+L*.12,0,-.64,.95,LM.crate);
  if(L>=2)box(g,.84+Math.min(L,3)*.06,.06,.84+L*.12,0,-.47,.95,LM.strap);
  if(L>=3){box(g,.9,.05,1,0,.62,1.05,LM.dark);for(let k=0;k<L-2;k++)box(g,.42,.36,.42,(k%2?.22:-.22),.84,.75+Math.floor(k/2)*.45,LM.crate);}
  if(L>=5)for(const s of [-1,1])box(g,.26,.45,.9,s*.62,-.15,.85,LM.canvas);},
 wings(g,L){const ext=.25+L*.18;for(const s of [-1,1]){box(g,ext,.15,1.25,s*(3.9+ext/2),1,-.3,LM.wing);box(g,ext*.8,.13,1.12,s*(3.55+ext*.4),-.45,-.15,LM.wing);box(g,.12,.17,1.27,s*(3.9+ext),1,-.3,L>=5?LM.gold:LM.red);
  if(L>=3){const w=box(g,.1,.5+(L-3)*.15,.8,s*(3.95+ext),1.25+(L-3)*.07,-.25,LM.wing);w.rotation.z=-s*.25;}
  if(L>=4)box(g,3.4,.05,.12,s*2.2,1.08,-.98,LM.white);
  if(L>=5)for(let k=0;k<4;k++)box(g,.3,.03,.3,s*(1.4+k*.6),1.09,-.15+(k%2)*.3,LM.dark);}},
 ailerons(g,L){for(const s of [-1,1]){box(g,.9+L*.25,.08,.32,s*(2.9-L*.05),1,.42,LM.red);if(L>=2)box(g,.8+L*.2,.07,.28,s*(2.7-L*.05),-.45,.5,LM.red);
  if(L>=5){const w=mesh(new T.IcosahedronGeometry(.09,0),LM.chrome,g);w.position.set(s*(3.4),1.02,.62);}}
  if(L>=3){const f=box(g,.12,.55+(L-3)*.2,.7,0,1.25+(L-3)*.1,1.95,LM.red);f.rotation.x=-.25;}
  if(L>=4){const v=box(g,.1,.45,.6,0,-.35,1.7,LM.red);v.rotation.x=.3;}},
 chutes(g,L){const n=Math.min(2,Math.ceil(L/2));for(let k=0;k<n;k++){const c=mesh(new T.CylinderGeometry(.17+(L>=4?.04:0),.17+(L>=4?.04:0),.42,12),L>=5?LM.gold:LM.blue,g);c.position.set(n===1?0:(k?.2:-.2),.6,1.0);
   const cap=mesh(new T.SphereGeometry(.17+(L>=4?.04:0),12,6,0,Math.PI*2,0,Math.PI/2),LM.white,g);cap.position.set(c.position.x,.81,1.0);}
  if(L>=3){const d=box(g,.3,.2,.35,0,.35,2.25,LM.canvas);void d;}},
 winch(g,L){const d=mesh(new T.CylinderGeometry(.2+L*.03,.2+L*.03,.45+L*.05,12),LM.dark,g);d.rotation.z=Math.PI/2;d.position.set(0,-.62,.45);
  const coil=mesh(new T.TorusGeometry(.2+L*.03,.04,6,16),L>=2?LM.chrome:LM.dark,g);coil.rotation.y=Math.PI/2;coil.position.set(0,-.62,.45);
  if(L>=3){const arm=box(g,.08,.08,.9,0,-.85,.85,LM.dark);arm.rotation.x=-.3;}
  if(L>=4){const p=mesh(new T.TorusGeometry(.12,.04,6,12),LM.chrome,g);p.rotation.y=Math.PI/2;p.position.set(0,-1.0,1.25);}
  if(L>=5){const h=mesh(new T.TorusGeometry(.16,.05,6,12,Math.PI*1.4),LM.gold,g);h.position.set(0,-1.2,1.25);}},
 flares(g,L){for(const sx of [-1,1]){const pod=box(g,.22,.3,.5+L*.08,sx*.6,-.25,.65,L>=5?LM.gold:LM.dark);void pod;for(let k=0;k<Math.min(3,1+Math.floor(L/2));k++){const t=mesh(new T.CylinderGeometry(.05,.05,.1,6),LM.red,g);t.rotation.z=Math.PI/2;t.position.set(sx*.72,-.25+(k-1)*.09,.5+L*.03);}}
  if(L>=3){const tail=box(g,.2,.18,.4,0,-.05,1.9,LM.dark);void tail;}},
 gear(g,L){for(const s of [-1,1]){const t=mesh(new T.TorusGeometry(.33+L*.025,.07+L*.012,8,18),LM.rubber,g);t.rotation.y=Math.PI/2;t.position.set(s*.65,-1,-.45);
  if(L>=2){const sp=mesh(new T.CapsuleGeometry(.18,.5,4,10),LM.wing,g);sp.rotation.x=Math.PI/2;sp.position.set(s*.65,-.85,-.45);sp.scale.set(1,1.2,1);}
  if(L>=3){const st=box(g,.07,.55,.07,s*.42,-.7,-.2,LM.chrome);st.rotation.z=s*.35;}
  if(L>=5){const hub=mesh(new T.CylinderGeometry(.12,.12,.24,10),LM.gold,g);hub.rotation.z=Math.PI/2;hub.position.set(s*.65,-1,-.45);}}
  if(L>=4){const tw=mesh(new T.CylinderGeometry(.14,.14,.08,10),LM.rubber,g);tw.rotation.z=Math.PI/2;tw.position.set(0,-.25,2.05);box(g,.05,.3,.05,0,-.1,1.95,LM.dark);}}
};
function buildPart(id){const old=lookGroups[id];if(old){for(const x of old.userData.extra||[])x.parent?.remove(x);upgradeLook.remove(old);}
 const st=partState(career,id),g=new T.Group();lookGroups[id]=g;upgradeLook.add(g);if(st.level>0)LOOKS[id]?.(g,st.level);
 g.traverse(o=>{if(o.isMesh)o.castShadow=true;});return g;}
function planeLook(){for(const p of PARTS)buildPart(p.id);}
// Workshop show when a part is bought: sparks at the part, then the new pieces pop into place.
const fxSparks=[],sparkMat=mat('#fff2b0',{emissive:'#ffb52c',emissiveIntensity:1.5});let fxPart=null;
function workshopFx(id,kind){audio.unlock();audio.sfx.workshop(kind);const g=buildPart(id);g.updateMatrixWorld(true);
 const box3=new T.Box3().setFromObject(g),at=box3.isEmpty()?visual.getWorldPosition(new T.Vector3()):box3.getCenter(new T.Vector3());
 fxPart={g,t:0,at,dur:kind==='unlock'?3:2.6,next:0};g.scale.setScalar(.01);}
function updateWorkshop(dt){
 if(fxPart){const f=fxPart;f.t+=dt;f.next-=dt;
  if(f.next<=0&&f.t<f.dur-.4){f.next=.05+Math.random()*.08;for(let k=0;k<7;k++){const s=box(scene,.11,.11,.11,0,0,0,sparkMat);s.position.copy(f.at).add(new T.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).multiplyScalar(.8));fxSparks.push({mesh:s,v:new T.Vector3(Math.random()-.5,Math.random()*.8+.2,Math.random()-.5).multiplyScalar(5),life:.5+Math.random()*.4});}}
  const u=Math.min(1,f.t/f.dur),pop=u<.7?u/.7*.85:.85+.15*Math.sin((u-.7)/.3*Math.PI*1.5)*(1-u)*3+.15*((u-.7)/.3);
  f.g.scale.setScalar(Math.max(.01,Math.min(1.08,pop)));visual.position.y=Math.sin(f.t*38)*.012*(1-u);
  if(f.t>=f.dur){f.g.scale.setScalar(1);visual.position.y=0;fxPart=null;}}
 for(let i=fxSparks.length-1;i>=0;i--){const s=fxSparks[i];s.life-=dt;s.v.addScaledVector(state.normal,-9*dt);s.mesh.position.addScaledVector(s.v,dt);s.mesh.scale.setScalar(Math.max(.01,s.life*2));if(s.life<=0){scene.remove(s.mesh);s.mesh.geometry.dispose();fxSparks.splice(i,1);}}}
planeLook();

// ── DEV tools (v0.78): play-testing helpers in the hangar (bottom-left DEV button) ──────────
$('devbtn').onclick=()=>{$('devpanel').hidden=!$('devpanel').hidden;devLabels();};
function devLabels(){const b=document.querySelector('[data-dev=infinite]');b.textContent=`UNLIMITED CASH: ${career.devInfinite?'ON':'OFF'}`;b.classList.toggle('on',!!career.devInfinite);}
function devRefill(){if(career.devInfinite)career.cash=9999999;}
document.querySelectorAll('[data-dev]').forEach(b=>b.onclick=()=>{const k=b.dataset.dev,c=career;
 if(k==='cash10k')c.cash+=10000;else if(k==='cash100k')c.cash+=100000;else if(k==='cash1m')c.cash+=1000000;
 else if(k==='infinite'){c.devInfinite=!c.devInfinite;if(c.devInfinite)c.cash=Math.max(c.cash,9999999);}
 else if(k==='rankup'){const n=nextRank(c);if(n){c.jobsDone=Math.max(c.jobsDone,n.jobs);c.earned=Math.max(c.earned,n.earned);}}
 else if(k==='rankmax'){const top=RANKS[RANKS.length-1];c.jobsDone=Math.max(c.jobsDone,top.jobs);c.earned=Math.max(c.earned,top.earned);}
 else if(k==='partsmax'){for(const p of PARTS)c.parts[p.id]={unlocked:true,level:MAX_LEVEL};}
 else if(k==='partsreset'){c.parts=newParts();}
 else if(k==='worlds'){c.worlds=[...WORLD_ORDER];}
 else if(k==='newboard'){c.boardSeed=Math.floor(Math.random()*1e9);}
 else if(k==='reset'){if(!confirmReset())return;career=newCareer();if(HERE.id!=='kestrel'){saveCareer(career);setWorld('kestrel');location.reload();return;}}
 saveCareer(career);perf=stats(career);state.perf=perf;planeLook();careerHud();renderBoard();setTab(hangarTab);devLabels();audio.unlock();audio.sfx.tick();});
// Two clicks to reset: the first arms it for 3 seconds (no browser dialogs).
let resetArmed=0;function confirmReset(){const b=document.querySelector('[data-dev=reset]');if(performance.now()<resetArmed){resetArmed=0;b.textContent='RESET CAREER';return true;}
 resetArmed=performance.now()+5000;b.textContent='CLICK AGAIN TO RESET EVERYTHING';setTimeout(()=>{if(performance.now()>=resetArmed)b.textContent='RESET CAREER';},5100);return false;}

// ── Hook gating and air defences (v0.80) ─────────────────────────────────────────────────
function winchOK(){return LEGACY_MODES&&!job||partState(career,'winch').unlocked;}
// What a job needs that the plane doesn't have yet (null if nothing).
function jobNeeds(j){if(!j.hook)return null;if(!partState(career,'winch').unlocked)return 'NEEDS WINCH & HOOK';if(j.weight&&perf.strength<j.weight)return `NEEDS WINCH LEVEL ${j.weight-1} (${CRATE_WEIGHTS[j.weight].toLowerCase()} crate)`;return null;}
function dropFlares(){if(!partState(career,'flares').unlocked){if(threats.armed)notify('NO FLARE DISPENSER · UNLOCK ONE IN THE PLANE SHOP');return;}const r=threats.flare(aircraft.position.clone(),state.forward,state.normal,perf.decoy);if(!r){if(threats.armed)notify('OUT OF FLARES');return;}audio.sfx.flare();notify(r.pulled?`FLARES · ${r.pulled} MISSILE${r.pulled>1?'S':''} DECOYED · ${r.left} LEFT`:`FLARES AWAY · ${r.left} LEFT`);noticeUntil=performance.now()+2200;}
function handleThreat(e){
 if(e.type==='radar'){audio.sfx.radar();if(performance.now()>noticeUntil-1500){notify(`RADAR CONTACT · A MISSILE SITE IS LOCKING ON · DIVE BELOW ${RADAR_FLOOR*10} m OR GET OUT OF RANGE`);noticeUntil=performance.now()+3500;}}
 else if(e.type==='launch'){audio.sfx.launch();notify(`MISSILE LAUNCH! · BARREL ROLL (Q/E) WHEN IT'S ${DODGE_FAR*10} m AWAY${threats.flares?', OR PRESS C FOR FLARES':''}`);noticeUntil=performance.now()+3500;shake=Math.max(shake,.2);}
 else if(e.type==='hit'){audio.sfx.boom(1);shake=1;beginCrash('a missile');}
 else if(e.type==='decoyed'){audio.sfx.boom(.5);notify('THE MISSILE TOOK THE FLARE');noticeUntil=performance.now()+2000;}
 else if(e.type==='missed'){audio.sfx.boom(.4);if(performance.now()>noticeUntil-1500){notify('MISSILE MISSED · KEEP MOVING');noticeUntil=performance.now()+1800;}}
 else if(e.type==='flak'){audio.sfx.flak(e.dist);if(e.close){route.condition=Math.max(30,route.condition-FLAK_DAMAGE);shake=Math.max(shake,.6);notify(`FLAK HIT · CARGO CONDITION −${FLAK_DAMAGE}%`);noticeUntil=performance.now()+1500;}else shake=Math.max(shake,.15);}}
// Warning tones: a slow beep while a radar locks on, a fast one while a missile is in the air.
function threatAlarm(dt){const ts=threats.status;document.body.classList.toggle('missile',mode==='flight'&&ts.inbound>0);if(mode!=='flight')return;lockBeep-=dt;
 if(ts.inbound&&lockBeep<=0){lockBeep=Math.max(.07,Math.min(.3,ts.nearest/120));audio.sfx.missileWarn();}
 else if(!ts.inbound&&ts.locking>0&&lockBeep<=0){lockBeep=.5-ts.locking*.38;audio.sfx.lockBeep(ts.locking);}}

// Fuel planning (v0.82): estimated share of the tank a job needs (route length + 25% for drops and
// manoeuvring, at cruise), and a BINGO FUEL warning once what's left only just gets you home.
function unitsPerPercent(){return 18/fuelBurn(8/26,false,perf);}
function fuelNeed(j){return Math.round(routeLength(j)*1.25/unitsPerPercent()/(j.cargo==='heavy'?.88:1));}
let bingoWarned=false;
function bingoCheck(){if(!job||mode!=='flight'||route.jobDone&&state.normal.y>.97)return;const home=Math.acos(Math.max(-1,Math.min(1,state.normal.y)))*RADIUS,need=home*1.15/unitsPerPercent()+3;
 if(state.fuel>0&&state.fuel<need){if(!bingoWarned){bingoWarned=true;audio.sfx.lowfuel();notify(`BINGO FUEL · ${Math.ceil(state.fuel)}% LEFT, ABOUT ${Math.ceil(need)}% TO GET HOME · TURN FOR HOME NOW`);noticeUntil=performance.now()+6000;}}else if(state.fuel>need+8)bingoWarned=false;}
// ── Title screen and menus (v0.84) ───────────────────────────────────────────────────────
// The game opens on the title card with the little plane flying around the planet behind it.
// From here: Enter the hangar (job board), Plane shop, Worlds, How to play, Settings, Credits.
const SETTINGS_KEY='special-delivery-settings';
let settings={invert:false,sens:100,dev:true};try{settings={...settings,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')};}catch{}
function saveSettings(){try{localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}catch{}applySettings();}
function applySettings(){document.body.classList.toggle('nodev',!settings.dev);$('st-sensv').textContent=settings.sens+'%';}
function showTitle(){job=null;reset();mode='intro';releaseMouse();keys={};document.body.classList.remove('inhangar','playing','pullup','missile');document.body.classList.add('titlescreen');
 $('hangarui').hidden=true;$('titlepanel').hidden=true;$('overlay').hidden=false;state.altitude=SAFE_ALT;state.speed=23;state.throttle=.45;attract.t=0;attract.next=3;camera.fov=70;camera.updateProjectionMatrix();snapChaseCamera();
 $('overlay').querySelector('.eyebrow').textContent='AROUND THE WORLD. RIGHT ON TIME.';$('overlay').querySelector('h1').innerHTML='Small plane.<br><em>Special</em> delivery.';
 $('introtext').innerHTML=`Take courier jobs from the hangar board and fly cargo across ${HERE.name==='Kestrel'?'a little ocean planet':'the red mesas of '+HERE.name}. The harder the island, the bigger the pay, and the bigger the risk.`;
 $('tm-career').textContent=career.flights?`${RANKS[rankOf(career)].name} · ${money(career.cash)} in the bank · ${career.jobsDone} job${career.jobsDone===1?'':'s'} done · ${HERE.name}`:'A new career is waiting in the hangar.';
 $('pause').innerHTML='PAUSE <kbd>P</kbd>';}
function leaveTitle(tab='jobs'){audio.unlock();if(mode!=='intro')return;fadeTo(()=>{clearAttract();document.body.classList.remove('titlescreen');hangarTab=tab;enterHangar();});}
function openPanel(id){audio.unlock();$('titlepanel').hidden=false;for(const k of ['howto','settings','credits'])$('tp-'+k).hidden=k!==id;
 if(id==='settings'){$('st-sfx').checked=audio.sfxOn;$('st-music').checked=audio.musicOn;$('st-invert').checked=settings.invert;$('st-sens').value=settings.sens;$('st-dev').checked=settings.dev;applySettings();}}
$('tm-hangar').onclick=()=>leaveTitle('jobs');$('tm-shop').onclick=()=>leaveTitle('shop');$('tm-worlds').onclick=()=>leaveTitle('worlds');
$('tm-howto').onclick=()=>openPanel('howto');$('tm-settings').onclick=()=>openPanel('settings');$('tm-credits').onclick=()=>openPanel('credits');$('tp-close').onclick=()=>{$('titlepanel').hidden=true;};
$('st-sfx').onchange=e=>{audio.setSfx(e.target.checked);audioLabels();};$('st-music').onchange=e=>{audio.setMusic(e.target.checked);audioLabels();};
$('st-invert').onchange=e=>{settings.invert=e.target.checked;saveSettings();};$('st-sens').oninput=e=>{settings.sens=Number(e.target.value);saveSettings();};$('st-dev').onchange=e=>{settings.dev=e.target.checked;saveSettings();};
$('tohome').onclick=()=>{if(mode!=='hangar'||fxPart)return;fadeTo(showTitle);};
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('titlepanel').hidden)$('titlepanel').hidden=true;else if(e.key==='Enter'&&mode==='intro'&&$('titlepanel').hidden)leaveTitle('jobs');});
applySettings();
// ── Title-screen show reel (v0.86): the plane flies itself, weaving, rolling, looping and dropping
// parachute parcels, while the camera circles it and keeps it to the right of the title text.
const attract={t:0,next:4,step:0,orbit:0,parcels:[]};
const camPos=new T.Vector3(),camAim=new T.Vector3(),tRight=new T.Vector3(),tUp=new T.Vector3();
const SAFE_ALT=IN_DESERT?28:19;
function attractInput(dt){const a=attract;a.t+=dt;a.next-=dt;
 // Gentle S-turns, and hold a comfortable altitude.
 const turn=state.stunt?0:Math.sin(a.t*.32)*.55+Math.sin(a.t*.11)*.25,climb=state.stunt?0:Math.max(-1,Math.min(1,(SAFE_ALT+Math.sin(a.t*.2)*4-state.altitude)*.25));
 if(a.next<=0&&!state.stunt){const moves=['roll-1','drop','loop','roll1','drop','boost'];const m=moves[a.step++%moves.length];a.next=3.2+Math.random()*1.6;
  if(m==='loop'&&state.altitude>=16&&state.speed>=17)startStunt(state,'loop');else if(m.startsWith('roll'))startStunt(state,'roll',m==='roll1'?1:-1);
  else if(m==='drop'){const p=makeParcel(releaseState(state));Object.assign(p,parcelModel());p.mesh.position.copy(p.position);a.parcels.push(p);}
  else if(m==='boost')a.boostUntil=a.t+2.2;}
 return {turn,climb,boost:a.t<(a.boostUntil||0),throttle:0,floor:7};}
function attractParcels(dt){const list=attract.parcels;for(let i=list.length-1;i>=0;i--){const p=list[i];let hit=false;for(let t=0;t<dt;t+=1/60){if(stepParcel(p,Math.min(1/60,dt-t))){hit=true;break;}}
  p.mesh.position.copy(p.position);p.mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),p.position.clone().normalize());p.canopy.visible=p.inflation>0;p.canopy.scale.set(Math.max(.04,p.inflation),.6+.4*p.inflation,Math.max(.04,p.inflation));
  if(hit||p.age>30){disposeParcel(p);list.splice(i,1);}}}
function clearAttract(){for(const p of attract.parcels)disposeParcel(p);attract.parcels.length=0;}
// Orbiting show-reel camera. On wide screens the plane sits right of center, clear of the title.
function titleCamera(dt,position){attract.orbit+=dt*.16;const a=attract.orbit;tRight.crossVectors(state.forward,state.normal).normalize();
 const dist=15+Math.sin(a*.7)*3;camPos.copy(position).addScaledVector(state.forward,-Math.cos(a)*dist).addScaledVector(tRight,Math.sin(a)*dist).addScaledVector(state.normal,4.5+Math.sin(a*.5)*2);
 camera.position.lerp(camPos,1-Math.exp(-2.5*dt));camera.up.copy(state.normal);
 const fwd=tUp.copy(position).sub(camera.position).normalize(),camRight=new T.Vector3().crossVectors(fwd,state.normal).normalize();
 camAim.copy(position).addScaledVector(camRight,innerWidth>760?-5.5:0).addScaledVector(state.normal,innerWidth>760?0:-3);camera.lookAt(camAim);}

function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.04);last=now;let camHandled=false;
 if(mode==='cutscene')camHandled=updateCutscene(dt);
 else if(mode==='rollout')camHandled=updateRollout(dt);
 else if(mode==='hangar'||mode==='tow'){camHandled=true;updateWorkshop(dt);}
 else if(mode==='touchdown')camHandled=updateTouchdown(dt);
 else if(mode==='landing')camHandled=updateLanding(dt);
 else if(mode==='crash')camHandled=updateCrash(dt);
 else if(mode==='flight'||mode==='intro'){
  const steer=mode==='flight'&&mouse.active,clamp1=v=>Math.max(-1,Math.min(1,v));
  {const loaded=mode==='flight'&&job&&!route.jobDone&&(job.type==='crate'?!!extras.carrying:route.parcels>0&&route.done<job.units);const ce=cargoEffect(job?.cargo,state,loaded,!!keys.boost);cargoTurn=ce.turn;cargoRack.visible=!!loaded&&job.type!=='crate';cargoRack.children.forEach(b=>b.material.color.set(CARGO[job?.cargo||'standard'].color));cargoRack.rotation.z=cargoTurn*2;
   if(ce.wear)route.condition=Math.max(0,route.condition-ce.wear*dt);
   const w=extras.carryWeight();state.perf=w?{...perf,speed:perf.speed*(1-Math.max(.02,.07*w-.03*(perf.strength-w))),climb:perf.climb*(1-.05*w)}:perf;state.perf={...state.perf,speed:state.perf.speed*ce.speed*(shortcuts.boost?1.25:1),climb:state.perf.climb*ce.climb};}
  advance(state,mode==='intro'?attractInput(dt):{turn:mode==='flight'?clamp1(Number(!!keys.right)-Number(!!keys.left)+(steer?mouseAxis(mouse.x):0)+cargoTurn+extras.buffet.turn+Math.sin(worldTime*8.1)*seaLife.pull(state.normal,worldTime)*1.3):0,climb:mode==='flight'?clamp1(Number(!!keys.up)-Number(!!keys.down)+(steer?mouseAxis(settings.invert?mouse.y:-mouse.y):0)+extras.buffet.climb+Math.sin(worldTime*6.3+1)*seaLife.pull(state.normal,worldTime)):0,boost:mode==='flight'&&keys.boost&&state.fuel>0,throttle:mode==='flight'?(Number(!!keys.faster)-Number(!!keys.slower)):0,engineOut:mode==='flight'&&state.fuel<=0,floor:mode==='flight'?0:7},dt);
  if(mode==='flight'){const shortcut=shortcuts.update(state.normal.clone().multiplyScalar(RADIUS+state.altitude),dt);if(shortcut==='hit'){shortcuts.resetTrack();beginCrash('the shortcut arch');}else if(shortcut==='clear'){audio.sfx.whoosh();notify('SHORTCUT! · 6 SECOND TAILWIND');noticeUntil=performance.now()+3000;}if(mode==='flight')updateFuelAndTerrain(dt);if(mode==='flight'){careerFlight(dt);bingoCheck();}if(run.pendingNext>0&&(run.pendingNext-=dt)<=0)nextDay();}
  prop.rotation.z+=dt*(state.fuel<=0&&mode==='flight'?Math.max(0,8):keys.boost?95:65);clouds.rotation.y+=dt*.001;
 }
 const position=state.normal.clone().multiplyScalar(RADIUS+state.altitude);aircraft.position.copy(position);if(mode==='intro'){titleCamera(dt,position);attractParcels(dt);camHandled=true;}
 right.crossVectors(state.forward,state.normal).normalize();up.copy(state.normal);back.copy(state.forward).negate();basis.makeBasis(right,up,back);aircraft.quaternion.setFromRotationMatrix(basis);
 if(mode!=='crash'){visual.rotation.z=-state.bank-state.roll;visual.rotation.x=state.pitch;}
 if(!camHandled&&!(mode==='paused'&&(pausedFrom==='cutscene'&&cine.t<LOAD_TIME+SWOOP_TIME||pausedFrom==='landing'&&landing?.stopped||pausedFrom==='rollout'))&&mode!=='complete'){target.copy(position).addScaledVector(state.forward,-17).addScaledVector(state.normal,12);
 camera.position.lerp(target,1-Math.exp(-5*dt));camera.up.copy(state.normal);camTarget.copy(position).addScaledVector(state.forward,12);camera.lookAt(camTarget);}
 const wantedFov=keys.boost&&mode==='flight'?85:mode==='cutscene'&&cine.t<LOAD_TIME?58:78;camera.fov+=(wantedFov-camera.fov)*(1-Math.exp(-2*dt));camera.updateProjectionMatrix();
 if(mode==='landing'&&mode!=='complete')updateDelivery(dt);
 if(gateGroup.visible)gateMat.emissiveIntensity=.65+.35*Math.sin(now*.005);
 if(mode==='flight'){
  updateDelivery(dt);
  trailTick+=dt;if(trailTick>.06){trailTick=0;const t=trails[trailIndex++%trails.length];t.position.copy(position).addScaledVector(state.forward,-2.2);t.visible=!!keys.boost;}
 }
 audio.update({sputter:mode==='flight'&&state.fuel<10?(state.fuel<=0?1:.5):0,windy:extras.windy?1:0,speed:state.speed,boost:mode==='flight'&&!!keys.boost,pitch:state.pitch,active:mode==='flight'||mode==='cutscene'||mode==='landing'||mode==='rollout'||mode==='touchdown'});
 checkDaylight();
 if(mode!=='paused'){worldTime+=dt;for(const e of seaLife.update(dt,worldTime,mode==='flight'?position:null))if(e.type==='horn')audio.sfx.horn(e.ship);
  if(mode==='flight'){const pull=seaLife.pull(state.normal,worldTime);if(pull>0){route.condition=Math.max(40,route.condition-dt*3*pull);if(worldTime-spoutNotice>6){spoutNotice=worldTime;notify('WATERSPOUT · HOLD ON · FLY AROUND IT');}}}
  graphics.update(dt,{state,planeWorld:position,time:worldTime,engine:mode==='rollout'?(roll.t<PHASES.doors?.2:1):mode==='touchdown'?Math.min(1,state.speed/12):mode==='flight'||mode==='landing'?(state.fuel>0?Math.min(1,state.speed/12):0):mode==='cutscene'?(cine.t<LOAD_TIME?.25:1):mode==='intro'?1:0});
  celebrations.update(dt);for(const e of extras.update(dt,{state,planeWorld:position,hookWorld:mode==='flight'?updateLine(dt,position):(updateLine(dt,position),null),active:mode==='flight',par:curDay.par,grab:perf.grab,strength:perf.strength}))handleChallenge(e);
   for(const e of threats.update(dt,{active:mode==='flight',planeWorld:position,planeVel:state.forward.clone().multiplyScalar(state.speed),altitude:state.altitude,groundUnder:groundHeight(state.normal)}))handleThreat(e);threatAlarm(dt);}
 if(shake>0){shake=Math.max(0,shake-dt);camera.position.add(new T.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).multiplyScalar(shake*1.6));}
 if(now>noticeUntil)clearNotice();
 hudTick+=dt;if(hudTick>.1){hudTick=0;{const f=Math.ceil(state.fuel);$('fuel').textContent=f;$('fuelbar').style.width=f+'%';$('fuelbox').classList.toggle('low',f<25);}$('speed').textContent=Math.round(state.speed*3);$('altitude').textContent=Math.round(state.altitude*10);const dn=job?route.done:route.delivered,tot=job?job.units:route.stops.length,pct=tot?dn/tot*100:0;$('progress').textContent=dn+'/'+tot;$('progressbar').style.width=pct+'%';$('throttle').value=Math.round(state.throttle*100);$('throttlevalue').textContent=Math.round(state.throttle*100)+'%';let nearest=null,best=-1;for(const i of islands){const dot=state.normal.dot(i.n);if(dot>best){best=dot;nearest=i;}}$('region').textContent=best>.85?nearest.label:'OPEN OCEAN';}
 mapTick+=dt;if(mapTick>.08){mapTick=0;const summary=drawMinimap(mapCanvas,state,islands,route.stops,depot.position.clone().normalize(),mapWorld,now/1000,gateGroup.visible?gateNormal:null,[...extras.markers(),...threats.markers(),...shortcuts.markers()]);$('mapstatus').textContent=job?(route.jobDone?'Job done · head home':`${job.units-route.done} to go`):route.complete?'Head home · H marks the gate':`${summary.remaining} / ${summary.total} stops left`;}
 renderer.render(scene,camera);
 renderPip(dt);
}showTitle();requestAnimationFrame(frame);
