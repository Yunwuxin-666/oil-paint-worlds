import * as THREE from 'three';
import {COMMON,LAND_RES} from '../oilpaint/common.js';
import {groundRings} from '../oilpaint/ground.js';
import {EXTENT,roadX} from './config.js';
const N=LAND_RES,heights=new Float32Array(N*N),map=new Uint8Array(N*N*4);
const smooth=(a,b,x)=>THREE.MathUtils.smoothstep(x,a,b);
export function baseHeight(x,z){
 const rise=.045*(70-z)+.95*Math.sin(z/29)+1.15*Math.sin(x/43+z/88);
 const bank=9*smooth(24,100,Math.abs(x-roadX(z)));
 const ledges=.18*Math.sin(z*.31+x*.03)*smooth(-145,30,z);
 return 5+rise+bank+ledges;
}
export async function prepareLand(pause){
 for(let j=0;j<N;j++){
  if(j%128===0)await pause?.(j/N);
  for(let i=0;i<N;i++){
   const x=-EXTENT+i/(N-1)*EXTENT*2,z=-EXTENT+j/(N-1)*EXTENT*2,k=i+j*N;
   heights[k]=baseHeight(x,z);const path=1-smooth(1.7,3.1,Math.abs(x-roadX(z)));
   map[k*4]=path*255;map[k*4+1]=255*(.5+.5*Math.sin(x/18+z/32));map[k*4+2]=150;map[k*4+3]=255;
  }
 }
}
export function heightAt(x,z){
 const fx=THREE.MathUtils.clamp((x+EXTENT)/(2*EXTENT)*(N-1),0,N-1.001),fz=THREE.MathUtils.clamp((z+EXTENT)/(2*EXTENT)*(N-1),0,N-1.001);
 const i=Math.floor(fx),j=Math.floor(fz),tx=fx-i,tz=fz-j;
 return THREE.MathUtils.lerp(THREE.MathUtils.lerp(heights[i+j*N],heights[i+1+j*N],tx),THREE.MathUtils.lerp(heights[i+(j+1)*N],heights[i+1+(j+1)*N],tx),tz);
}
export const SAND=`vec3 sandColour(vec3 P,float r){float lit=clamp(dot(normalAt(P.xz),uSunDir)*.65+.35,0.,1.);vec3 c=paint3(vec3(.99,.77,.43),vec3(.82,.53,.28),vec3(.46,.31,.28),lit,r);c=mix(c,c*1.07,texture(tLand,landUv(P.xz)).r*.45);c*=mix(.57,1.,woodSunAt(P+vec3(0.,.05,0.)));return c;}`;
export async function createLand(shared){
 shared.uExtent.value=EXTENT;const th=new THREE.DataTexture(heights,N,N,THREE.RedFormat,THREE.FloatType),tm=new THREE.DataTexture(map,N,N);
 for(const t of [th,tm]){t.minFilter=t.magFilter=THREE.LinearFilter;t.needsUpdate=true;}shared.tHeight.value=th;shared.tLand.value=tm;
 const geo=new THREE.PlaneGeometry(512,512,384,384);geo.rotateX(-Math.PI/2);const p=geo.attributes.position;
 for(let i=0;i<p.count;i++)p.setY(i,heightAt(p.getX(i),p.getZ(i))-.015);geo.computeVertexNormals();
 const mesh=new THREE.Mesh(geo,new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,uniforms:shared,
  vertexShader:`${COMMON}\nout vec3 P;void main(){P=position;gl_Position=projectionMatrix*viewMatrix*vec4(P,1.);}`,
  fragmentShader:`${COMMON}\n${SAND}\nin vec3 P;out vec4 color;void main(){color=vec4(hazed(sandColour(P,texture(tNoise,P.xz/8.).r),P),1.);}`}));
 const floor=groundRings(shared,{head:SAND,per:2,n:108,cell0:.75,levels:5,minPx:[1,2],maxPx:[4000,4000],cells:[0,8],body:`
 void makeDab(inout Dab d){vec2 cell;float sub;if(!ringCell(59.,true,cell,sub)){d.alive=0.;return;}vec4 r=hash4(cell,sub+18.);vec2 xz=(cell+r.xy)*uCell0;float lod;d.alive=ringGrow(distance(xz,cameraPosition.xz),lod);if(max(abs(xz.x),abs(xz.y))>254.){d.alive=0.;return;}vec3 P=vec3(xz.x,heightAt(xz),xz.y);vec3 c=jitter(sandColour(P,r.z),r.yzw,.12);d.pos=P;d.dir=normalize(vec3(1.,.01,.28+sin(xz.y/25.)*.2));d.size=vec2(.65+r.z*.40,2.4+r.w*1.5)*lod;d.c1=hazed(c,P);d.c2=hazed(c*1.08,P);d.lie=1.;d.nrm=normalAt(xz);d.height=.014;d.glaze=1.;d.seed=dot(cell,vec2(1.,57.))+sub;}`});
 function heightField(cells=512,half=256){const out=new Float32Array((cells+1)**2);for(let col=0;col<=cells;col++)for(let row=0;row<=cells;row++)out[row+col*(cells+1)]=heightAt(-half+col/cells*2*half,-half+row/cells*2*half);return {heights:out,cells,half};}
 return {mesh,floor,heightField};
}
