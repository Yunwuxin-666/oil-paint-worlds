import * as THREE from 'three';
import { COMMON } from '../oilpaint/common.js';
import { heightAt,hydroAt } from './land.js';
import { riverX, riverLevel, gravelHalfWidth, SEED } from './config.js';
import { rng } from '../world/noise.js';
import { createMeadowGrowth } from './meadow.js';
import { createStream } from './stream.js';
export const waterHeight=(x,z)=>hydroAt(x,z).level;
export const waterDepth=(x,z)=>Math.max(0,hydroAt(x,z).depth);
export function createEnvironment(shared){
 const group=new THREE.Group(),random=rng(SEED+200),trail=Array.from({length:16},()=>new THREE.Vector4(9999,9999,-99,0));
 const uniforms={...shared,uTrail:{value:trail},uWalker:{value:new THREE.Vector3()}};
 const growth=createMeadowGrowth(shared,trail),stream=createStream(shared,trail);group.add(growth.group,stream.group);
 // Small airborne seeds share the meadow's wind, using finite world-space particles.
 const pollenPos=new Float32Array(480*3);
 for(let i=0;i<480;i++)pollenPos.set([(random()-.5)*120,random()*6+1,(random()-.5)*120],i*3);
 const pg=new THREE.BufferGeometry();pg.setAttribute('position',new THREE.BufferAttribute(pollenPos,3));
 const pollen=new THREE.Points(pg,new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,uniforms,transparent:true,depthWrite:false,
 vertexShader:`${COMMON}\nuniform vec3 uWalker;out float alpha;void main(){vec3 P=position;P.xz=mod(P.xz+vec2(uTime*.22,uTime*.08)-uWalker.xz+60.,120.)+uWalker.xz-60.;P.y+=heightAt(P.xz)+sin(uTime*.7+position.x)*.25;vec4 v=viewMatrix*vec4(P,1.);gl_Position=projectionMatrix*v;gl_PointSize=clamp(22./max(1.,-v.z),1.,3.);alpha=.4*(1.-smoothstep(25.,60.,length(P-cameraPosition)));}`,
 fragmentShader:'in float alpha;out vec4 color;void main(){float a=1.-smoothstep(.1,.5,length(gl_PointCoord-.5));color=vec4(.94,.87,.61,a*alpha);}'
 }));pollen.frustumCulled=false;group.add(pollen);

 let cursor=0,last=new THREE.Vector2(999,999),inWater=false;
 return {group,growth,grass:growth.group.children[0],water:stream.surface,stream,trail,uniforms,waterDepth,stats:{grassHeight:[.07,.59],riverPebbles:stream.rockCount},get inWater(){return inWater;},
 setQuality(low){growth.group.children.forEach((o,i)=>o.visible=!low||i<3);},
 update(time,dt,player,camera){
  stream.update(time,dt);
  uniforms.uWalker.value.copy(player.feet);growth.follow(camera.position.x,camera.position.z);
  const depth=waterDepth(player.feet.x,player.feet.z);inWater=depth>.06&&player.feet.y<waterHeight(player.feet.x,player.feet.z)+.06;
  if(last.distanceTo(new THREE.Vector2(player.feet.x,player.feet.z))>.3&&player.grounded){trail[cursor].set(player.feet.x,player.feet.z,time,inWater?1:0);cursor=(cursor+1)%trail.length;last.set(player.feet.x,player.feet.z);}
 }
 };
}
