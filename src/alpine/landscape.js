import * as THREE from 'three';
import { createForest } from './forest.js';
import { createMountains } from './mountains.js';
export async function createLandscape(shared){
 const group=new THREE.Group();
 const sky=new THREE.Mesh(new THREE.SphereGeometry(8000,40,24),new THREE.ShaderMaterial({
  glslVersion:THREE.GLSL3,side:THREE.BackSide,depthWrite:false,
  vertexShader:'out vec3 D;void main(){D=position;gl_Position=projectionMatrix*viewMatrix*vec4(position,1.);}',
  fragmentShader:'in vec3 D;out vec4 color;void main(){float h=clamp(normalize(D).y*1.7,0.,1.);color=vec4(mix(vec3(.59,.72,.78),vec3(.30,.51,.72),h),1.);}'
 }));sky.renderOrder=-10;group.add(sky);
 const mountains=createMountains(shared);group.add(mountains.group);
 const forest=createForest(shared);group.add(forest.group);
 return {group,colliders:forest.colliders,forest,mountains,counts:{...forest.counts,mountainVertices:mountains.surface.geometry.attributes.position.count,mountainStrokes:mountains.strokeCount}};
}
