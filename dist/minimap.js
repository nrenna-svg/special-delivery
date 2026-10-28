import {RADIUS} from './flight.js';
import {DESERT} from './worlds.js';
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
export function projectPoint(normal,forward,point,range){
 const cosine=Math.max(-1,Math.min(1,dot(normal,point))),angle=Math.acos(cosine);
 const right={x:forward.y*normal.z-forward.z*normal.y,y:forward.z*normal.x-forward.x*normal.z,z:forward.x*normal.y-forward.y*normal.x};
 const x=dot(point,right),y=-dot(point,forward),length=Math.hypot(x,y),radius=angle/range;
 return {x:length>1e-8?x/length*radius:0,y:length>1e-8?y/length*radius:(cosine<0?radius:0),outside:angle>range,angle};
}
export function drawMinimap(canvas,state,islands,stops,depot,world=false,time=0,home=null,extra=[]){
 const ctx=canvas.getContext('2d'),size=canvas.width,c=size/2,r=c-9,range=world?Math.PI:102/RADIUS; // route view spans ~102 world units
 const project=p=>projectPoint(state.normal,state.forward,p,range);
 const screen=p=>({x:c+p.x*r,y:c+p.y*r});
 ctx.clearRect(0,0,size,size);ctx.save();ctx.beginPath();ctx.arc(c,c,r,0,Math.PI*2);ctx.clip();ctx.fillStyle='#103c4d';ctx.fillRect(0,0,size,size);
 ctx.strokeStyle='#83bcc426';ctx.lineWidth=1;for(const scale of [.33,.66,1]){ctx.beginPath();ctx.arc(c,c,r*scale,0,Math.PI*2);ctx.stroke();}ctx.beginPath();ctx.moveTo(c,9);ctx.lineTo(c,size-9);ctx.moveTo(9,c);ctx.lineTo(size-9,c);ctx.stroke();
 for(const island of islands){const outline=island.outline;if(!outline)continue;const center=project(island.n);if(center.angle>range+Math.atan(island.size/RADIUS))continue;ctx.beginPath();outline.forEach((v,i)=>{const p=screen(project(v));i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y);});ctx.closePath();ctx.fillStyle=island.h?'#a85a3a':DESERT?'#9c7a4e':'#547f69';ctx.fill();ctx.strokeStyle=island.h?'#e3a26a':DESERT?'#d9b27a':'#a1b88c';ctx.lineWidth=1.3;ctx.stroke();}
 ctx.fillStyle='#ffe5a214';ctx.beginPath();ctx.moveTo(c,c);ctx.lineTo(c-17,c-44);ctx.lineTo(c+17,c-44);ctx.closePath();ctx.fill();
 const unfinished=stops.filter(s=>!s.done);let nearest=unfinished.reduce((a,b)=>!a||dot(state.normal,b.normal)>dot(state.normal,a.normal)?b:a,null);
 function marker(normal,color,label,done=false,selected=false,diamond=false){let p=project(normal);const length=Math.hypot(p.x,p.y);if(length>.92){p.x=p.x/length*.92;p.y=p.y/length*.92;}const a=screen(p);ctx.save();ctx.translate(a.x,a.y);ctx.strokeStyle=color;ctx.fillStyle=color;ctx.lineWidth=2;
  if(selected){ctx.beginPath();ctx.arc(0,0,8+Math.sin(time*3)*1.2,0,Math.PI*2);ctx.stroke();}
  if(p.outside){ctx.rotate(Math.atan2(p.y,p.x));ctx.beginPath();ctx.moveTo(5,0);ctx.lineTo(-4,-4);ctx.lineTo(-4,4);ctx.closePath();ctx.fill();}
  else if(diamond){ctx.rotate(Math.PI/4);ctx.fillRect(-3,-3,6,6);}
  else {ctx.beginPath();ctx.arc(0,0,done?3:4.5,0,Math.PI*2);done?ctx.stroke():ctx.fill();if(!world&&!done){ctx.fillStyle='#fff5d7';ctx.font='bold 14px sans-serif';ctx.textAlign='center';ctx.fillText(label,0,-11);}}
  ctx.restore();
 }
 marker(depot,'#69dcff','D',false,false,true);
 // Day challenges: storms as shaded circles, upcoming rings as small dots, mail masts as M.
 for(const e of extra){if(e.kind==='storm'){const p=project(e.normal);if(p.outside)continue;const a=screen(p);ctx.fillStyle='#3a435599';ctx.beginPath();ctx.arc(a.x,a.y,Math.max(4,e.size/RADIUS/range*r),0,Math.PI*2);ctx.fill();ctx.strokeStyle='#c7d2e388';ctx.lineWidth=1;ctx.stroke();}
  else if(e.kind==='dot'){const p=project(e.normal);if(p.outside)continue;const a=screen(p);ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(a.x,a.y,2.2,0,Math.PI*2);ctx.fill();}
  else marker(e.normal,e.color,e.label,false,false);}
 if(home)marker(home,'#fff0c4','H',false,true);
 for(const stop of stops)marker(stop.normal,stop.done?'#81d7a4':'#ffd477',String(stop.id+1),stop.done,stop===nearest);
 ctx.strokeStyle='#0b2635';ctx.fillStyle='#fff7dc';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(c,c-8);ctx.lineTo(c+6,c+6);ctx.lineTo(c,c+3);ctx.lineTo(c-6,c+6);ctx.closePath();ctx.fill();ctx.stroke();
 ctx.restore();ctx.strokeStyle='#bed8d180';ctx.lineWidth=2;ctx.beginPath();ctx.arc(c,c,r,0,Math.PI*2);ctx.stroke();
 return {remaining:unfinished.length,total:stops.length};
}
