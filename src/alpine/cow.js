import * as THREE from 'three';
import { kit, movable, ellipsoid } from './paint.js';
import { heightAt } from './land.js';
import { SEED } from './config.js';

export function createCow(shared,spec,index){
 const object=new THREE.Group();object.position.set(spec.x,heightAt(spec.x,spec.z),spec.z);object.rotation.y=spec.yaw;
 const b=kit(shared,{seed:SEED+20+index});
 const opts={stroke:[.12,.24],density:1.2,free:true,smooth:true};
 const ball=(builder,x,y,z,sx,sy,sz,pal)=>ellipsoid(builder,x,y,z,sx,sy,sz,pal,opts);
 const link=(builder,a,z,ra,rb,pal)=>{
  const from=new THREE.Vector3(...a),to=new THREE.Vector3(...z),delta=to.clone().sub(from);
  const matrix=new THREE.Matrix4().compose(from.clone().add(to).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.clone().normalize()),new THREE.Vector3(1,1,1));
  builder.add(new THREE.CylinderGeometry(rb,ra,delta.length(),12,3),matrix,pal,opts);
 };
 // One continuous barrel with shoulders/withers/haunches sculpted into its profile.
 const rings=[[-.94,.17,.24,1.12],[-.76,.31,.35,1.12],[-.48,.38,.41,1.09],[-.12,.43,.44,1.04],[.28,.43,.40,1.06],[.63,.34,.35,1.13],[.81,.19,.28,1.13]];
 const vs=[],ids=[];
 rings.forEach(([z,w,h,y],r)=>{for(let j=0;j<=24;j++){const a=j/24*Math.PI*2;vs.push(Math.cos(a)*w,y+Math.sin(a)*h,z);if(r&&j){const i=r*25+j;ids.push(i,i-1,i-26,i,i-26,i-25);}}});
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vs,3));geo.setIndex(ids);geo.computeVertexNormals();
 b.add(geo,new THREE.Matrix4(),spec.coat,opts);
 ball(b,0,1.02,-.86,.23,.34,.35,spec.coat);
 // Narrow lower legs, front knees and rear hocks; split hooves touch the same heightfield as the player.
 for(const x of [-.28,.28])for(const rear of [false,true]){
  const z=rear?.60:-.62,knee=rear?z+.11:z-.015;
  ball(b,x,1.0,z,.14,.28,.18,spec.coat);
  link(b,[x,1.03,z],[x,.62,knee],.11,.07,spec.coat);
  ball(b,x,.60,knee,.079,.087,.09,spec.coat);
  link(b,[x,.59,knee],[x,.16,z-.035],.065,.045,spec.coat);
  for(const s of [-1,1])ball(b,x+s*.035,.071,z-.067,.032,.066,.105,'rubber');
 }
 // Small irregular saddle patch conforms to the barrel instead of looking like a second sphere.
 if(spec.coat==='brown'){
  for(let k=0;k<5;k++)ball(b,Math.sin(k*.3)*.025,1.39-k*.035,.08+k*.055,.32+k*.015,.06,.14,'cream');
 }
 const body=movable(b.build());object.add(body.group);
 const head=new THREE.Group();head.position.set(0,.87,-1.04);object.add(head);
 const hb=kit(shared,{seed:SEED+30+index});
 ball(hb,0,.03,-.12,.145,.22,.20,spec.coat);
 ball(hb,0,-.14,-.28,.125,.19,.235,spec.coat);
 ball(hb,0,-.26,-.43,.15,.10,.12,'nose');
 for(const s of [-1,1]){
  ball(hb,s*.10,-.22,-.515,.022,.018,.008,'rubber');
  ball(hb,s*.139,.055,-.22,.018,.023,.018,'rubber');
  ball(hb,s*.225,.10,-.01,.13,.035,.065,spec.coat);
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(s*.10,.22,-.03),new THREE.Vector3(s*.19,.27,-.01),new THREE.Vector3(s*.22,.36,-.02),new THREE.Vector3(s*.20,.41,-.05)]);
  const horn=new THREE.TubeGeometry(curve,10,.024,7,false),hp=horn.attributes.position;
  // Taper each tube ring around its curve centre.
  for(let j=0;j<hp.count;j++){const t=Math.floor(j/8)/10,center=curve.getPointAt(Math.min(t,1)),p=new THREE.Vector3().fromBufferAttribute(hp,j);p.sub(center).multiplyScalar(1-t*.92).add(center);hp.setXYZ(j,p.x,p.y,p.z);}horn.computeVertexNormals();hb.add(horn,new THREE.Matrix4(),'pale',opts);
 }
 hb.round(0,-.29,.06,.055,.085,'yellow',{top:.035,stroke:[.025,.05]});
 head.add(movable(hb.build()).group);
 const tail=new THREE.Group();tail.position.set(0,1.25,.80);object.add(tail);
 const tb=kit(shared,{seed:SEED+40+index});
 const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.025,-.25,.08),new THREE.Vector3(.05,-.53,.08),new THREE.Vector3(.03,-.83,.05)]);
 tb.add(new THREE.TubeGeometry(curve,14,.021,7,false),new THREE.Matrix4(),spec.coat,opts);ball(tb,.03,-.84,.05,.05,.13,.055,'nose');tail.add(movable(tb.build()).group);
 return {...spec,object,body:body.group,head,tail,fed:false,reaction:0};
}
