import * as THREE from 'three';
import {COMMON} from '../oilpaint/common.js';
import {groundRings} from '../oilpaint/ground.js';
import {dabGeometry,dabMaterial,dabMesh} from '../oilpaint/dabs.js';
import {rng} from '../world/noise.js';
export function createEnvironment(shared){
 const group=new THREE.Group(),trail=Array.from({length:12},()=>new THREE.Vector4(9999,9999,-100,0)),uniforms={...shared,uTrail:{value:trail},uWalker:{value:new THREE.Vector3()}};
 const growth=groundRings(uniforms,{head:'uniform vec4 uTrail[12];',per:1,n:84,cell0:1.6,levels:3,minPx:[1,2],maxPx:[30,90],cells:[0,8],body:`void makeDab(inout Dab d){vec2 cell;float sub;if(!ringCell(91.,false,cell,sub)){d.alive=0.;return;}vec4 r=hash4(cell,39.);vec2 xz=(cell+r.xy)*uCell0;float lod;d.alive=ringGrow(distance(xz,cameraPosition.xz),lod);vec4 m=texture(tLand,landUv(xz));if(m.r>.1||r.z>.14||abs(xz.x)>48.||abs(xz.y)>180.){d.alive=0.;return;}vec3 P=vec3(xz.x,heightAt(xz),xz.y);float bend=1.-smoothstep(.2,1.,distance(xz,uFocus.xz));d.pos=P;d.dir=normalize(vec3(.24+sin(uTime*1.6+xz.x)*.14+bend*.6,1.-bend*.6,.18));d.base=1.;d.size=vec2(.12,.25+r.w*.35);d.c1=hazed(vec3(.61,.56,.27),P);d.c2=hazed(vec3(.85,.71,.36),P);d.seed=r.x*999.;}`});group.add(growth.group);
 const random=rng(528992),pos=new Float32Array(500*3);for(let i=0;i<500;i++)pos.set([(random()-.5)*120,random()*10,(random()-.5)*160],i*3);
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
 const dust=new THREE.Points(geo,new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,uniforms,transparent:true,depthWrite:false,
  vertexShader:`${COMMON}\nuniform vec3 uWalker;out float a;void main(){vec3 p=position;p.xz=mod(p.xz+vec2(uTime*1.2,uTime*.16)-uWalker.xz+vec2(60.,80.),vec2(120.,160.))+uWalker.xz-vec2(60.,80.);p.y+=heightAt(p.xz)+sin(uTime+position.x)*.2;vec4 v=viewMatrix*vec4(p,1.);gl_Position=projectionMatrix*v;gl_PointSize=clamp(20./max(1.,-v.z),1.,2.5);a=.22*(1.-smoothstep(25.,60.,length(p-cameraPosition)));}`,
  fragmentShader:'in float a;out vec4 color;void main(){float k=1.-smoothstep(.1,.5,length(gl_PointCoord-.5));color=vec4(.96,.74,.39,a*k);}'}));dust.frustumCulled=false;group.add(dust);
 const tracks=Array.from({length:48},()=>new THREE.Vector4(0,0,-100,0)),trackUniforms={...shared,uTracks:{value:tracks}};
 const footprints=dabMesh(dabGeometry(48,{aSlot:[Float32Array.from({length:48},(_,i)=>i),1]}),dabMaterial(trackUniforms,{head:'in float aSlot;uniform vec4 uTracks[48];',minPx:[0,0],maxPx:[4000,4000],cells:[0,8],body:`void makeDab(inout Dab d){vec4 t=uTracks[int(aSlot+.5)];float age=uTime-t.z;d.alive=step(0.,age)*step(0.,t.z)*(1.-smoothstep(18.,42.,age));vec3 P=vec3(t.x,heightAt(t.xy),t.y);d.pos=P;d.dir=vec3(sin(t.w),0.,cos(t.w));d.nrm=normalAt(t.xy);d.size=vec2(.16,.31);d.lie=1.;d.height=.024;d.c1=hazed(vec3(.58,.36,.22),P);d.c2=hazed(vec3(.72,.48,.26),P);d.seed=aSlot*17.;}`}),4);group.add(footprints);
 let cursor=0,last=new THREE.Vector2(9999,9999),left=false;
 return {group,tracks,inWater:false,stats:{dryGrassHeight:[.25,.60],dust:500,footprints:48},setQuality(low){dust.visible=!low},update(time,dt,player,camera){
  uniforms.uWalker.value.copy(player.feet);growth.follow(camera.position.x,camera.position.z);
  const p=player.feet,at=new THREE.Vector2(p.x,p.z);
  if(player.grounded&&player.speed>.3&&last.distanceTo(at)>.48){const side=(left?-1:1)*.12;tracks[cursor].set(p.x+Math.cos(player.yaw)*side,p.z-Math.sin(player.yaw)*side,time,player.yaw);cursor=(cursor+1)%tracks.length;left=!left;last.copy(at);}
 }};
}
