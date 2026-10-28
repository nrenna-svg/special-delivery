// Kestrel Field ground crew for the pre-mission cutscene: a loading apron, baggage cart,
// two loaders who carry parcels to the plane's cargo door, and a marshal with light wands.
// Everything is built in runway-local coordinates (the `home` group: +Y up, runway along Z,
// plane parked at z=PARKED_Z facing -Z, so +X is the plane's right side).
import {PARKED_Z,LOAD_TIME} from './takeoff.js';
import {createPeopleKit} from './people.js';

// Loader walking route: cart side -> beside the cargo door (kept behind the lower wing).
export const CART_SPOT={x:3.75,z:PARKED_Z+2.0};
export const DOOR_SPOT={x:1.15,z:PARKED_Z+.85};
export const CAMERA_FOCUS={x:2.3,y:1.0,z:PARKED_Z+1.25};
const CYCLE=3.3,PICK=.3,WALK=1.3,LOAD=.4;
const OFFSETS=[0,1.65];                                   // loaders alternate, half a trip apart
const REST=[{x:4.7,z:PARKED_Z+1.3},{x:5.6,z:PARKED_Z+.6}]; // clear of the wingtips (x>3.9) for takeoff
const MARSHAL={x:4.9,z:PARKED_Z-6.2};
const CART_CRATES=6;

