import * as THREE from 'three';
import {COMMON} from '../oilpaint/common.js';
import {kit} from './paint.js';
import {heightAt} from './land.js';
import {rng,noise} from '../world/noise.js';
import {SEED,roadX} from './config.js';

// Uniformly split shared edges before warping. Adaptive per-face subdivision
// makes T-junctions that open into cracks when a formerly flat face is bent.
function stoneSubdivide(input){
 let geo=input.index?input.toNonIndexed():input.clone();
 for(let pass=0;pass<2;pass++){
  const src=geo.attributes.position.array,out=new Float32Array(src.length*4);let n=0;
  const emit=(p)=>{out[n++]=p[0];out[n++]=p[1];out[n++]=p[2]};
  for(let i=0;i<src.length;i+=9){
   const a=[src[i],src[i+1],src[i+2]],b=[src[i+3],src[i+4],src[i+5]],c=[src[i+6],src[i+7],src[i+8]];
   const ab=a.map((v,k)=>(v+b[k])*.5),bc=b.map((v,k)=>(v+c[k])*.5),ca=c.map((v,k)=>(v+a[k])*.5);
   for(const p of [a,ab,ca,ab,b,bc,ca,bc,c,ab,bc,ca])emit(p);
  }
  geo.dispose();geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(out,3));
 }return geo;
}

export async function createLandscape(shared){
 const group=new THREE.Group(),shade=new THREE.Scene(),geometries=[],random=rng(SEED),b=kit(shared),depth=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
 function solid(geo,pal,stroke=[1.0,3.2],density=.8){
  geo.computeVertexNormals();b.add(geo,new THREE.Matrix4(),pal,{stroke,density,free:true,smooth:true,grain:new THREE.Vector3(1,.18,.15)});
  geometries.push(geo);shade.add(new THREE.Mesh(geo,depth));const source=new THREE.Mesh(geo,depth);source.visible=false;source.name='solid-source-geometry';group.add(source);
 }
 function arch(cx,z,scale,depthSize){
  // Closed stone band with an OPEN passage down to the ground. Extruded all
  // the way through: front, back, inner vault, outer roof and both abutments.
  const s=new THREE.Shape();
  s.moveTo(-52,-6);s.bezierCurveTo(-54,18,-48,41,-33,51);s.bezierCurveTo(-21,60,-12,57,1,55);s.bezierCurveTo(13,53,24,57,34,67);s.bezierCurveTo(43,75,54,75,59,72);s.lineTo(58,-6);s.lineTo(25,-6);
  s.bezierCurveTo(25,9,24,22,16,31);s.bezierCurveTo(8,39,-3,41,-14,35);s.bezierCurveTo(-24,29,-28,17,-29,-6);s.closePath();
  const outline=new THREE.ExtrudeGeometry(s,{depth:depthSize/scale,steps:5,curveSegments:38,bevelEnabled:true,bevelSegments:2,bevelSize:1.1,bevelThickness:1.2});
  const geo=stoneSubdivide(outline);outline.dispose();
  const p=geo.attributes.position,base=Math.min(heightAt(cx-35*scale,z),heightAt(cx+36*scale,z))-1.8;
  for(let i=0;i<p.count;i++){
   const x=p.getX(i)*scale,y=p.getY(i)*scale,d=p.getZ(i)*scale;
   const ripple=(Math.sin(y*.74+Math.sin(x*.095)*.8)*.28+noise(x/12,d/9)*.5)*scale;
   const fold=(5.2*Math.sin(x*.065+y*.041)+2.4*Math.sin(y*.15+x*.028))*scale;
   p.setXYZ(i,cx+x+ripple,base+y+noise(x/13,d/8)*.32*scale,z+d+fold+Math.sin(y*.17+x*.07)*.7*scale+ripple*.5);
  }
  solid(geo,'rock',[1.4*scale+.25,4.8*scale+.5],.90);
  return {cx,z,scale,base,geometry:geo,span:110*scale,height:76*scale};
 }
 const great=arch(0,-36,1,16),rear=arch(-10,-117,.53,9);
 // Layered canyon masses continue the arch's feet. Their exact surface meshes
 // are also used as colliders, including overhangs and walkable ledges.
 for(const side of [-1,1])for(let j=0;j<6;j++){
  const x=side*(59+random()*10),z=5-j*34,y=heightAt(x,z),sx=23+random()*13,sy=side>0?32+random()*15:22+random()*11,sz=25+random()*10;
  const geo=new THREE.SphereGeometry(1,20,15),p=geo.attributes.position;
  for(let i=0;i<p.count;i++){
   const px=p.getX(i),py=p.getY(i),pz=p.getZ(i),r=.93+.10*noise(px*4+j,py*4+pz*2)+.025*Math.sin(py*sy*.9);
   p.setXYZ(i,x+px*sx*r,y+py*sy+sy*.45,z+pz*sz*r+py*2.5);
  }
  solid(geo,j>3&&side<0?'pale':'rock',[1.7,4.7],.9);
 }
 // Fallen blocks sit on a sampled foundation; none lie in the central passage.
 for(let i=0;i<76;i++){
  const z=-145+random()*235,x=roadX(z)+(random()<.5?-1:1)*(4+random()**1.6*33),r=.38+random()**2*3.0,y=heightAt(x,z);
  const geo=new THREE.DodecahedronGeometry(1,0),m=new THREE.Matrix4().compose(new THREE.Vector3(x,y+r*.30,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(.2,random()*6,.16)),new THREE.Vector3(r,r*.68,r*.8));geo.applyMatrix4(m);solid(geo,i%4?'rock':'pale',[.4,1.2],.8);
 }
 const painted=b.build();group.add(painted.group);
 const sky=new THREE.Mesh(new THREE.SphereGeometry(1800,28,18),new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,uniforms:shared,side:THREE.BackSide,depthWrite:false,depthTest:false,
  vertexShader:'out vec3 D;void main(){D=position;gl_Position=projectionMatrix*viewMatrix*vec4(position+cameraPosition,1.);}',
  fragmentShader:`${COMMON}\nin vec3 D;out vec4 color;void main(){vec3 n=normalize(D);vec3 c=mix(vec3(.26,.66,.84),vec3(.035,.31,.66),smoothstep(-.05,.8,n.y));float sweep=texture(tNoise,vec2(atan(n.z,n.x),n.y*2.)*2.).r;c+=(sweep-.5)*.035;color=vec4(c,1.);}`}));
 sky.renderOrder=-10;sky.frustumCulled=false;sky.userData.boundarySky=true;group.add(sky);
 return {group,shade,depth,geometries,arches:[great,rear],colliders:[],counts:{archTriangles:great.geometry.attributes.position.count/3,rockBodies:geometries.length,rockStrokes:painted.count},
  addPhysics(physics,R){for(const g of geometries){const idx=g.index?new Uint32Array(g.index.array):Uint32Array.from({length:g.attributes.position.count},(_,i)=>i);physics.createCollider(R.ColliderDesc.trimesh(new Float32Array(g.attributes.position.array),idx));}},
  releaseShade(){shade.clear();depth.dispose();},
 };
}
