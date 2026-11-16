import * as THREE from 'three';
import { noise,rng } from '../world/noise.js';
import { COMMON } from '../oilpaint/common.js';
import { dabGeometry,dabMaterial,dabMesh } from '../oilpaint/dabs.js';
import { baseHeight } from './land.js';

// Continuous opaque 3D terrain. No panorama or camera-facing mountain geometry.
const peaks=[
 [-3400,-2700,1650,1500,1550],[-2350,-2300,2150,1350,1550],
 [-900,-2850,2460,1700,1800],[380,-2500,1930,1300,1500],
 [1570,-3100,2340,1700,1700],[2950,-2400,1840,1550,1600],
 [-1900,-1350,940,1200,1000],[100,-1550,1160,1350,1100],
 [2150,-1300,1090,1500,1100],[-3000,350,830,1600,1500],
 [3100,600,960,1750,1700],[-2300,2700,660,1800,1500],[2200,3100,780,2100,1800],
].map(([x,z,h,wx,wz])=>[x*1.25,z*1.45,h,wx*1.25,wz*1.3]);
const smooth=(a,b,x)=>THREE.MathUtils.smoothstep(x,a,b);
export function mountainHeight(x,z){
 let y=18;
 for(let i=0;i<peaks.length;i++){
  const [px,pz,h,wx,wz]=peaks[i],dx=(x-px)/wx,dz=(z-pz)/wz,a=Math.atan2(dz,dx);
  const r=Math.hypot(dx,dz)*(1+.12*Math.sin(a*5+i*2.3)+.06*Math.sin(a*9+i));
  const cone=h*Math.pow(Math.max(0,1-r),1.24);
  const k=Math.max(0,1-Math.abs(y-cone)/110);y=Math.max(y,cone)+k*k*27.5;
 }
 // Connected saddles across the northern range.
 for(let i=0;i<5;i++){
  const a=peaks[i],b=peaks[i+1],dx=b[0]-a[0],dz=b[1]-a[1];
  const t=THREE.MathUtils.clamp(((x-a[0])*dx+(z-a[1])*dz)/(dx*dx+dz*dz),0,1);
  const dist=Math.hypot(x-a[0]-t*dx,z-a[1]-t*dz);
  const crest=THREE.MathUtils.lerp(a[2],b[2],t)*(1-.30*Math.sin(t*Math.PI));
  y=Math.max(y,crest-dist*1.25);
 }
 const mass=smooth(80,700,y);
 y+=mass*(noise(x/330,z/290)*105+noise(x/120+9,z/110)*42+noise(x/43,z/48)*10);
 const radius=Math.hypot(x,z),blend=smooth(235,520,radius);
 const basin=baseHeight(THREE.MathUtils.clamp(x,-256,256),THREE.MathUtils.clamp(z,-256,256));
 return THREE.MathUtils.lerp(basin,y,blend)-2-40*(1-smooth(190,280,radius));
}
const PAINT=`
vec3 mountainColour(vec3 P,vec3 N,float r){
 float lit=clamp(dot(N,uSunDir)*.62+.37,0.,1.);
 float crag=texture(tNoise,P.xz/950.).r;
 vec3 rock=paint3(vec3(.55,.61,.69),vec3(.35,.45,.59),vec3(.22,.31,.47),lit,r);
 float snowLine=720.+crag*470.;
 float snow=smoothstep(snowLine,snowLine+130.,P.y)*smoothstep(.26,.68,N.y+crag*.12);
 vec3 ice=paint3(vec3(.94,.92,.85),vec3(.68,.75,.82),vec3(.39,.51,.68),lit,r);
 vec3 c=mix(rock,ice,snow);
 vec3 foothill=paint3(vec3(.25,.39,.32),vec3(.16,.29,.31),vec3(.09,.20,.27),lit,r);
 foothill=mix(vec3(.36,.43,.25),foothill,smoothstep(65.,290.,P.y));
 c=mix(foothill,c,smoothstep(270.,680.,P.y));
 // Kilometre-scale air is gentler than the valley mist; preserve the snow silhouettes.
 float air=1.-exp(-length(P-cameraPosition)*.00009);
 // The same valley haze continues onto the lower foothills, easing out toward the snow.
 float valley=mistBetween(P)*(1.-smoothstep(100.,700.,P.y));
 return mix(c,airColour(normalize(P-cameraPosition)),1.-(1.-valley)*(1.-air*.38));
}`;
export function createMountains(shared){
 const group=new THREE.Group(),segments=400,extent=6500,geo=new THREE.PlaneGeometry(extent*2,extent*2,segments,segments);
 geo.rotateX(-Math.PI/2);
 const positions=geo.attributes.position;
 for(let i=0;i<positions.count;i++)positions.setY(i,mountainHeight(positions.getX(i),positions.getZ(i)));
 geo.computeVertexNormals();geo.computeBoundingSphere();
 const surface=new THREE.Mesh(geo,new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,uniforms:shared,
  vertexShader:`${COMMON}\nout vec3 P;out vec3 N;void main(){P=position;N=normal;gl_Position=projectionMatrix*viewMatrix*vec4(P,1.);}`,
  fragmentShader:`${COMMON}\n${PAINT}\nin vec3 P;in vec3 N;out vec4 color;void main(){float r=texture(tNoise,P.xz/170.).g;vec3 n=normalize(N);color=vec4(mountainColour(P,n,r),1.);}`
 }));surface.name='alpine-mountain-solid-terrain';group.add(surface);
 // Permanent surface pins, with long axes projected down the mountain slope.
 const random=rng(564993),pos=[],nrm=[],dir=[],data=[],index=geo.index.array;
 const A=new THREE.Vector3(),B=new THREE.Vector3(),C=new THREE.Vector3(),N=new THREE.Vector3(),D=new THREE.Vector3(),P=new THREE.Vector3(),E=new THREE.Vector3();
 for(let i=0;i<index.length;i+=6){
  A.fromBufferAttribute(positions,index[i]);B.fromBufferAttribute(positions,index[i+1]);C.fromBufferAttribute(positions,index[i+2]);
  P.copy(A).add(B).add(C).multiplyScalar(1/3);
  if(P.y<65||Math.hypot(P.x,P.z)>5900||Math.hypot(P.x,P.z)<320)continue;
  N.fromBufferAttribute(geo.attributes.normal,index[i]);N.add(E.fromBufferAttribute(geo.attributes.normal,index[i+1]));N.add(E.fromBufferAttribute(geo.attributes.normal,index[i+2])).normalize();
  const count=1;
  for(let k=0;k<count;k++){
   let u=random(),v=random();if(u+v>1){u=1-u;v=1-v;}
   P.copy(A).multiplyScalar(1-u-v).addScaledVector(B,u).addScaledVector(C,v);
   D.set(0,-1,0).addScaledVector(N,N.y);
   if(D.lengthSq()<.01)D.set(1,0,.25);D.normalize();
   D.addScaledVector(E.crossVectors(N,D),(random()-.5)*.4).normalize();
   pos.push(...P.toArray());nrm.push(...N.toArray());dir.push(...D.toArray());
   data.push(random()*1000,30+random()*27,65+random()*70,random());
  }
 }
 const strokes=dabMesh(dabGeometry(data.length/4,{aPos:[new Float32Array(pos),3],aNrm:[new Float32Array(nrm),3],aDir:[new Float32Array(dir),3],aData:[new Float32Array(data),4]}),dabMaterial(shared,{
  head:`in vec3 aPos;in vec3 aNrm;in vec3 aDir;in vec4 aData;${PAINT}`,
  minPx:[0,0],maxPx:[4000,4000],cells:[0,8],
  body:`void makeDab(inout Dab d){vec3 c=mountainColour(aPos,aNrm,aData.w);d.pos=aPos;d.dir=aDir;d.nrm=aNrm;d.size=aData.yz;d.lie=1.;d.height=.8;d.c1=c;d.c2=c*1.045;d.seed=aData.x;d.glaze=0.;}`
 }),1);strokes.name='alpine-mountain-surface-brushes';group.add(strokes);
 return {group,surface,strokes,strokeCount:data.length/4,heightAt:mountainHeight,peaks};
}
