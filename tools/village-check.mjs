import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { guard } from './no-pointer-lock.mjs';
guard(chromium);
const browser=await chromium.launch({executablePath:process.env.CHROME,headless:true,args:['--mute-audio','--ignore-gpu-blocklist','--use-angle=d3d11','--enable-gpu']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:5405/?scene=village&nopad');
 await page.waitForFunction(()=>window.lab?.ready,null,{timeout:120000});
 await page.evaluate(()=>{lab.renderer.setAnimationLoop(null);lab.step(1/60,60);});
 await page.screenshot({path:'shots/village-default.png'});
 console.log('READY',await page.evaluate(()=>({counts:lab.counts,buildings:lab.props.grounding.length,trees:lab.props.trees.length,colliders:lab.props.solids.length})));
 assert.deepEqual(errors,[]);
 const terrain=await page.evaluate(()=>{
  const road=z=>12*Math.sin(z/34)+z*.045;let maxGrade=0;
  for(let z=-60;z<82;z+=.5)maxGrade=Math.max(maxGrade,Math.abs(lab.heightAt(road(z+.5),z+.5)-lab.heightAt(road(z),z))/Math.hypot(road(z+.5)-road(z),.5));
  const floors=lab.props.grounding.map(h=>h.floor);
  return {houseRelief:Math.max(...floors)-Math.min(...floors),roadSlope:Math.atan(maxGrade)*180/Math.PI};
 });
 assert(terrain.houseRelief>10,'the village must retain visible elevation differences');
 assert(terrain.roadSlope<28,'the walking route must not contain steep apron steps');
 console.log('TERRAIN',terrain);
 const contacts=await page.evaluate(()=>{
  const fail=[],ray=new lab.THREE.Raycaster();lab.props.paint.under.updateMatrixWorld(true);
  for(const f of lab.props.grounding)for(const axis of ['x','z'])for(const sign of [-1,1])for(const t of [-.7,0,.7]){
   const x=f.x+(axis==='x'?sign*f.w/2:t*f.w/2),z=f.z+(axis==='z'?sign*f.d/2:t*f.d/2),y=lab.heightAt(x,z)+.03;
   const dir=new lab.THREE.Vector3(axis==='x'?-sign:0,0,axis==='z'?-sign:0);ray.set(new lab.THREE.Vector3(x,y,z).addScaledVector(dir,-.25),dir);ray.far=.55;
   if(!ray.intersectObject(lab.props.paint.under).length)fail.push({x,z});
  }return fail;
 });assert.deepEqual(contacts,[],'all foundations meet terrain');
 async function walk(x,z){const r=await page.evaluate(([x,z])=>{
  let frames=0;for(;frames<2200;frames++){const dx=x-lab.player.feet.x,dz=z-lab.player.feet.z,d=Math.hypot(dx,dz);if(d<.55)break;lab.follow.yaw=Math.atan2(dx,dz);lab.input.keys.add('KeyW');lab.step(1/60);}
  lab.input.keys.clear();lab.step(1/60,8);return {distance:Math.hypot(x-lab.player.feet.x,z-lab.player.feet.z),frames,at:lab.player.feet.toArray()};
 },[x,z]);assert(r.distance<1.0,JSON.stringify({target:[x,z],...r}));console.log('walk',x,z,r.frames);}
 const road=z=>12*Math.sin(z/34)+z*.045;
 const targets=await page.evaluate(()=>lab.game.targets);
 for(const id of ['wheat','cypress','ridge']){
  const t=targets.find(t=>t.id===id),start=await page.evaluate(()=>lab.player.feet.z);
  for(let z=start-5;z>t.z;z-=5)await walk(road(z),z);
  await walk(t.x,t.z+1.7);assert(await page.evaluate(()=>lab.game.interact()));
 }
 const e=targets.find(t=>t.id==='easel');
 for(let z=-50;z<e.z;z+=6)await walk(road(z),z);
 await walk(e.x,e.z+1.8);assert(await page.evaluate(()=>lab.game.interact()));assert(await page.evaluate(()=>lab.game.state.complete));
 await page.evaluate(()=>{const e=lab.game.targets.find(t=>t.id==='easel'),y=lab.heightAt(e.x,e.z);lab.view([e.x+2.5,y+2.3,e.z+4],[e.x,y+1.25,e.z]);lab.step(1/60,2);});
 await page.screenshot({path:'shots/village-finished-painting.png'});
 await page.evaluate(()=>{lab.view([35,46,105],[-4,10,-18]);lab.step(1/60,2);});await page.screenshot({path:'shots/village-panorama.png'});
 await page.evaluate(()=>{lab.game.reset();lab.step(1/60,40);});assert.equal(await page.evaluate(()=>lab.game.state.colors.length),0);
 await page.setViewportSize({width:640,height:960});await page.waitForFunction(()=>lab.renderer.domElement.width===640);await page.evaluate(()=>lab.step(1/60,5));await page.screenshot({path:'shots/village-portrait.png'});
 assert.deepEqual(errors,[]);console.log('PASS 180 foundation contacts, physical traversal, three colors, painting, reset, portrait, no shader errors');
}finally{await browser.close();}
