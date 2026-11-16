import * as THREE from 'three';
import { dabGeometry,dabMaterial,dabMesh } from '../oilpaint/dabs.js';
import { COMMON } from '../oilpaint/common.js';
import { heightAt } from './land.js';
import { rng } from '../world/noise.js';
import { SEED, riverX, COTTAGE_TREES } from './config.js';

// Solid woody structure and irregular needle boughs, all in world coordinates.
export function createForest(shared){
 const group=new THREE.Group(),random=rng(SEED),trees=[],colliders=[];
 for(const t of COTTAGE_TREES){const tree={...t,y:heightAt(t.x,t.z),r:.15+t.h*.011,angle:random()*6.28};trees.push(tree);colliders.push({...tree});}
 for(let i=0;i<1600;i++){
  const x=(random()-.5)*490,z=-240+random()*345;
  if(Math.abs(x)<78&&z>-98)continue;
  if(Math.abs(x-riverX(z))<12)continue;
  const h=8+random()*13,r=.15+h*.011;
  trees.push({x,y:heightAt(x,z),z,h,r,angle:random()*6.28});
  if(Math.abs(x)<115&&z>-110)colliders.push({...trees.at(-1)});
 }
 const branchTotal=trees.reduce((n,t)=>{t.branches=Math.abs(t.x)<130&&t.z>-140?60:28;return n+t.branches;},0);
 const mat=(bark=false)=>new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,uniforms:shared,
 vertexShader:`${COMMON}\nout vec3 P;out vec3 N;void main(){vec4 p=instanceMatrix*vec4(position,1.);P=p.xyz;N=normalize(mat3(instanceMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*p;}`,
 fragmentShader:`${COMMON}\nin vec3 P;in vec3 N;out vec4 color;void main(){float lit=clamp(dot(normalize(N),uSunDir)*.5+.45,0.,1.);float n=texture(tNoise,P.xz*.11+P.y*.03).r;float marks=texture(tNoise,vec2(P.x*3.+P.z*2.,P.y*.6)).g;vec3 c=${bark?'mix(vec3(.12,.14,.13),vec3(.42,.33,.22),lit)':'mix(vec3(.035,.13,.19),vec3(.26,.36,.18),lit*.7+n*.2)'};c*=.85+.26*marks;color=vec4(hazed(c,P),1.);}`});
 const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.35,1,1,9,5),mat(true),trees.length);
 const branchGeo=new THREE.CylinderGeometry(.015,1,1,5);
 const branches=new THREE.InstancedMesh(branchGeo,mat(true),branchTotal);
 const leafGeo=new THREE.SphereGeometry(1,6,4),p=leafGeo.attributes.position;
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i),s=.79+.21*Math.sin(i*5.83);p.setXYZ(i,x*s,y*(.75+.25*Math.cos(i*2.7)),z*s);}
 leafGeo.computeVertexNormals();
 const needles=new THREE.InstancedMesh(leafGeo,mat(false),branchTotal*3);
 const roots=new THREE.InstancedMesh(branchGeo,mat(true),trees.length*4);
 const m=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
 const segment=(mesh,i,a,b,r)=>{v.subVectors(b,a);q.setFromUnitVectors(up,v.clone().normalize());m.compose(a.clone().add(b).multiplyScalar(.5),q,new THREE.Vector3(r,v.length(),r));mesh.setMatrixAt(i,m);};
 const marks={pos:[],dir:[],normal:[],data:[]};
 const mark=(pos,dir,normal,width,length,kind)=>{marks.pos.push(...pos);marks.dir.push(...dir);marks.normal.push(...normal);marks.data.push(random()*1000,width,length,kind);};
 let bi=0,ni=0,ri=0;
 for(let i=0;i<trees.length;i++){
  const t=trees[i];m.compose(new THREE.Vector3(t.x,t.y+t.h*.5,t.z),new THREE.Quaternion(),new THREE.Vector3(t.r,t.h,t.r));trunks.setMatrixAt(i,m);
  for(let ring=0;ring<7;ring++)for(let face=0;face<7;face++){
   const a=face/7*Math.PI*2,h=(ring+.5)/7*t.h,rad=t.r*(1-.65*h/t.h),nx=Math.cos(a),nz=Math.sin(a);
   mark([t.x+nx*(rad+.012),t.y+h,t.z+nz*(rad+.012)],[0,1,0],[nx,0,nz],rad*1.0,t.h/6*(.85+random()*.3),0);
  }
  for(let r=0;r<4;r++){const a=t.angle+r*Math.PI/2;segment(roots,ri++,new THREE.Vector3(t.x,t.y+.45,t.z),new THREE.Vector3(t.x+Math.cos(a)*t.r*2.8,t.y+.03,t.z+Math.sin(a)*t.r*2.8),t.r*.48);}
  for(let j=0;j<t.branches;j++){
   const f=j/t.branches,angle=t.angle+j*2.39996,len=t.h*(.19*(1-f)+.018)*(.85+random()*.25),y=t.y+t.h*(.24+f*.72);
   const a=new THREE.Vector3(t.x,y,t.z),b=new THREE.Vector3(t.x+Math.cos(angle)*len,y-len*.11,t.z+Math.sin(angle)*len);
   segment(branches,bi++,a,b,t.r*(1-f)*.28+.012);
   for(let k=0;k<2;k++){const center=a.clone().lerp(b,.48+k*.28);mark(center.toArray(),[Math.cos(angle),-.3,Math.sin(angle)],[Math.cos(angle)*.4,.8,Math.sin(angle)*.4],len*(.64-k*.12),len*(1.05-k*.18),1);}
   for(let k=0;k<3;k++){
    const center=a.clone().lerp(b,.36+k*.28);center.y+=len*.08;
    q.setFromAxisAngle(up,-angle);m.compose(center,q,new THREE.Vector3(len*(.34-k*.04),len*(t.branches<60?.22:.13)+len*f*.06,len*(.26-k*.03)));needles.setMatrixAt(ni++,m);
   }
  }
 }
 for(const mesh of [trunks,branches,needles,roots]){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);}
 const strokes=dabMesh(dabGeometry(marks.data.length/4,{aPos:[new Float32Array(marks.pos),3],aDir:[new Float32Array(marks.dir),3],aNrm:[new Float32Array(marks.normal),3],aData:[new Float32Array(marks.data),4]}),dabMaterial(shared,{head:'in vec3 aPos;in vec3 aDir;in vec3 aNrm;in vec4 aData;',minPx:[2,4],maxPx:[180,500],cells:[0,8],body:`
 void makeDab(inout Dab d){vec4 r=hash4(aData.x);vec3 P=aPos;bool leaf=aData.w>.5;float lit=clamp(dot(normalize(aNrm),uSunDir)*.65+.4,0.,1.);vec3 c;
 if(leaf){c=paint3(vec3(.40,.48,.22),vec3(.17,.31,.26),vec3(.045,.15,.22),lit,r.x);P.xz+=uWind.xy*.035*sin(uTime*1.3+r.y*30.);}
 else c=paint3(vec3(.46,.39,.30),vec3(.29,.28,.29),vec3(.15,.19,.24),lit,r.x);
 d.pos=P;d.dir=aDir;d.size=aData.yz;d.c1=hazed(c,P);d.c2=hazed(c*1.12,P);d.seed=aData.x;d.lift=leaf?.10:0.;
 if(!leaf){d.lie=1.;d.nrm=aNrm;d.height=.02;}d.turnabout=1.;}`}),3);group.add(strokes);
 return {group,colliders,trees,trunks,counts:{trees:trees.length,trunks:trees.length,boughs:ni}};
}
