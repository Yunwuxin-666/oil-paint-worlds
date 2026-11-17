// Tests the GPU's real depth against Rapier, not just two copies of heightAt.
// Especially covers the village side and road shoulders missed by route tests.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright-core';
import {guard} from './no-pointer-lock.mjs';
guard(chromium);mkdirSync('shots/terrain-contact',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME,headless:true,args:['--mute-audio','--ignore-gpu-blocklist','--use-angle=d3d11','--enable-gpu']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],proof=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 for(const scene of ['village','alpine','autumn','aurora']){
  await page.goto(`${process.env.WORLD_URL??'http://127.0.0.1:5405/'}?scene=${scene}&nopad`);await page.waitForFunction(()=>window.lab?.ready,null,{timeout:180000});
  await page.evaluate(()=>lab.renderer.setAnimationLoop(null));
  const result=await page.evaluate(()=>{
   const L=lab,T=L.THREE,R=L.player.R,results=[];
   const target=new T.WebGLRenderTarget(1,1,{type:T.FloatType,format:T.RGBAFormat,depthBuffer:false});
   const U={depth:{value:L.frame.target.depthTexture},uv:{value:new T.Vector2(.5,.5)},inv:{value:new T.Matrix4()}};
   const material=new T.ShaderMaterial({glslVersion:T.GLSL3,uniforms:U,depthTest:false,depthWrite:false,
    vertexShader:'void main(){gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader:'uniform sampler2D depth;uniform vec2 uv;uniform mat4 inv;out vec4 color;void main(){float d=texture(depth,uv).x;vec4 p=inv*vec4(uv*2.-1.,d*2.-1.,1.);color=vec4(p.y/p.w,d,0.,1.);}'});
   const flat=new T.Scene();flat.add(new T.Mesh(new T.PlaneGeometry(2,2),material));const pixels=new Float32Array(4);
   for(const route of L.travel.walking.routes){
    const b=route.boundary;let maxPhysics=0,maxVisibleAbove=0,count=0,decorations=0;
    for(const progress of [-25,-5,5,15,30,48,64,95])for(const across of [-95,-62,-27,0,27,62,95]){
     const s=b.sEnd+b.sign*progress,u=b.path(s)+across;if(Math.abs(u)>106)continue;
     const p=b.point(u,s,b.height(u,s));
     L.teleport(p.x,p.z,p.x+b.axis.x,p.z+b.axis.z);L.input.keys.clear();L.step(1/60,2);
     const ray=new R.Ray({x:p.x,y:p.y+90,z:p.z},{x:0,y:-1,z:0});
     const hit=L.physics.castRay(ray,150,true,undefined,undefined,L.player.collider,undefined,c=>c.handle===b.groundCollider.handle);
     if(!hit)throw new Error(`missing collision: ${b.spec.id} ${progress}/${across}`);
     const physical=p.y+90-hit.timeOfImpact;maxPhysics=Math.max(maxPhysics,Math.abs(physical-p.y));
     // A top-down rendering makes any old terrain over the capsule measurable.
     L.camera.up.set(0,0,-1);L.view([p.x,p.y+80,p.z],[p.x,p.y,p.z]);L.step(1/60);
     for(const o of [L.figure.man?.object,L.player.man.object,L.figure.cloakMesh,L.figure.dabs].filter(Boolean))o.visible=false;
     const strokes=[];L.scene.traverse(o=>{if(o.geometry?.isInstancedBufferGeometry&&o.visible){strokes.push(o);o.visible=false;}});
     L.travel.walking.prepareRender(L.renderer,L.camera);L.frame.render(L.scene,L.camera);
     U.inv.value.multiplyMatrices(L.camera.projectionMatrix,L.camera.matrixWorldInverse).invert();
     L.renderer.setRenderTarget(target);L.renderer.clear();L.renderer.render(flat,new T.Camera());L.renderer.readRenderTargetPixels(target,0,0,1,1,pixels);L.renderer.setRenderTarget(null);
     for(const o of strokes)o.visible=true;
     // Trees/rocks really above the sample are legitimate. Identify them with
     // a ray against the new underpainting, independently of the GPU depth.
     const under=b.group.children.find(o=>o.children.some(c=>c.geometry?.attributes?.aPal))?.children.find(o=>o.geometry?.attributes?.aPal);
     const rc=new T.Raycaster(new T.Vector3(p.x,p.y+90,p.z),new T.Vector3(0,-1,0));
     const objects=under?rc.intersectObject(under,false):[];
     const obstruction=objects[0]?.point.y??p.y;
     if(obstruction>p.y+1.2){decorations++;continue;}
     const above=pixels[0]-physical;maxVisibleAbove=Math.max(maxVisibleAbove,above);count++;
     if(above>1.25)throw new Error(`visible terrain ${above.toFixed(2)}m above collision: ${b.spec.id} ${progress}/${across}, GPU=${pixels[0]}, collision=${physical}`);
     if(above<-.25)throw new Error(`missing visible terrain: ${b.spec.id} ${progress}/${across}, delta=${above}`);
    }
    results.push({id:b.spec.id,count,decorations,maxPhysics,maxVisibleAbove});
   }
   L.view();L.camera.up.set(0,1,0);target.dispose();material.dispose();return results;
  });
  for(const r of result){assert(r.maxPhysics<.004,JSON.stringify(r));assert(r.count>15,JSON.stringify(r));}
  proof.push({scene,result});console.log('CONTACT',scene,JSON.stringify(result));
  // Screenshot of the previously broken village entrance at mid-transition.
  if(scene==='village'){
   const shoulders=await page.evaluate(()=>{
    const L=lab,b=L.travel.walking.routes.find(r=>r.to==='alpine').boundary,s=b.sEnd+b.sign*18,results=[],render=L.renderer.render;L.renderer.render=()=>{};
    for(const us of [[-116,-112,-108,-104,-100],[100,104,108,112,116]]){
     const start=b.point(us[0],s),next=b.point(us[1],s);L.teleport(start.x,start.z,next.x,next.z);L.input.keys.add('KeyW');let frames=0,maxBurial=0;
     for(const u of us.slice(1)){
      const target=b.point(u,s);let f=0;
      for(;f<1000;f++){const dx=target.x-L.player.feet.x,dz=target.z-L.player.feet.z;if(Math.hypot(dx,dz)<.45)break;L.follow.yaw=Math.atan2(dx,dz);L.step(1/60);maxBurial=Math.max(maxBurial,L.heightAt(L.player.feet.x,L.player.feet.z)-L.player.feet.y);frames++;}
      if(f===1000)throw new Error(`side seam blocked at ${u}`);
     }
     L.input.keys.clear();results.push({us,frames,maxBurial});
    }L.renderer.render=render;return results;
   });
   for(const edge of shoulders)assert(edge.maxBurial<.15,JSON.stringify(edge));console.log('SIDE WALK',JSON.stringify(shoulders));
   await page.evaluate(()=>{const b=lab.travel.walking.routes.find(r=>r.to==='alpine').boundary,s=b.sEnd+b.sign*28,p=b.point(b.path(s),s);for(const o of [lab.player.man.object,lab.figure.cloakMesh,lab.figure.dabs])o.visible=true;lab.view();lab.teleport(p.x,p.z,p.x+b.axis.x*b.sign,p.z+b.axis.z*b.sign);lab.step(1/60,20)});
   await page.screenshot({path:'shots/terrain-contact/village-golden-fixed.png'});
  }
 }
 assert.deepEqual(errors,[]);writeFileSync('shots/terrain-contact/proof.json',JSON.stringify({proof,errors},null,2));
 console.log('PASS actual GPU depth / physical triangle agreement across eight entrances and both shoulders; no shader errors');
}finally{await browser.close()}