export function createCrew({T,parent,mat}){
 const kit=createPeopleKit({T,mat}),{box,add,crate,stride,yawToward}=kit;
 const m={vest:mat('#f0883a'),hat:mat('#f6d35c'),hat2:mat('#e9f0ee'),cart:mat('#3f8494'),tire:kit.m.shoe,apron:mat('#a7b0a2'),line:mat('#f3dd8a'),wand:mat('#ff7b3a',{emissive:'#ff5a1f',emissiveIntensity:.9}),board:mat('#d8c7a0')};
 const root=new T.Group();parent.add(root);

 // Apron slab beside the runway's +Z end, deep enough to meet the island underneath.
 box(root,6.2,1.4,13.6,5.7,-.64,PARKED_Z-1.3,m.apron);
 for(let z=PARKED_Z-7.5;z<=PARKED_Z+5;z+=1.5)box(root,.12,.02,.8,2.9,.07,z,m.line);

 // Baggage cart with a stack of parcels.
 const cart=new T.Group();cart.position.set(4.75,0,PARKED_Z+2.6);root.add(cart);
 box(cart,1.25,.18,2.1,0,.38,0,m.cart);box(cart,1.25,.35,.12,0,.62,1.0,m.cart);box(cart,.9,.6,.6,0,.75,-1.25,m.cart);box(cart,.7,.3,.05,0,.95,-1.56,mat('#9fd3dc'));
 for(const x of [-.6,.6])for(const z of [-1.05,.7]){const w=add(new T.CylinderGeometry(.22,.22,.16,10),m.tire,cart,x,.22,z);w.rotation.z=Math.PI/2;}
 const stack=[];
 for(let i=0;i<CART_CRATES;i++){const c=crate();c.position.set(i%2?.27:-.27,.67+Math.floor(i/4)*.4,(Math.floor(i/2)%2)*.42-.05);cart.add(c);stack.push(c);}
 const person=(skin,hat,extra)=>{const p=kit.person(root,{shirt:m.vest,hat,skin});extra?.(p.arms,p.body);return p;};
 const loaders=[person(0,m.hat),person(1,m.hat2)];
 const marshal=person(2,m.hat,(arms,body)=>{
  for(const a of arms)box(a,.07,.55,.07,0,-.6,0,m.wand);
  box(body,.26,.32,.03,.0,.66,-.13,m.board);
 });
 marshal.g.position.set(MARSHAL.x,0,MARSHAL.z);marshal.g.rotation.y=Math.PI/2; // faces the runway (-X)

 const lerp=(a,b,u)=>a+(b-a)*u;
 // Where loader i is and what they're doing at loading time t (seconds into the cutscene).
 function loaderAt(i,t){
  const s=((t+OFFSETS[i])%CYCLE+CYCLE)%CYCLE;
  if(s<PICK)return {x:CART_SPOT.x,z:CART_SPOT.z,face:yawToward(1,.6),carry:s>PICK/2,walk:0,lift:0};
  if(s<PICK+WALK){const u=(s-PICK)/WALK;return {x:lerp(CART_SPOT.x,DOOR_SPOT.x,u),z:lerp(CART_SPOT.z,DOOR_SPOT.z,u),face:yawToward(DOOR_SPOT.x-CART_SPOT.x,DOOR_SPOT.z-CART_SPOT.z),carry:true,walk:u*WALK,lift:0};}
  if(s<PICK+WALK+LOAD){const u=(s-PICK-WALK)/LOAD;return {x:DOOR_SPOT.x,z:DOOR_SPOT.z,face:yawToward(-1,0),carry:u<.75,walk:0,lift:Math.sin(Math.min(1,u/.75)*Math.PI/2)};}
  const u=(s-PICK-WALK-LOAD)/(CYCLE-PICK-WALK-LOAD);
  return {x:lerp(DOOR_SPOT.x,CART_SPOT.x,u),z:lerp(DOOR_SPOT.z,CART_SPOT.z,u),face:yawToward(CART_SPOT.x-DOOR_SPOT.x,CART_SPOT.z-DOOR_SPOT.z),carry:false,walk:u*1.3,lift:0};
 }
 function picksBy(t){let n=0;for(let i=0;i<OFFSETS.length;i++){const o=OFFSETS[i];for(let k=0;k*CYCLE+PICK/2<=t+o;k++)if(k*CYCLE+PICK/2>=o)n++;}return n;}

 // t: seconds since the cutscene began. Loaders work until LOAD_TIME, then step clear and wave.
 function update(t){
  const tl=Math.min(t,LOAD_TIME);
  for(let i=0;i<loaders.length;i++){
   const p=loaders[i],a=loaderAt(i,tl);
   if(t<LOAD_TIME){
    p.g.position.set(a.x,0,a.z);p.g.rotation.y=a.face;p.held.visible=a.carry;
    stride(p,a.walk*9,a.carry,a.walk?1:0);
    if(a.lift){p.arms[0].rotation.x=p.arms[1].rotation.x=lerp(-1.25,-2.4,a.lift);p.held.position.set(0,lerp(.78,1.3,a.lift),lerp(-.32,-.38,a.lift));}else p.held.position.set(0,.78,-.32);
   }else{
    // Walk to the rest spot, then wave the plane off.
    const walkT=1.1,u=Math.min(1,(t-LOAD_TIME)/walkT),r=REST[i];
    p.held.visible=false;p.g.position.set(lerp(a.x,r.x,u),0,lerp(a.z,r.z,u));
    if(u<1){p.g.rotation.y=yawToward(r.x-a.x,r.z-a.z);stride(p,(t-LOAD_TIME)*9,false);}
    else{p.g.rotation.y=yawToward(-1,-.4);stride(p,0,false,0);const wave=Math.sin((t+i)*7);p.arms[1].rotation.x=-2.7;p.arms[1].rotation.z=wave*.35;}
   }
  }
  stack.forEach((c,i)=>c.visible=i<CART_CRATES-picksBy(tl));
  // Marshal: checks the clipboard while loading, then signals with both wands.
  if(t<LOAD_TIME){stride(marshal,0,false,0);marshal.arms[0].rotation.x=-.9;marshal.arms[1].rotation.x=-.2+Math.sin(t*1.3)*.08;marshal.body.rotation.y=Math.sin(t*.8)*.15;}
  else{marshal.body.rotation.y=0;stride(marshal,0,false,0);const w=Math.sin((t-LOAD_TIME)*6);marshal.arms[0].rotation.x=marshal.arms[1].rotation.x=-2.9;marshal.arms[0].rotation.z=.25+w*.45;marshal.arms[1].rotation.z=-.25-w*.45;}
 }
 // Settled pose for normal flight: crew standing beside the cart, waving occasionally.
 function rest(){update(LOAD_TIME+1.2);}
 rest();
 return {update,rest,root};
}
