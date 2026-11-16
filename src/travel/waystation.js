import * as THREE from 'three';
import {createKit} from '../night/kit.js';
import {SCENE} from '../scenes.js';

export function createWaystation({shared,scene,player,heightAt,spawn,pathAt}){
 const z=spawn.z-10;
 const road=pathAt(z);
 // Keep the arch off the travel lane and away from existing solid props.
 const clear=(x,z)=>{
  const origin=new THREE.Vector3(x,heightAt(x,z)+1.1,z);
  for(let k=0;k<12;k++)if(player.castRay(origin,new THREE.Vector3(Math.sin(k*Math.PI/6),0,Math.cos(k*Math.PI/6)),2.5)!=null)return false;
  return true;
 };
 const candidates=[4.2,-4.2,6.5,-6.5,9,-9];
 const offset=candidates.find(dx=>clear(road+dx,z))??4.2;
 const x=road+offset,y=heightAt(x,z),night=SCENE==='aurora';
 const palettes={
  stone:{l:[.76,.75,.59],m:[.46,.52,.45],s:[.21,.33,.33]},
  wood:{l:[.67,.48,.28],m:[.38,.29,.19],s:[.16,.21,.21]},
  glow:{l:[.75,.94,.73],m:[.39,.74,.63],s:[.21,.48,.48]},
 };
 const b=createKit(shared,{palettes,seed:583232,haze:true,light:`vec3 kitPaint(vec3 P,vec3 Nn,int k,float tone,float r){float lit=clamp(dot(Nn,uSunDir)*.65+.4,0.,1.);vec3 c=paint3(PAL_L[k],PAL_M[k],PAL_S[k],lit,r);return c*tone${night?'*vec3(.50,.68,.83)':''};}`});
 // Individual stones follow the ground instead of suspending a flat disk on a hill.
 for(let i=0;i<14;i++){
  const a=i/14*Math.PI*2,sx=x+Math.sin(a)*1.45,sz=z+Math.cos(a)*1.45;
  b.add(new THREE.CylinderGeometry(.33,.37,.10,6),b.place(sx,heightAt(sx,sz)+.035,sz,a),'stone',{stroke:[.18,.43],density:.7});
 }
 for(const side of [-1,1]){
  const sx=x+side*1.07,base=heightAt(sx,z)-.15,top=y+2.7;
  b.box(sx,(base+top)/2,z,.23,top-base,.25,'wood',{stroke:[.23,.9],density:1,grain:'y'});
  player.world.createCollider(player.R.ColliderDesc.cuboid(.115,(top-base)/2,.125).setTranslation(sx,(base+top)/2,z));
  b.box(sx,y+2.58,z,.35,.16,.38,'stone',{stroke:[.25,.43]});
 }
 b.box(x,y+2.75,z,2.66,.25,.40,'wood',{stroke:[.28,1.1],density:1,grain:'x'});
 b.box(x,y+2.40,z,1.02,.46,.17,'stone',{stroke:[.26,.7],density:.8,grain:'x'});
 const painted=b.build(),group=painted.group;group.name='world-waystation';scene.add(group);
 const lightMaterial=new THREE.MeshBasicMaterial({color:night?'#a3e9cf':'#c8dd9c',transparent:true,opacity:.72,depthWrite:false});
 const beacon=new THREE.Mesh(new THREE.OctahedronGeometry(.18),lightMaterial);beacon.position.set(x,y+3.22,z);group.add(beacon);
 const rune=new THREE.Mesh(new THREE.TorusGeometry(.30,.025,6,24),lightMaterial);rune.position.set(x,y+2.40,z+.115);group.add(rune);
 const landing={x:x-Math.sign(offset)*1.9,z:z+1.35};
 return {group,x,z,y,landing,painted,update(time){beacon.position.y=y+3.22+Math.sin(time*1.8)*.08;beacon.rotation.y=time*.5;}};
}
