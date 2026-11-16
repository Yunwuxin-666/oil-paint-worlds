import * as THREE from 'three';
import { kit } from './paint.js';
import { heightAt } from './land.js';
import { HOUSES,CYPRESSES,SEED,STATIONS,roadX } from './config.js';
import { rng } from '../world/noise.js';

export function createProps(shared){
 const group=new THREE.Group(),solids=[],grounding=[],random=rng(SEED),b=kit(shared,{seed:SEED});
 const box=(x,y,z,w,h,d,pal='wall',opts={})=>b.box(x,y,z,w,h,d,pal,{stroke:[.65,1.7],density:1.1,grain:'y',...opts});
 const solid=(x,y,z,w,h,d)=>solids.push({x,y,z,hx:w/2,hy:h/2,hz:d/2,yaw:0});
 function footprint(x,z,w,d){let min=Infinity,max=-Infinity;for(let ix=0;ix<=8;ix++)for(let iz=0;iz<=8;iz++){const y=heightAt(x+(ix/8-.5)*w,z+(iz/8-.5)*d);min=Math.min(min,y);max=Math.max(max,y);}return {min,max};}
 for(const h of HOUSES){
  const {x,z,w,d}=h,g=footprint(x,z,w+.3,d+.3),floor=g.max+.08,wall=h.id%4===0?'sage':'wall';
  const bottom=g.min-.22,top=floor+.16;
  box(x,(top+bottom)/2,z,w+.3,top-bottom,d+.3,'stone',{grain:'x'});
  solid(x,(top+bottom)/2,z,w+.3,top-bottom,d+.3);
  grounding.push({x,z,w:w+.3,d:d+.3,bottom,top,floor});
  box(x,floor+h.h/2,z,w,h.h,d,wall);solid(x,floor+h.h/2,z,w,h.h,d);
  const rise=1.45+w*.06,eave=d/2+.45,slope=Math.atan2(rise,eave),len=Math.hypot(eave,rise);
  for(const side of [-1,1]){
   const m=new THREE.Matrix4().makeRotationX(side*slope);m.setPosition(x,floor+h.h+rise/2,z+side*eave/2);
   b.add(new THREE.BoxGeometry(w+.9,.16,len),m,'roof',{stroke:[.72,1.7],density:1.15,grain:new THREE.Vector3(0,0,1),free:true});
   const a=[x+side*w/2,floor+h.h,z-d/2],c=[x+side*w/2,floor+h.h,z+d/2],p=[x+side*w/2,floor+h.h+rise,z];
   b.tri(...(side>0?[a,p,c]:[a,c,p]),wall,{stroke:[.28,.7],density:.35});
  }
  box(x,floor+h.h+rise+.04,z,w+1,.16,.18,'roof',{grain:'x'});
  // Door and window dimensions remain tied to the 1.8 m traveler.
  box(x,floor+1.05,z+d/2+.045,1.1,2.1,.08,'dark');
  box(x-.48,floor+1.06,z+d/2+.10,.08,1.98,.05,'wood');
  for(const dx of [-w*.28,w*.28])for(const y of [1.65,h.h-1.2]){
   box(x+dx,floor+y,z+d/2+.055,.73,.96,.10,'dark');
   for(const s of [-1,1])box(x+dx+s*.43,floor+y,z+d/2+.11,.17,1.04,.08,'sage',{grain:'y'});
   box(x+dx,floor+y-.52,z+d/2+.15,.98,.09,.18,'stone',{grain:'x'});
  }
  for(const side of [-1,1])for(const dz of [-d*.25,d*.25])box(x+side*(w/2+.04),floor+h.h-1.25,z+dz,.08,.91,.64,'dark');
  if(h.id%3===0){box(x-w*.27,floor+h.h+rise*.7,z-d*.21,.55,1.8,.55,'stone');box(x-w*.27,floor+h.h+rise*.7+.94,z-d*.21,.72,.12,.72,'roof');}
 }
 // Solid tapered, bending tree bodies; broad brush strips build flame-like silhouettes.
 for(const [i,t] of CYPRESSES.entries()){
  const y=heightAt(t.x,t.z),r=.17+t.h*.009;
  b.add(new THREE.CylinderGeometry(r*.65,r,t.h*.72,8),b.place(t.x,y+t.h*.36,t.z),'wood',{grain:new THREE.Vector3(0,1,0),stroke:[.20,.9],density:.28});
  solid(t.x,y+t.h/2,t.z,r*2,t.h,r*2);
  const v=[],indices=[],rings=23,sides=17;
  for(let j=0;j<=rings;j++){
   const f=j/rings,rad=t.h*.071*Math.pow(Math.sin(Math.PI*f),.65)*(.83+.13*Math.sin(f*20+i));
   for(let k=0;k<=sides;k++){const a=k/sides*Math.PI*2;v.push(t.x+Math.sin(f*8+i)*f*.55+Math.cos(a)*rad,y+.65+f*(t.h-.65),t.z+Math.sin(a)*rad*.85);if(j&&k){const n=j*(sides+1)+k;indices.push(n,n-sides-2,n-1,n,n-sides-1,n-sides-2);}}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(v,3));geo.setIndex(indices);geo.computeVertexNormals();
  b.add(geo,new THREE.Matrix4(),'leaf',{grain:new THREE.Vector3(.13,1,.08),stroke:[.48,2.1],density:1.1,free:true,smooth:true});
 }
 // Low silvery hedges skirt field edges without walling off the lane.
 for(let i=0;i<135;i++){
  const x=-85+random()*170,z=-65+random()*145;
  if(Math.abs(x-roadX(z))<5||HOUSES.some(h=>Math.abs(x-h.x)<h.w/2+3&&Math.abs(z-h.z)<h.d/2+3))continue;
  const edge=Math.sin((z+.22*x+10*Math.sin(x/44))/19);if(Math.abs(edge)>.42)continue;
  const h=.7+random()*.8,wide=1.3+random()*1.7,y=heightAt(x,z);
  b.add(new THREE.SphereGeometry(1,9,6),b.place(x,y+h*.48,z,random()*6,[wide,h,wide*.6]),'olive',{grain:new THREE.Vector3(.25,1,.2),stroke:[.25,.65],density:.6,free:true,smooth:true});
 }
 // Connected, low olive hedges trace the same curved terraces as the ground paint.
 for(const row of [-1,0,1])for(let x=-78;x<=78;x+=2.8){
  const z=row*Math.PI*19-.22*x-10*Math.sin(x/44);
  if(Math.abs(x-roadX(z))<7||HOUSES.some(h=>Math.abs(x-h.x)<h.w/2+4&&Math.abs(z-h.z)<h.d/2+4))continue;
  const h=.7+random()*.5,y=heightAt(x,z);
  b.add(new THREE.SphereGeometry(1,9,6),b.place(x,y+h*.35,z,-.15,[1.9,h,.85]),'olive',{
   grain:new THREE.Vector3(.25,1,.1),stroke:[.4,.95],density:.85,free:true,smooth:true});
 }
 for(const s of STATIONS){
  const y=heightAt(s.x,s.z);
  if(s.id!=='easel'){
   // A small palette on a sturdy wooden stand marks an optional color stop.
   box(s.x,y+.52,s.z,.13,1.04,.13,'wood');box(s.x,y+1.08,s.z,.6,.12,.4,s.id==='wheat'?'gold':s.id==='ridge'?'blue':'leaf');
   solid(s.x,y+.6,s.z,.6,1.2,.45);
  }
 }
 const e=STATIONS.find(s=>s.id==='easel'),ey=heightAt(e.x,e.z);
 for(const dx of [-.48,.48]){box(e.x+dx,ey+.88,e.z,.10,1.76,.13,'wood');solid(e.x+dx,ey+.88,e.z,.14,1.76,.16);}
 box(e.x,ey+.95,e.z,1.15,.10,.25,'wood',{grain:'x'});
 box(e.x,ey+1.42,e.z,1.05,.90,.12,'wood');solid(e.x,ey+1.4,e.z,1.1,1,.2);
 const paint=b.build();group.add(paint.group);
 const canvas=document.createElement('canvas');canvas.width=384;canvas.height=288;const ctx=canvas.getContext('2d'),texture=new THREE.CanvasTexture(canvas);
 const picture=new THREE.Mesh(new THREE.PlaneGeometry(.93,.76),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide}));picture.position.set(e.x,ey+1.43,e.z+.075);group.add(picture);
 function drawPicture(done){ctx.fillStyle='#e9dfb7';ctx.fillRect(0,0,384,288);if(done){ctx.fillStyle='#a4b6bd';ctx.beginPath();ctx.moveTo(0,120);for(let x=0;x<=384;x+=5)ctx.lineTo(x,96+Math.sin(x/39)*17+Math.sin(x/17)*8);ctx.lineTo(384,288);ctx.lineTo(0,288);ctx.fill();ctx.fillStyle='#d7aa40';ctx.fillRect(0,159,384,129);for(let i=0;i<12;i++){const x=60+i%4*66,y=161+Math.floor(i/4)*22;ctx.fillStyle='#ded7ab';ctx.fillRect(x,y,47,38);ctx.fillStyle='#ac7044';ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x+23,y-16);ctx.lineTo(x+50,y);ctx.fill();}for(const x of [88,122,280]){ctx.fillStyle='#1d4843';ctx.beginPath();ctx.ellipse(x,175,8,58,0,0,Math.PI*2);ctx.fill();}}texture.needsUpdate=true;}
 drawPicture(false);
 return {group,solids,grounding,paint,picture,drawPicture,trees:CYPRESSES,update(){}};
}
