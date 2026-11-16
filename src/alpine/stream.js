import * as THREE from 'three';
import { COMMON } from '../oilpaint/common.js';
import { dabGeometry,dabMaterial,dabMesh } from '../oilpaint/dabs.js';
import { heightAt,hydroAt } from './land.js';
import { riverX,riverLevel,riverHalfWidth,sideChannelX,sideHalfWidth,gravelHalfWidth,riverObstacles,SEED } from './config.js';
import { rng } from '../world/noise.js';

// Clip each triangle against signed hydraulic depth. No rectangular water sheet exists.
function wetGeometry(){
 const pos=[],sample=(x,z)=>{const h=hydroAt(x,z);return {x,z,y:h.level,d:h.depth-.003};};
 const tri=(vertices)=>{
  const polygon=[];
  for(let i=0;i<3;i++){
   const a=vertices[i],b=vertices[(i+1)%3];
   if(a.d>=0)polygon.push(a);
   if((a.d>=0)!==(b.d>=0)){const t=a.d/(a.d-b.d);polygon.push({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,z:a.z+(b.z-a.z)*t,d:0});}
  }
  for(let i=1;i<polygon.length-1;i++)for(const p of [polygon[0],polygon[i],polygon[i+1]])pos.push(p.x,p.y,p.z);
 };
 const step=.5,n=56,z0=-230,z1=230;
 let previous=Array.from({length:n+1},(_,i)=>sample(riverX(z0)-12+i*step,z0));
 for(let z=z0+step;z<=z1;z+=step){
  const row=Array.from({length:n+1},(_,i)=>sample(riverX(z)-12+i*step,z));
  for(let i=0;i<n;i++){tri([previous[i],row[i],previous[i+1]]);tri([previous[i+1],row[i],row[i+1]]);}previous=row;
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();g.computeBoundingSphere();return g;
}
const HYDRO='uniform sampler2D tHydro;';
export function createStream(shared,trail){
 const group=new THREE.Group(),random=rng(SEED+241),uniforms={...shared,uTrail:{value:trail},uRiverRocks:{value:riverObstacles.map(r=>new THREE.Vector4(r.x,r.z,r.r,0))}};
 const surface=new THREE.Mesh(wetGeometry(),new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,uniforms,side:THREE.DoubleSide,transparent:true,depthWrite:false,
 vertexShader:`${COMMON}\n${HYDRO}\nout vec3 P;void main(){P=position;vec4 h=texture(tHydro,landUv(P.xz));float speed=length(h.ba);P.y+=smoothstep(0.,.22,h.g)*.012*sin(P.z*1.7+uTime*speed*2.8+P.x*.8);gl_Position=projectionMatrix*viewMatrix*vec4(P,1.);}`,
 fragmentShader:`${COMMON}\n${HYDRO}\nuniform sampler2D tGravelPaint;uniform vec4 uTrail[16];uniform vec4 uRiverRocks[8];in vec3 P;out vec4 color;
 void main(){vec4 h=texture(tHydro,landUv(P.xz));float depth=h.g;if(depth<.002)discard;
 vec2 flow=h.ba;float speed=length(flow);vec2 advected=P.xz-flow*uTime;
 float band=texture(tNoise,advected/vec2(4.,9.)).g;
 vec3 bed=texture(tGravelPaint,P.xz/8.).rgb*.74;
 vec3 c=mix(bed,vec3(.22,.43,.45),smoothstep(.03,.65,depth)*.80);
 c=mix(c,vec3(.57,.70,.67),smoothstep(.55,.77,band)*.16);
 float foam=0.;
 for(int i=0;i<8;i++){vec3 rock=uRiverRocks[i].xyz;vec2 offset=P.xz-rock.xy;float downstream=-offset.y;float shoulder=rock.z*.8+downstream*.18;float arm=exp(-pow((abs(offset.x)-shoulder)*7.,2.));float wake=arm*smoothstep(0.,.3,downstream)*(1.-smoothstep(rock.z,rock.z*6.,downstream));foam+=wake*(.5+.5*sin(downstream*7.+uTime*speed*8.));}
 float wake=0.;for(int i=0;i<16;i++){float age=uTime-uTrail[i].z,dist=length(P.xz-uTrail[i].xy-flow*max(age,0.)*.3);wake+=exp(-pow((dist-age*.8)*12.,2.))*exp(-age*1.6)*step(0.,age)*step(age,2.5)*uTrail[i].w;}
 c=mix(c,vec3(.84,.87,.79),clamp(foam*.55+wake*.7,0.,.85));
 float alpha=smoothstep(.002,.13,depth)*mix(.32,.88,smoothstep(.03,.5,depth));
 color=vec4(hazed(c,P),alpha);}`
 }));surface.name='river-clipped-wet-surface';surface.renderOrder=5;group.add(surface);

 // Integrate brush particles through the shared velocity field (including stone deflection).
 const count=2300,positions=new Float32Array(count*4),flows=new Float32Array(count*4),particles=[];
 function spawn(p){for(let k=0;k<12;k++){p.z=-215+random()*430;const side=random()<.2;p.x=(side?sideChannelX(p.z):riverX(p.z))+(random()-.5)*(side?sideHalfWidth(p.z):riverHalfWidth(p.z))*1.3;if(hydroAt(p.x,p.z).depth>.08)return;}}
 for(let i=0;i<count;i++){const p={x:0,z:0,seed:random(),width:.09+random()*.22};spawn(p);particles.push(p);}
 const strokeGeometry=dabGeometry(count,{aWater:[positions,4],aFlow:[flows,4]},true);
 const strokeMaterial=dabMaterial(uniforms,{head:`${HYDRO}\nin vec4 aWater;in vec4 aFlow;out vec2 vWaterXZ;`,minPx:[0,0],maxPx:[220,450],depthWrite:false,cells:[0,8],body:`
 void makeDab(inout Dab d){if(aWater.w<.04){d.alive=0.;return;}vec4 r=hash4(aFlow.z*999.);vec3 P=aWater.xyz;
 float slope=(texture(tHydro,landUv(P.xz+vec2(0.,.25))).r-texture(tHydro,landUv(P.xz-vec2(0.,.25))).r)*2.;
 vec3 c=r.x<.10?vec3(.79,.83,.75):r.x<.50?vec3(.49,.64,.61):vec3(.27,.47,.48);
 d.pos=P;d.dir=normalize(vec3(aFlow.x,aFlow.y*slope,aFlow.y));d.size=vec2(aFlow.w,.32+r.z*.85)*smoothstep(.025,.20,aWater.w);d.c1=hazed(c,P);d.c2=hazed(c*1.06,P);d.lie=1.;d.nrm=normalize(vec3(0.,1.,-slope));d.height=.014;d.seed=aFlow.z*999.;d.lift=0.;}`});
 strokeMaterial.vertexShader=strokeMaterial.vertexShader.replace('vc.xyz += a * position.y + b * position.x;','world.y=texture(tHydro,landUv(world.xz)).r+.022;vWaterXZ=world.xz;vc=viewMatrix*vec4(world,1.);');
 strokeMaterial.fragmentShader=strokeMaterial.fragmentShader.replace('in vec2 vUv;',`${HYDRO}\nin vec2 vWaterXZ;in vec2 vUv;`).replace('vec4 t = texture(tBrush, vUv);','float waterDepth=texture(tHydro,landUv(vWaterXZ)).g;if(waterDepth<.015)discard;vec4 t = texture(tBrush, vUv);').replace('outC = vec4(col, smoothstep(0.3, 0.62, t.g));','outC = vec4(col, smoothstep(0.3, 0.62, t.g)*smoothstep(.015,.18,waterDepth)*.58);');
 strokeMaterial.transparent=true;strokeMaterial.alphaToCoverage=false;
 const strokes=dabMesh(strokeGeometry,strokeMaterial,6);group.add(strokes);
 function update(time,dt){
  for(let i=0;i<count;i++){const p=particles[i];let h=hydroAt(p.x,p.z);p.x+=h.vx*Math.min(dt,.04);p.z+=h.vz*Math.min(dt,.04);h=hydroAt(p.x,p.z);if(h.depth<.05||p.z< -220){spawn(p);h=hydroAt(p.x,p.z);}positions.set([p.x,h.level,p.z,h.depth],i*4);flows.set([h.vx,h.vz,p.seed,p.width],i*4);}
  strokeGeometry.attributes.aWater.needsUpdate=true;strokeGeometry.attributes.aFlow.needsUpdate=true;
 }
 update(0,0);
 const rocks=[];
 for(let i=0;i<7200;i++){const z=-150+random()*265,x=riverX(z)+(random()-.5)*gravelHalfWidth(z)*2;if(Math.abs(z+16)<2.2)continue;const y=heightAt(x,z),radius=.035+Math.pow(random(),2)*.23;if(y>riverLevel(z)+.75)continue;rocks.push({x,y,z,r:radius,kind:random(),angle:random()*6.28});}
 const rockGeo=new THREE.IcosahedronGeometry(1,0);
 const rockMat=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,uniforms:shared,
 vertexShader:`${COMMON}\nout vec3 P;out vec3 N;out vec3 tint;void main(){vec4 p=instanceMatrix*vec4(position,1.);P=p.xyz;N=normalize(mat3(instanceMatrix)*normal);tint=instanceColor;gl_Position=projectionMatrix*viewMatrix*p;}`,
 fragmentShader:`${COMMON}\n${HYDRO}\nin vec3 P;in vec3 N;in vec3 tint;out vec4 color;void main(){float lit=floor(clamp(dot(normalize(N),uSunDir)*.5+.5,0.,.99)*3.)/3.;vec3 c=tint*(.72+lit*.45);float wet=1.-smoothstep(.02,.18,P.y-texture(tHydro,landUv(P.xz)).r);c*=1.-wet*.24;color=vec4(hazed(c,P),1.);}`});
 const pebbles=new THREE.InstancedMesh(rockGeo,rockMat,rocks.length),m=new THREE.Matrix4(),q=new THREE.Quaternion(),palette=[[.68,.65,.60],[.50,.53,.62],[.74,.66,.51],[.81,.81,.74],[.40,.42,.43]];
 rocks.forEach((r,i)=>{q.setFromEuler(new THREE.Euler(.1*r.kind,r.angle,.15*r.kind));m.compose(new THREE.Vector3(r.x,r.y+r.r*.25,r.z),q,new THREE.Vector3(r.r,r.r*.55,r.r*.76));pebbles.setMatrixAt(i,m);pebbles.setColorAt(i,new THREE.Color(...palette[Math.floor(r.kind*5)]));});pebbles.instanceMatrix.needsUpdate=true;pebbles.instanceColor.needsUpdate=true;group.add(pebbles);
 return {group,surface,strokes,pebbles,rockCount:rocks.length,update,hydroAt,particles};
}
