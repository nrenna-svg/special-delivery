// Home airfield scenery (v0.70): the long runway that follows the planet's curve, the apron, and a
// quonset hangar with sliding doors and a lived-in interior. The game starts inside the hangar.
// Hangar-local axes match runway coordinates: +x away from the runway, +z along it, +y up.
import {RADIUS} from './flight.js';
import {RUNWAY_HALF,RUNWAY_WIDTH,RUNWAY_HEIGHT,HANGAR,runwayNormal,PARK} from './airfield.js';

export function createAirfield({T,scene,mat,palette}){
 const up=new T.Vector3(0,1,0);
 const add=(geo,m,p)=>{const o=new T.Mesh(geo,m);p.add(o);return o;};
 const box=(p,w,h,d,x,y,z,m)=>{const o=add(new T.BoxGeometry(w,h,d),m,p);o.position.set(x,y,z);return o;};
 function at(x,z,alt=RUNWAY_HEIGHT){const n=runwayNormal(x,z,new T.Vector3()),g=new T.Group();g.position.copy(n).multiplyScalar(RADIUS+alt);g.quaternion.setFromUnitVectors(up,n);scene.add(g);return g;}
 const m={asphalt:mat('#3b4146'),apron:mat('#5b6064'),line:mat('#f3ecd7'),edge:mat('#ffd98a',{emissive:'#ffb648',emissiveIntensity:.6}),
  shell:mat('#aab6b7',{side:T.DoubleSide,metalness:.35,roughness:.55}),rib:mat('#7f8b8d',{metalness:.4}),wall:mat('#c9cfc9',{side:T.DoubleSide}),
  door:mat('#b8463a',{metalness:.2}),doorTrim:mat('#e7dcc0'),floor:mat('#8d8f8a'),bench:mat('#8a6440'),pegboard:mat('#c9a477'),drum:mat('#2f6f8c',{metalness:.3}),
  drum2:mat('#c94f3d',{metalness:.3}),crate:mat('#b88a52'),lamp:mat('#fff3cf',{emissive:'#ffd98a',emissiveIntensity:1.4}),cork:mat('#b98c5a'),paper:mat('#f6efdc'),pin:mat('#d8473a'),
  tire:mat('#24292c'),glass:mat('#a9d6e0',{emissive:'#7fb8c7',emissiveIntensity:.25})};

 // ── Runway: short curved slabs so the surface hugs the planet ──
 const STEP=3;
 for(let z=-RUNWAY_HALF;z<RUNWAY_HALF-.01;z+=STEP){const g=at(0,z+STEP/2,RUNWAY_HEIGHT-.44);box(g,RUNWAY_WIDTH,1,STEP+.06,0,0,0,m.asphalt);}
 for(let z=-RUNWAY_HALF+6;z<=RUNWAY_HALF-6;z+=4){const g=at(0,z,RUNWAY_HEIGHT+.07);box(g,.25,.04,1.9,0,0,0,m.line);}
 for(const end of [-1,1]){const g=at(0,end*(RUNWAY_HALF-2),RUNWAY_HEIGHT+.07);for(let k=-3;k<=3;k++)if(k)box(g,.5,.04,2.6,k*.95,0,0,m.line);
  const bar=at(0,end*(RUNWAY_HALF-4.2),RUNWAY_HEIGHT+.07);box(bar,RUNWAY_WIDTH-.6,.04,.3,0,0,0,m.line);}
 for(const x of [-RUNWAY_WIDTH/2-.3,RUNWAY_WIDTH/2+.3])for(let z=-RUNWAY_HALF;z<=RUNWAY_HALF;z+=5.5){const g=at(x,z,RUNWAY_HEIGHT+.15);add(new T.IcosahedronGeometry(.2,0),m.edge,g);}
 // Approach lights off the +z end, leading in from the auto-land ring.
 const approach=[];for(let k=1;k<=6;k++){const g=at(0,RUNWAY_HALF+k*5,.9);box(g,.12,1.4,.12,0,.2,0,palette.dark);approach.push(add(new T.IcosahedronGeometry(.32,0),m.edge,g));approach.at(-1).position.y=1;}
 // Apron between the runway and the hangar.
 {const g=at(10.3,27,RUNWAY_HEIGHT-.5);box(g,12.6,1,15,0,0,0,m.apron);
  for(let x=-5.5;x<=5.5;x+=1.6){box(g,.8,.04,.18,x,.52,1,m.line);}}

 // ── Hangar ──
 const H=at(HANGAR.x,HANGAR.z,RUNWAY_HEIGHT),L=HANGAR.length,R=HANGAR.radius,DW=HANGAR.door,DH=6.2;
 box(H,L+.4,1.4,2*R+.4,0,-.6,0,m.floor);// slab
 const shell=add(new T.CylinderGeometry(R,R,L,30,1,true,0,Math.PI),m.shell,H);shell.rotation.z=Math.PI/2;shell.position.y=.06;
 for(let x=-L/2;x<=L/2+.01;x+=L/6){const rib=add(new T.TorusGeometry(R+.08,.13,4,30,Math.PI),m.rib,H);rib.rotation.y=Math.PI/2;rib.position.set(x,.06,0);}
 const back=add(new T.CircleGeometry(R,30,0,Math.PI),m.wall,H);back.rotation.y=Math.PI/2;back.position.x=L/2;
 {const s=new T.Shape();s.moveTo(-R,0);s.lineTo(-DW/2,0);s.lineTo(-DW/2,DH);s.lineTo(DW/2,DH);s.lineTo(DW/2,0);s.lineTo(R,0);s.absarc(0,0,R,0,Math.PI,false);
  const front=add(new T.ShapeGeometry(s,24),m.wall,H);front.rotation.y=Math.PI/2;front.position.x=-L/2;}
 box(H,.3,.4,DW+.6,-L/2-.1,DH+.2,0,m.doorTrim);
 // Sliding doors on a rail, open by setDoors(u).
 const doors=[-1,1].map(side=>{const d=new T.Group();H.add(d);box(d,.22,DH,DW/2,0,DH/2,0,m.door);for(const y of [1.6,3.8])box(d,.26,.16,DW/2-.3,0,y,0,m.doorTrim);
  const win=box(d,.26,1,DW/2-1.4,0,5,0,m.glass);d.userData.side=side;return d;});
 function setDoors(u){for(const d of doors)d.position.set(-L/2-.35,0,d.userData.side*(DW/4+u*(DW/2+.2)));}
 setDoors(0);
 // Sign over the doors.
 {const c=document.createElement('canvas');c.width=1024;c.height=160;const x=c.getContext('2d');x.fillStyle='#173e49';x.fillRect(0,0,1024,160);x.strokeStyle='#ffd98a';x.lineWidth=8;x.strokeRect(8,8,1008,144);
  x.fillStyle='#ffe8b5';x.font='600 78px Barlow Condensed, Arial Narrow, sans-serif';x.textAlign='center';x.textBaseline='middle';x.fillText('KESTREL COURIER CO.',512,84);
  const tex=new T.CanvasTexture(c);tex.colorSpace=T.SRGBColorSpace;const sign=add(new T.PlaneGeometry(9,1.4),new T.MeshBasicMaterial({map:tex}),H);sign.rotation.y=-Math.PI/2;sign.position.set(-L/2-.12,DH+1.15,0);}
 // Interior: workbench and pegboard, drums, crates, tyres, a job board, hanging lamps.
 box(H,5.5,.18,1.4,1.5,1.1,R-1.6,m.bench);for(const x of [-1,4])box(H,.16,1.1,1.2,x,.55,R-1.6,m.bench);
 box(H,5.2,2.2,.1,1.5,2.6,R-.75,m.pegboard);for(let k=0;k<7;k++)box(H,.12,.6+((k*37)%5)*.12,.08,-.6+k*.7,2.7,R-.82,palette.dark);
 [[5.6,-5.4,m.drum],[6.4,-4.6,m.drum2],[6.5,-5.9,m.drum]].forEach(([x,z,mm])=>{const d=add(new T.CylinderGeometry(.55,.55,1.5,14),mm,H);d.position.set(x,.75,z);});
 [[-4.5,-6,1.3],[-3.2,-6.3,1],[-4.1,-6.1,.9]].forEach(([x,z,s],k)=>{const c=box(H,s,s,s,x,s/2+(k===2?1.3:0),z,m.crate);c.rotation.y=k*.4;});
 for(let k=0;k<3;k++){const t=add(new T.TorusGeometry(.5,.2,8,16),m.tire,H);t.rotation.x=Math.PI/2;t.position.set(6.3,.2+k*.4,4.8);}
 // Job board on the back wall, covered in pinned job slips.
 box(H,.12,2.4,4.2,L/2-.12,2.8,-2.4,m.cork);for(let k=0;k<6;k++){const p=box(H,.05,.8,.9,L/2-.2,2.2+(k>2?.95:0),-3.8+(k%3)*1.4,m.paper);p.rotation.x=(k*.37%1-.5)*.15;box(H,.08,.12,.12,L/2-.24,p.position.y+.32,p.position.z,m.pin);}
 const lamps=[-4,2].map(x=>{box(H,.05,1.6,.05,x,R-1,0,palette.dark);const shade=add(new T.ConeGeometry(.7,.5,12,1,true),m.rib,H);shade.position.set(x,R-1.9,0);const bulb=add(new T.SphereGeometry(.22,10,8),m.lamp,H);bulb.position.set(x,R-2.1,0);return bulb;});
 const light=new T.PointLight('#ffe2b0',40,24,1.6);light.position.set(-1,R-2.4,0);H.add(light);
 // Wind sock on a pole by the apron.
 {const g=at(13,18,RUNWAY_HEIGHT);box(g,.14,5,.14,0,2.5,0,palette.white);const sock=add(new T.ConeGeometry(.45,2.4,10,1,true),mat('#ff7a3a',{side:T.DoubleSide}),g);sock.rotation.z=Math.PI/2;sock.position.set(1.2,4.8,0);}

 // Camera spots (hangar-local): looking at the parked plane from by the doors, and outside on the apron.
 const P={x:PARK.x-HANGAR.x,z:PARK.z-HANGAR.z};
 function hangarView(pos,look){H.updateMatrixWorld(true);pos.set(-5.6,2.5,5.8);look.set(P.x+.6,1.5,P.z-1.6);H.localToWorld(pos);H.localToWorld(look);}
 function apronView(pos){H.updateMatrixWorld(true);pos.set(-13.5,3.6,9.5);H.localToWorld(pos);}
 const obstacle={normal:runwayNormal(HANGAR.x,HANGAR.z,new T.Vector3()),top:RUNWAY_HEIGHT+R+.6,radius:L/2+2,name:'the hangar'};
 function update(time){const pulse=.5+.5*Math.sin(time*5);approach.forEach((a,k)=>{a.material=m.edge;a.scale.setScalar(.7+.6*Math.max(0,Math.sin(time*6-k*.9)));});}
 return {group:H,setDoors,hangarView,apronView,obstacle,update};
}
