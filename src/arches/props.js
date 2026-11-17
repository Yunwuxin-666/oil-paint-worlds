import * as THREE from 'three';
import {kit} from './paint.js';
import {heightAt} from './land.js';
import {rng} from '../world/noise.js';
import {roadX,SEED,STATIONS} from './config.js';
export function createProps(shared){
 const b=kit(shared,{seed:SEED+90}),random=rng(SEED+90),solids=[];
 for(let i=0;i<95;i++){
  const z=-145+random()*245,x=-48+random()*96;if(Math.abs(x-roadX(z))<3.2)continue;
  const y=heightAt(x,z),h=.35+random()*.65,r=.35+random()*.70;
  for(let j=0;j<32;j++){
   const angle=random()*Math.PI*2,point=new THREE.Vector3(x+Math.sin(angle)*r*random(),y+h*(.2+random()*.8),z+Math.cos(angle)*r*random());
   b.stroke(point,new THREE.Vector3(Math.sin(angle)*.6,.7,Math.cos(angle)*.6).normalize(),new THREE.Vector3(Math.sin(angle),.5,Math.cos(angle)),.25+random()*.30,.5+random()*.55,'shrub',.8+random()*.3,-.1);
  }
  b.round(x,y+h*.23,z,.045,h*.46,'wood',{stroke:[.08,.3],density:.3});
 }
 // A modest wind-shaped juniper, fully rooted on the left approach.
 const x=-25,z=40,y=heightAt(x,z);
 for(let k=0;k<5;k++){
  const p=new THREE.Vector3(x-k*.23,y+.40+k*.64,z),axis=new THREE.Vector3(-.22,1,.1).normalize();
  b.round(p.x,p.y,p.z,.16-k*.021,.95,'wood',{top:.13-k*.02,turn:new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),axis)),stroke:[.18,.65],density:.8});
  for(let j=0;j<35;j++){
   const a=random()*6.28;b.stroke(new THREE.Vector3(p.x+Math.sin(a)*1.25,p.y+.4+random()*.6,p.z+Math.cos(a)*1.1),new THREE.Vector3(0,1,0),new THREE.Vector3(Math.cos(a),.2,Math.sin(a)),.35,.8,'shrub',.9+random()*.3);
  }
 }
 solids.push({x:x-.4,y:y+1.5,z,hx:.22,hy:1.5,hz:.22,yaw:0});
 for(const target of STATIONS){
  const mx=target.x+(target.x<roadX(target.z)?-2:2),py=heightAt(mx,target.z);b.round(mx,py+.3,target.z,.30,.6,'pale',{top:.25,stroke:[.25,.6],density:.8});
  solids.push({x:mx,y:py+.3,z:target.z,hx:.3,hy:.3,hz:.3,yaw:0});
 }
 const painted=b.build();painted.strokes.material.vertexShader=painted.strokes.material.vertexShader.replace('d.height = 0.004 + aMore.y + 0.01 * r.z;','d.height = 0.004 + aMore.y + 0.01 * r.z; if(aMore.y<0.){d.lie=0.;d.height=0.;d.dir=normalize(aDir+vec3(sin(uTime*1.4+aPos.x)*.08,0.,0.));}');return {group:painted.group,solids,update(){}};
}
