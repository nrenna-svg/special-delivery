// Tiny low-poly people and parcels shared by the Kestrel Field crew and the delivery recipients.
// A person stands at their group origin, faces -Z, and is about 1.15 units tall.
export function createPeopleKit({T,mat}){
 const m={navy:mat('#294760'),shoe:mat('#22343a'),strap:mat('#f3e7c8'),crate:mat('#a27a4a'),
  skin:[mat('#e5b48c'),mat('#a8714b'),mat('#c98f62'),mat('#f0c9a3'),mat('#7c5236')]};
 const add=(geo,material,p,x=0,y=0,z=0)=>{const o=new T.Mesh(geo,material);o.position.set(x,y,z);p.add(o);return o;};
 const box=(p,w,h,d,x,y,z,material)=>add(new T.BoxGeometry(w,h,d),material,p,x,y,z);
 function crate(){const g=new T.Group();box(g,.38,.38,.38,0,0,0,m.crate);box(g,.4,.07,.4,0,0,0,m.strap);box(g,.07,.4,.4,0,0,0,m.strap);return g;}
 // shirt: material for torso and sleeves; hat: material or null; skin: index into m.skin; pants: material.
 function person(parent,{shirt,hat=null,skin=0,pants=m.navy,stripe=true}={}){
  const g=new T.Group();parent.add(g);const body=new T.Group();g.add(body);const skinMat=m.skin[skin%m.skin.length];
  const leg=x=>{const p=new T.Group();p.position.set(x,.46,0);body.add(p);box(p,.13,.44,.15,0,-.22,0,pants);box(p,.15,.07,.22,0,-.43,-.03,m.shoe);return p;};
  const arm=x=>{const p=new T.Group();p.position.set(x,.86,0);body.add(p);box(p,.1,.36,.12,0,-.17,0,shirt);add(new T.SphereGeometry(.06,6,4),skinMat,p,0,-.37,0);return p;};
  const legs=[leg(-.09),leg(.09)];
  box(body,.36,.42,.22,0,.68,0,shirt);if(stripe)box(body,.37,.05,.23,0,.72,0,m.strap);
  add(new T.IcosahedronGeometry(.15,1),skinMat,body,0,1.04,0);
  if(hat){add(new T.CylinderGeometry(.155,.165,.08,10),hat,body,0,1.15,0);box(body,.18,.03,.12,0,1.12,-.15,hat);}
  const arms=[arm(-.24),arm(.24)];
  const held=crate();held.position.set(0,.78,-.32);held.visible=false;body.add(held);
  return {g,body,legs,arms,held};
 }
 // Walk cycle; amount 0 stands still. Carrying holds both arms forward.
 function stride(p,phase,carrying,amount=1){
  const s=Math.sin(phase)*.7*amount;p.legs[0].rotation.x=s;p.legs[1].rotation.x=-s;
  p.body.position.y=Math.abs(Math.sin(phase))*.05*amount;
  if(carrying){p.arms[0].rotation.x=p.arms[1].rotation.x=-1.25;}else{p.arms[0].rotation.x=-s*.7;p.arms[1].rotation.x=s*.7;}
  p.arms[0].rotation.z=p.arms[1].rotation.z=0;
 }
 const yawToward=(dx,dz)=>Math.atan2(-dx,-dz);
 return {person,crate,stride,yawToward,box,add,m};
}
