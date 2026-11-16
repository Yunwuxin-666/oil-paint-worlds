import * as THREE from 'three';
import { kit } from './paint.js';
import { heightAt } from './land.js';
import { COTTAGE,SEED } from './config.js';
import { COMMON } from '../oilpaint/common.js';
import { groundFootprint } from './placement.js';

// Reference-inspired stone/plaster cottage and timber shed. All surfaces have volume.
export function createCottage(shared){
 const {x,z}=COTTAGE,mainGround=groundFootprint(x,z,7.6,6.6),y=mainGround.max+.08;
 const b=kit(shared,{seed:SEED+406}),solids=[],grounding=[];
 const box=(dx,dy,dz,sx,sy,sz,pal,opts={})=>b.box(x+dx,y+dy,z+dz,sx,sy,sz,pal,{stroke:[.16,.35],density:.60,...opts});
 const solid=(dx,dy,dz,sx,sy,sz)=>solids.push({x:x+dx,y:y+dy,z:z+dz,hx:sx/2,hy:sy/2,hz:sz/2,yaw:0});
 const placed=(dx,dy,dz,rx=0)=>new THREE.Matrix4().compose(new THREE.Vector3(x+dx,y+dy,z+dz),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,0,0)),new THREE.Vector3(1,1,1));
 function footing(name,dx,dz,width,depth,top){
  const ground=groundFootprint(x+dx,z+dz,width,depth),bottom=ground.min-.15,h=top-bottom;
  box(dx,(top+bottom)/2-y,dz,width,h,depth,'masonry',{stroke:[.2,.45]});
  solid(dx,(top+bottom)/2-y,dz,width,h,depth);
  grounding.push({name,...ground,bottom,top});
 }
 footing('main-foundation',0,0,7.6,6.6,y+.01);
 box(0,1.45,0,7.4,2.9,6.4,'plaster');solid(0,1.6,0,7.5,4.1,6.5);
 // Gables and overhanging paired roof planes, ridge along X.
 for(const side of [-1,1]){
  const face=x+side*3.7;
  const a=[face,y+2.9,z-3.2],c=[face,y+2.9,z+3.2],top=[face,y+4.7,z];
  b.tri(a,side>0?top:c,side>0?c:top,'plaster',{stroke:[.25,.6],density:.7});
 }
 const slope=Math.atan2(1.8,3.2),length=Math.hypot(3.7,3.7*Math.tan(slope));
 for(const side of [-1,1]){
  const roofY=4.7-1.85*Math.tan(slope);
  b.add(new THREE.BoxGeometry(8.5,.16,length),placed(0,roofY,side*1.85,side*slope),'slate',{grain:new THREE.Vector3(0,0,1),stroke:[.24,.48],density:.8,free:true});
  // Separate thick shingle courses create an irregular roof edge and readable scale.
  for(let row=0;row<8;row++)for(let col=0;col<17;col++){
   const dz=side*(.20+row*.46),dx=-4.0+col*.49+(row%2)*.12;
   b.add(new THREE.BoxGeometry(.46,.065,.57),placed(dx,4.7-Math.abs(dz)*Math.tan(slope)+.11,dz,side*slope),'slate',{stroke:[.16,.33],density:.28,tone:.86+((row+col)%4)*.08});
  }
  box(0,2.66,side*3.72,8.55,.16,.13,'wood',{grain:'x'});
 }
 box(0,4.79,0,8.6,.15,.19,'slate',{grain:'x'});
 // Exposed masonry along the base and window corners; broad rather than micro texture.
 for(let row=0;row<3;row++)for(let col=0;col<12;col++)for(const side of [-1,1]){
  box(-3.4+col*.60+(row%2)*.16,.12+row*.29,side*3.215,.48,.22,.08,(col+row)%3?'masonry':'pale',{density:.28});
 }
 // Front faces the road (+X). A closed timber door, lintel, jambs and threshold.
 box(3.73,1.02,0,.10,2.04,1.15,'wood',{grain:'y',rows:.22});
 for(const dz of [-.65,.65])box(3.81,1.05,dz,.20,2.1,.14,'wood',{grain:'y'});
 box(3.83,2.13,0,.22,.18,1.45,'wood',{grain:'z'});
 box(3.84,1.0,.37,.10,.10,.10,'metal');
 for(let i=0;i<3;i++){
  const dx=4.05+i*.34,g=groundFootprint(x+dx,z,.38,1.8),top=Math.max(g.max+.025,y+.08-i*.065);
  footing('door-step-'+i,dx,0,.38,1.8,top);
 }
 for(const side of [-1,1])for(const dx of [-2,1.9]){
  box(dx,1.7,side*3.245,1.05,1.0,.10,'glass',{stroke:[.22,.40],density:.35});
  for(const sx of [-.61,.61])box(dx+sx,1.7,side*3.32,.18,1.2,.16,'wood',{grain:'y'});
  for(const dy of [1.13,2.27])box(dx,dy,side*3.32,1.4,.16,.16,'wood',{grain:'x'});
  box(dx,1.7,side*3.34,.06,1.0,.13,'wood');box(dx,1.7,side*3.34,1.0,.06,.13,'wood');
  box(dx+.94,1.7,side*3.28,.47,1.15,.10,'wood',{grain:'y',rows:.18});
 }
 // Porch shelter with real support posts.
 box(4.5,2.50,0,1.9,.14,2.1,'slate',{grain:'x'});
 for(const dz of [-.88,.88]){
  const ground=groundFootprint(x+5.24,z+dz,.17,.17),bottom=ground.min-.10,top=y+2.45;
  box(5.24,(top+bottom)/2-y,dz,.13,top-bottom,.13,'wood',{grain:'y'});solid(5.24,(top+bottom)/2-y,dz,.17,top-bottom,.17);
  grounding.push({name:'porch-post',...ground,bottom,top});
 }
 box(-1,4.92,-.8,.62,1.55,.66,'masonry',{stroke:[.20,.35]});box(-1,5.73,-.8,.85,.16,.88,'slate');
 // Smaller weathered timber outbuilding west of the main cottage.
 const sx=-8,sz=-4.3,shedGround=groundFootprint(x+sx,z+sz,4.3,3.3),shedFloor=shedGround.max+.06,sy=shedFloor-y;
 footing('shed-foundation',sx,sz,4.3,3.3,shedFloor+.01);
 box(sx,sy+1.1,sz,4.1,2.2,3.1,'wood',{grain:'y',rows:.25});solid(sx,sy+1.3,sz,4.2,2.6,3.2);
 for(const side of [-1,1]){
  const face=x+sx+side*2.05,a=[face,shedFloor+2.2,z+sz-1.55],c=[face,shedFloor+2.2,z+sz+1.55],top=[face,shedFloor+2.86,z+sz];
  b.tri(a,side>0?top:c,side>0?c:top,'wood',{stroke:[.18,.36],density:.65});
 }
 for(const side of [-1,1])b.add(new THREE.BoxGeometry(4.7,.12,1.95),placed(sx,sy+2.54,sz+side*.83,side*.37),'slate',{grain:new THREE.Vector3(1,0,0),stroke:[.2,.45],density:.7});
 box(sx,sy+2.89,sz,4.8,.13,.17,'slate',{grain:'x'});
 box(sx+2.08,sy+1.0,sz,.10,1.9,1.3,'wood',{grain:'z',tone:.6});
 // Short yard boundary, kept clear of the eastern entrance path.
 for(let i=0;i<6;i++){
  const dx=-9+i*2.1,dz=6.2,base=heightAt(x+dx,z+dz)-y;
  box(dx,base+.49,dz,.14,1.14,.14,'wood',{grain:'y'});solid(dx,base+.49,dz,.17,1.14,.17);
  const ground=groundFootprint(x+dx,z+dz,.17,.17);grounding.push({name:'yard-post-'+i,...ground,bottom:y+base-.08,top:y+base+1.06});
  if(i<5)for(const h of [.35,.78]){
   const next=heightAt(x+dx+2.1,z+dz)-y,dy=next-base,m=new THREE.Matrix4().makeRotationZ(Math.atan2(dy,2.1));m.setPosition(x+dx+1.05,y+(base+next)/2+h,z+dz);
   b.add(new THREE.BoxGeometry(Math.hypot(2.1,dy),.09,.09),m,'wood',{grain:new THREE.Vector3(1,0,0),stroke:[.08,.5],density:.5});
  }
 }
 const painted=b.build(),group=painted.group;group.name='roadside-stone-cottage';
 const smokeGeo=new THREE.BufferGeometry(),p=new Float32Array(24*3);
 for(let i=0;i<24;i++)p.set([i/24,i*2.39996,i*.71],i*3);smokeGeo.setAttribute('position',new THREE.BufferAttribute(p,3));
 const smoke=new THREE.Points(smokeGeo,new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,uniforms:{...shared,uChimney:{value:new THREE.Vector3(x-1,y+5.88,z-.8)}},transparent:true,depthWrite:false,
  vertexShader:`${COMMON}\nuniform vec3 uChimney;out float a;void main(){float age=mod(position.x*8.+uTime*.48,8.);vec3 P=uChimney+vec3(age*.22+sin(age+position.y)*age*.07,age*.63,age*.10);vec4 v=viewMatrix*vec4(P,1.);gl_Position=projectionMatrix*v;gl_PointSize=clamp((.16+age*.17)/max(.001,-v.z*uPixel),2.,100.);a=.12*smoothstep(0.,.8,age)*(1.-smoothstep(4.,8.,age));}`,
  fragmentShader:'in float a;out vec4 color;void main(){float r=length(gl_PointCoord-.5)*2.;color=vec4(.64,.70,.70,a*exp(-r*r*5.));}'
 }));smoke.frustumCulled=false;group.add(smoke);
 return {group,solids,grounding,x,y,z,shed:{x:x+sx,y:shedFloor,z:z+sz},chimney:[x-1,y+5.88,z-.8]};
}
