import * as THREE from 'three';
import { COMMON } from '../oilpaint/common.js';
import { dabGeometry,dabMaterial,dabMesh } from '../oilpaint/dabs.js';
import { baseHeight } from './land.js';
import { rng } from '../world/noise.js';
const smooth=(a,b,x)=>THREE.MathUtils.smoothstep(x,a,b);
export function ridgeHeight(x,z){
 const north=Math.max(0,-z),side=Math.max(0,Math.abs(x)-220);
 let y=baseHeight(Math.max(-256,Math.min(256,x)),Math.max(-256,Math.min(256,z)));
 const range=20+60*Math.exp(-(((north-520-70*Math.sin(x/190))/130)**2))*(1+.32*Math.sin(x/125))
 +160*Math.exp(-(((north-900-90*Math.sin(x/240+1))/160)**2))*(1+.24*Math.sin(x/180+2))
 +340*Math.exp(-(((north-1410-100*Math.sin(x/280))/190)**2))*(1+.20*Math.sin(x/140+1))
 +75*(1-Math.exp(-side/400))+.008*north;
 return THREE.MathUtils.lerp(y,range,smooth(195,330,Math.max(Math.abs(x),Math.abs(z))))-2;
}
const COLOR=`vec3 ridgeColor(vec3 P,vec3 N,float r){
 float lit=clamp(dot(N,uSunDir)*.5+.45,0.,1.);
 vec3 c=paint3(vec3(.45,.59,.59),vec3(.29,.43,.48),vec3(.15,.28,.36),lit,r);
 float far=smoothstep(300.,1300.,-P.z);c=mix(c,vec3(.42,.55,.72),far*.65);
 c*=.86+.14*smoothstep(530.,730.,-P.z);
 float air=1.-exp(-length(P-cameraPosition)*.00016);return mix(c,vec3(.61,.68,.74),air*.35);
}`;
export async function createLandscape(shared){
 const group=new THREE.Group();
 const sky=new THREE.Mesh(new THREE.SphereGeometry(4200,40,24),new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,side:THREE.BackSide,depthWrite:false,uniforms:shared,
 vertexShader:'out vec3 D;void main(){D=position;gl_Position=projectionMatrix*viewMatrix*vec4(position,1.);}',
 fragmentShader:`${COMMON}\nin vec3 D;out vec4 color;void main(){vec3 n=normalize(D);vec2 p=vec2(atan(n.z,n.x)*4.,asin(n.y)*5.);float sweep=sin(p.x*13.+sin(p.y*11.)*1.8);float bristle=texture(tNoise,vec2(p.x*.6,p.y*2.+sweep*.02)).r;vec3 c=mix(vec3(.94,.87,.64),vec3(.88,.84,.66),smoothstep(0.,.8,n.y));c+=(bristle-.5)*.085+sweep*.008;color=vec4(c,1.);}`
 }));sky.renderOrder=-10;group.add(sky);
 const geo=new THREE.PlaneGeometry(4800,4800,260,260);geo.rotateX(-Math.PI/2);const p=geo.attributes.position;
 for(let i=0;i<p.count;i++)p.setY(i,ridgeHeight(p.getX(i),p.getZ(i)));geo.computeVertexNormals();
 const surface=new THREE.Mesh(geo,new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,uniforms:shared,
 vertexShader:`${COMMON}\nout vec3 P;out vec3 N;void main(){P=position;N=normal;gl_Position=projectionMatrix*viewMatrix*vec4(P,1.);}`,
 fragmentShader:`${COMMON}\n${COLOR}\nin vec3 P;in vec3 N;out vec4 color;void main(){color=vec4(ridgeColor(P,normalize(N),texture(tNoise,P.xz/170.).r),1.);}`}));group.add(surface);
 const random=rng(339721),pos=[],nrm=[],dir=[],data=[];
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),z=p.getZ(i);if(Math.max(Math.abs(x),Math.abs(z))<250||z>750||random()>.55)continue;
  pos.push(x,p.getY(i),z);nrm.push(...new THREE.Vector3().fromBufferAttribute(geo.attributes.normal,i).toArray());dir.push(.5+Math.sin(x/110+z/160)*.4,.08,1);data.push(random()*999,24+random()*18,50+random()*35,random());
 }
 const strokes=dabMesh(dabGeometry(data.length/4,{aPos:[new Float32Array(pos),3],aNrm:[new Float32Array(nrm),3],aDir:[new Float32Array(dir),3],aData:[new Float32Array(data),4]}),dabMaterial(shared,{head:`in vec3 aPos;in vec3 aNrm;in vec3 aDir;in vec4 aData;${COLOR}`,minPx:[0,0],maxPx:[4000,4000],cells:[0,8],body:`void makeDab(inout Dab d){d.pos=aPos;d.nrm=aNrm;d.dir=aDir;d.lie=1.;d.height=.12;d.size=aData.yz;d.c1=ridgeColor(aPos,aNrm,aData.w);d.c2=d.c1*1.05;d.seed=aData.x;}`}),1);group.add(strokes);
 return {group,colliders:[],surface,strokes,counts:{ridgeVertices:p.count,ridgeStrokes:data.length/4}};
}
