import * as THREE from 'three';
import { heightAt } from './land.js';
export function paintBench(b,x,y,z){
 for(let i=0;i<4;i++)b.box(x,y+.45,z-.21+i*.14,1.72,.065,.115,'wood',{grain:'x',stroke:[.09,.5]});
 const feet=[];
 for(const dx of [-.65,.65])for(const dz of [-.18,.23]){
  const bottom=heightAt(x+dx,z+dz)-.04,top=y+.43;
  b.box(x+dx,(top+bottom)/2,z+dz,.095,top-bottom,.095,'wood',{grain:'y',stroke:[.08,.3]});
  feet.push({x:x+dx,z:z+dz,bottom,top});
 }
 for(const dx of [-.65,.65]){
  b.box(x+dx,y+.32,z,.11,.09,.63,'wood',{grain:'z'});
  b.box(x+dx,y+.66,z+.26,.08,.56,.08,'wood',{grain:'y'});
  const g=new THREE.BoxGeometry(.065,.48,.065),q=new THREE.Matrix4().makeRotationX(-.75);q.setPosition(x+dx,y+.25,z+.02);b.add(g,q,'wood',{grain:new THREE.Vector3(0,1,0),stroke:[.06,.25]});
 }
 for(const h of [.64,.83])b.box(x,y+h,z+.28,1.72,.14,.055,'pale',{grain:'x',stroke:[.10,.5]});
 b.box(x,y+.15,z+.14,1.38,.07,.07,'wood',{grain:'x'});
 for(const dx of [-.65,.65])for(const h of [.64,.83])b.round(x+dx,y+h,z+.244,.016,.012,'metal',{turn:new THREE.Matrix4().makeRotationX(Math.PI/2),sides:6,stroke:[.015,.02]});
 return {x,y,z,feet};
}
