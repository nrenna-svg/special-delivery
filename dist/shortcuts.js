import {Vector3,Matrix4,Group,Mesh,TorusGeometry,MeshStandardMaterial} from './vendor/three.core.js';
import {RADIUS} from './flight.js';
import {homeStart} from './days.js';
import {slerpNormal} from './challenges.js';
import {floorAt} from './hazards.js';
// Swept crossing prevents tunnelling through an arch at high speed. Plane clearance is included.
export function archCross(a,b){
 if(a.z*b.z>0||Math.abs(b.z-a.z)<1e-8)return null;
 const t=-a.z/(b.z-a.z);if(t<0||t>1)return null;
 const r=Math.hypot(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t);
 return r<4.8?'clear':r<10.2?'hit':null;
}
export function createShortcuts(scene){
 let root=null,prev=null,taken=false,normal=null,tailwind=0;
 function clear(){if(root){scene.remove(root);root.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});}root=null;prev=null;taken=false;normal=null;tailwind=0;}
 return {
 start(job){clear();if(!job)return;const dest=job.crates[0]?.normal||job.stops[0]?.normal||job.stops[0]?.motion?.center||job.mail[0]?.normal;if(!dest)return;
 normal=slerpNormal(homeStart(),dest,.58);const forward=dest.clone().addScaledVector(normal,-dest.dot(normal)).normalize(),right=new Vector3().crossVectors(normal,forward).normalize();
 root=new Group();root.position.copy(normal).multiplyScalar(RADIUS+floorAt(normal)+17);root.quaternion.setFromRotationMatrix(new Matrix4().makeBasis(right,normal,forward));scene.add(root);
 const rock=new Mesh(new TorusGeometry(7.5,1.5,5,14),new MeshStandardMaterial({color:'#a58768',roughness:1,flatShading:true}));root.add(rock);
 const rim=new Mesh(new TorusGeometry(5.85,.15,5,32),new MeshStandardMaterial({color:'#71e9d1',emissive:'#36bca6',emissiveIntensity:.6}));root.add(rim);root.updateMatrixWorld(true);
 },
 update(pos,dt){tailwind=Math.max(0,tailwind-dt);if(!root)return null;const q=root.worldToLocal(pos.clone());let event=prev?archCross(prev,q):null;
 // Collision against the ring's volume even when approaching without crossing its center plane.
 const radial=Math.hypot(q.x,q.y);if(Math.hypot(radial-7.5,q.z)<2.7)event='hit';
 prev=q;if(event==='clear'){if(taken)return null;taken=true;tailwind=6;root.children[1].material.color.set('#f7ce78');return 'clear';}return event;
 },
 resetTrack(){prev=null;tailwind=0;},
 get boost(){return tailwind>0;},
 markers(){return normal&&!taken?[{normal,color:'#71e9d1',label:'↗'}]:[];}
 };
}
