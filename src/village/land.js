import * as THREE from 'three';
import { COMMON, LAND_RES } from '../oilpaint/common.js';
import { groundRings } from '../oilpaint/ground.js';
import { noise } from '../world/noise.js';
import { EXTENT, roadX, HOUSES } from './config.js';
const N=LAND_RES,heights=new Float32Array(N*N),map=new Uint8Array(N*N*4);
const smooth=(a,b,x)=>THREE.MathUtils.smoothstep(x,a,b);
export function baseHeight(x,z){
 // Large landforms, not noise: a foreground shoulder, a village saddle and
 // rising fields behind it. Every asset and the physics heightfield sample this.
 const hill=(cx,cz,wx,wz,h)=>h*Math.exp(-(((x-cx)/wx)**2+((z-cz)/wz)**2));
 const villageRise=16*smooth(-8,72,-z);
 const foreground=14*smooth(28,112,z)
  +hill(-47,58,34,43,11)+hill(55,24,39,49,8);
 const rearFields=hill(-66,-108,45,61,17)+hill(65,-135,55,67,22);
 const folds=2.6*Math.sin((z+.22*x+10*Math.sin(x/44))/19)
  +1.8*Math.sin(x/31+z/53);
 return 5+foreground+villageRise+rearFields+folds
  +8*smooth(35,140,Math.abs(x))+22*smooth(90,245,-z)+14*smooth(120,250,Math.abs(x));
}
export async function prepareLand(pause){
 for(let j=0;j<N;j++){
  if(j%96===0)await pause?.(j/N);
  for(let i=0;i<N;i++){
   const x=-EXTENT+i/(N-1)*EXTENT*2,z=-EXTENT+j/(N-1)*EXTENT*2,k=i+j*N;
   let y=baseHeight(x,z),yard=0;
   for(const h of HOUSES){
    const edge=Math.max(Math.abs(x-h.x)-h.w/2,Math.abs(z-h.z)-h.d/2);
    // Keep the foundation level, but feather its apron away from the lane.
    // Otherwise a house on a higher bench can create a step across the road.
    const roadClear=smooth(2.7,5.3,Math.abs(x-roadX(z)));
    const blend=(1-smooth(.25,3.5,edge))*THREE.MathUtils.lerp(1,roadClear,smooth(.3,1,edge));
    y=THREE.MathUtils.lerp(y,baseHeight(h.x,h.z),blend);
    yard=Math.max(yard,1-smooth(1.5,3.5,edge));
   }
   heights[k]=y;
   const path=1-smooth(1.55,2.25,Math.abs(x-roadX(z)));
   // Terraces are broad curved ribbons, never a checkerboard of texture squares.
   const terrace=Math.sin((z+.22*x+10*Math.sin(x/44))/19);
   const hedge=(1-smooth(.035,.12,Math.abs(terrace)))*(1-smooth(22,48,Math.abs(x))*.15);
   map[k*4]=255*Math.max(path,yard*.94);map[k*4+1]=255*hedge;
   map[k*4+2]=255*(.5+.5*noise(x/47,z/35));map[k*4+3]=255*(1-yard)*(1-path);
  }
 }
}
export function heightAt(x,z){
 const fx=THREE.MathUtils.clamp((x+EXTENT)/(2*EXTENT)*(N-1),0,N-1.001),fz=THREE.MathUtils.clamp((z+EXTENT)/(2*EXTENT)*(N-1),0,N-1.001);
 const i=Math.floor(fx),j=Math.floor(fz),tx=fx-i,tz=fz-j;
 return THREE.MathUtils.lerp(THREE.MathUtils.lerp(heights[i+j*N],heights[i+1+j*N],tx),THREE.MathUtils.lerp(heights[i+(j+1)*N],heights[i+1+(j+1)*N],tx),tz);
}
export const FIELD=`
vec3 fieldColour(vec3 P,vec4 m,float r){
 float lit=clamp(dot(normalAt(P.xz),uSunDir)*.6+.32,0.,1.);
 vec3 c=paint3(vec3(.94,.72,.26),vec3(.76,.54,.17),vec3(.46,.40,.23),lit,r);
 c=mix(c,vec3(.90,.77,.39),m.b*.3);
 c=mix(c,paint3(vec3(.63,.68,.39),vec3(.36,.48,.34),vec3(.12,.28,.26),lit,r),m.g*.85*(1.-m.r));
 c=mix(c,paint3(vec3(.96,.88,.63),vec3(.80,.73,.49),vec3(.48,.48,.34),lit,r),m.r);
 return c*mix(.71,1.,woodSunAt(P));
}`;
export async function createLand(shared){
 shared.uExtent.value=EXTENT;
 const th=new THREE.DataTexture(heights,N,N,THREE.RedFormat,THREE.FloatType),tm=new THREE.DataTexture(map,N,N);
 for(const t of [th,tm]){t.minFilter=t.magFilter=THREE.LinearFilter;t.needsUpdate=true;}
 shared.tHeight.value=th;shared.tLand.value=tm;
 const geo=new THREE.PlaneGeometry(512,512,384,384);geo.rotateX(-Math.PI/2);const p=geo.attributes.position;
 for(let i=0;i<p.count;i++)p.setY(i,heightAt(p.getX(i),p.getZ(i))-.02);
 const mesh=new THREE.Mesh(geo,new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,uniforms:shared,
 vertexShader:`${COMMON}\nout vec3 P;void main(){P=position;gl_Position=projectionMatrix*viewMatrix*vec4(P,1.);}`,
 fragmentShader:`${COMMON}\n${FIELD}\nin vec3 P;out vec4 color;void main(){color=vec4(hazed(fieldColour(P,texture(tLand,landUv(P.xz)),texture(tNoise,P.xz/9.).r),P),1.);}`}));
 const floor=groundRings(shared,{head:FIELD,per:2,n:112,cell0:.48,levels:5,minPx:[1,2],maxPx:[4000,4000],cells:[0,8],body:`
 void makeDab(inout Dab d){vec2 cell;float sub;if(!ringCell(29.,true,cell,sub)){d.alive=0.;return;}
 vec4 r=hash4(cell,sub*7.+9.);vec2 xz=(cell+r.xy)*uCell0;float lod;d.alive=ringGrow(distance(xz,cameraPosition.xz),lod);
 if(max(abs(xz.x),abs(xz.y))>254.){d.alive=0.;return;}
 vec3 P=vec3(xz.x,heightAt(xz),xz.y);vec4 m=texture(tLand,landUv(xz));vec3 c=jitter(fieldColour(P,m,r.z),r.yzw,.16);
 float a=.35*sin(xz.x/31.)+.25*sin(xz.y/40.);
 d.pos=P;d.dir=normalize(mix(vec3(cos(a),0.,sin(a)),vec3(.35*cos(xz.y/34.)+.045,0.,1.),m.r));
 d.size=vec2(.29+r.z*.23,1.2+r.w*.9)*lod;
 d.c1=hazed(c,P);d.c2=hazed(c*1.08,P);d.lie=1.;d.nrm=normalAt(xz);d.height=.015;d.glaze=1.;d.seed=dot(cell,vec2(1.,57.))+sub;
 }`});
 // Bend the actual brush mesh along the heightfield. A single rigid quad at a
 // distant LOD otherwise bridges hollows and sticks out from house aprons.
 const brushPatch=new THREE.PlaneGeometry(2,2,2,6);
 const brushGeo=floor.group.children[0].geometry;
 brushGeo.setAttribute('position',brushPatch.attributes.position);
 brushGeo.setIndex(brushPatch.index);
 for(const mesh of floor.group.children){
  mesh.material.vertexShader=mesh.material.vertexShader.replace(
   'vc.xyz += a * position.y + b * position.x;',
   'world.y=heightAt(world.xz)+.035; vc=viewMatrix*vec4(world,1.); if(d.glaze>.5)vGlaze=vec4((uFigShadeMat*vec4(world,1.)).xyz,1.);');
 }
 function heightField(cells=384,half=192){const out=new Float32Array((cells+1)**2);for(let col=0;col<=cells;col++)for(let row=0;row<=cells;row++)out[row+col*(cells+1)]=heightAt(-half+col/cells*2*half,-half+row/cells*2*half);return {heights:out,cells,half};}
 return {mesh,floor,heightField};
}
