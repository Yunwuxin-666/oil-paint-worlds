import * as THREE from 'three';

// Cut a geographic footprint out of the ORIGINAL world, at its actual fragment
// position. No screen-door fade and no second visible ground above the collider.
export function stitchRegion(roots,boundaries,camera){
 const frames=boundaries.map(b=>new THREE.Vector4(b.origin.x,b.origin.z,b.axis.x,b.axis.z));
 const ends=boundaries.map(b=>new THREE.Vector2(b.sEnd,b.sign));
 const inv={value:new THREE.Matrix4()},viewport={value:new THREE.Vector2(1,1)},atmosphere={value:0},pass={value:0};
 const materials=new Set(),skies=[];
 function visit(o,inSky=false){
  const sky=inSky||o.userData.boundarySky||(o.geometry?.type==='SphereGeometry'&&o.geometry.parameters.radius>=800);
  if(sky)skies.push(o);
  for(const m of [o.material].flat().filter(Boolean)){
   if(materials.has(m))continue;materials.add(m);
   const previous=m.onBeforeCompile.bind(m),key=m.customProgramCacheKey.bind(m);
   const skyMarks=sky&&m.transparent;
   m.onBeforeCompile=(shader,renderer)=>{
    previous(shader,renderer);
    Object.assign(shader.uniforms,{uStitchInv:inv,uStitchViewport:viewport,uStitchFrames:{value:frames},uStitchEnds:{value:ends},uStitchAtmosphere:atmosphere,uStitchPass:pass});
    const header=`uniform mat4 uStitchInv;uniform vec2 uStitchViewport;uniform vec4 uStitchFrames[2];uniform vec2 uStitchEnds[2];uniform float uStitchAtmosphere;uniform float uStitchPass;\n`;
    shader.fragmentShader=header+shader.fragmentShader;
    if(!sky){
     shader.fragmentShader=shader.fragmentShader.replace(/void\s+main\s*\(\s*\)\s*\{/,
      `void main(){vec4 stitchH=uStitchInv*vec4(gl_FragCoord.xy/uStitchViewport*2.-1.,gl_FragCoord.z*2.-1.,1.);vec2 stitchP=stitchH.xz/stitchH.w;
      for(int i=0;i<2;i++){vec4 f=uStitchFrames[i];vec2 q=stitchP-f.xy;float s=dot(q,f.zw),u=dot(q,vec2(f.w,-f.z));if(abs(u)<110.&&abs(s)<168.&&uStitchEnds[i].y*(s-uStitchEnds[i].x)>-40.)discard;}`);
    }else{
     const output=shader.fragmentShader.match(/\bout\s+(?:highp\s+)?vec4\s+(\w+)\s*;/)?.[1];
     if(output){
      const last=shader.fragmentShader.lastIndexOf('}');
      const finish=skyMarks?`${output}.a*=1.-uStitchAtmosphere;`:`vec4 sh=uStitchInv*vec4(gl_FragCoord.xy/uStitchViewport*2.-1.,.999,1.);vec3 sd=normalize(sh.xyz/sh.w-cameraPosition);float st=smoothstep(-.12,.8,sd.y);vec3 sc=mix(vec3(.86,.82,.67),vec3(.46,.64,.76),st);sc=mix(sc,mix(vec3(.60,.64,.67),vec3(.19,.30,.43),st),uStitchPass*.45);${output}.rgb=mix(${output}.rgb,sc,uStitchAtmosphere);`;
      shader.fragmentShader=shader.fragmentShader.slice(0,last)+finish+shader.fragmentShader.slice(last);
     }
    }
   };
   m.customProgramCacheKey=()=>key()+`-geographic-stitch-v2-${sky}`;m.needsUpdate=true;
  }
  for(const child of o.children)visit(child,sky);
 }
 roots.forEach(o=>visit(o));
 return {update(blend,isPass=false){
  camera.updateMatrixWorld(true);inv.value.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).invert();
  viewport.value.set(camera.userData.stitchWidth??1,camera.userData.stitchHeight??1);atmosphere.value=blend;pass.value=isPass?1:0;
 },setViewport(width,height){viewport.value.set(width,height);camera.userData.stitchWidth=width;camera.userData.stitchHeight=height;},materials,skies};
}
