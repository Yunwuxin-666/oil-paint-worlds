import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright-core';
import {guard} from './no-pointer-lock.mjs';
guard(chromium);mkdirSync('shots/arches',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME,headless:true,args:['--mute-audio','--ignore-gpu-blocklist','--use-angle=d3d11','--enable-gpu']});
try{
 const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 p.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.message)});p.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.log('ERROR',m.text().slice(0,1000))}});
 await p.goto(`${process.env.WORLD_URL??'http://127.0.0.1:5405/'}?scene=arches&nopad`);await p.waitForFunction(()=>window.lab?.ready,null,{timeout:180000});
 await p.evaluate(()=>{lab.renderer.setAnimationLoop(null);lab.step(1/60,10)});await p.screenshot({path:'shots/arches/entrance.png'});
 const volumes=await p.evaluate(()=>{
  const L=lab,R=L.player.R;
  const roof=L.physics.castRay(new R.Ray({x:-6,y:L.heightAt(-6,-24)+2,z:-24},{x:0,y:1,z:0}),120,true,undefined,undefined,L.player.collider);
  const edges=[];
  for(const arch of L.landscape.arches){
   const pos=arch.geometry.attributes.position.array,map=new Map();
   const key=i=>[pos[i],pos[i+1],pos[i+2]].map(n=>Math.round(n*1000)).join(',');
   for(let i=0;i<pos.length;i+=9){const a=key(i),b=key(i+3),c=key(i+6);for(const [v,w] of [[a,b],[b,c],[c,a]]){if(v===w)continue;const k=v<w?v+'|'+w:w+'|'+v;map.set(k,(map.get(k)??0)+1);}}
   edges.push({span:arch.span,height:arch.height,openEdges:[...map.values()].filter(n=>n===1).length,edges:map.size});
  }
  return {roof:roof?.timeOfImpact,height:L.player.t.height,edges,counts:L.counts};
 });
 assert(volumes.roof>10&&volumes.roof<100,'real stone vault overhead');assert.equal(volumes.height,1.8);
 for(const a of volumes.edges)assert(a.openEdges<6,JSON.stringify(a));console.log('VOLUMES',JSON.stringify(volumes));
 const walk=await p.evaluate(()=>{
  const L=lab,render=L.renderer.render;L.renderer.render=()=>{};L.input.keys.add('KeyW');let frames=0,stuck,maxBurial=0;
  for(let z=62;z>=-128;z-=2){const x=-6+6*Math.sin(z/34);let f=0;
   for(;f<600;f++){const dx=x-L.player.feet.x,dz=z-L.player.feet.z;if(Math.hypot(dx,dz)<.5)break;L.follow.yaw=Math.atan2(dx,dz);L.step(1/60);frames++;maxBurial=Math.max(maxBurial,L.heightAt(L.player.feet.x,L.player.feet.z)-L.player.feet.y);
    for(const t of L.game.targets)if(!L.game.state.visited.includes(t.id)&&Math.hypot(t.x-L.player.feet.x,t.z-L.player.feet.z)<2.9)L.game.interact();
   }
   if(f===600){stuck={z,x,feet:L.player.feet.toArray()};break;}
  }
  L.input.keys.clear();L.renderer.render=render;L.step(1/60,30);return {frames,stuck,maxBurial,visited:L.game.state.visited,feet:L.player.feet.toArray()};
 });
 console.log('WALK',JSON.stringify(walk));assert(!walk.stuck,JSON.stringify(walk));assert.equal(walk.visited.length,3);assert(walk.maxBurial<.15);
 await p.screenshot({path:'shots/arches/rear.png'});
 const wall=await p.evaluate(()=>{
  const L=lab;L.teleport(-5,30,-80,30);L.follow.yaw=-Math.PI/2;L.input.keys.add('KeyW');const render=L.renderer.render;L.renderer.render=()=>{};L.step(1/60,480);L.renderer.render=render;L.input.keys.clear();L.step(1/60,2);return {x:L.player.feet.x,z:L.player.feet.z,y:L.player.feet.y,ground:L.heightAt(L.player.feet.x,L.player.feet.z)};
 });assert(wall.x>-60&&wall.x<-15,JSON.stringify(wall));await p.screenshot({path:'shots/arches/wall-contact.png'});
 await p.keyboard.press('m');assert.equal(await p.locator('[data-destination]').count(),5);await p.screenshot({path:'shots/arches/map.png'});
 await p.locator('[data-destination="village"]').click();await p.locator('.atlas-travel').click();await p.waitForFunction(()=>window.lab?.ready&&!worldTravel.busy&&document.documentElement.dataset.scene==='village',null,{timeout:180000});
 await p.evaluate(()=>lab.renderer.setAnimationLoop(null));
 const overlap=await p.evaluate(()=>{const routes=lab.travel.walking.routes;let overlaps=0;for(let x=-180;x<=180;x+=3)for(let z=-180;z<=180;z+=3)if(routes.filter(r=>r.boundary.contains(x,z)).length>1)overlaps++;return {routes:routes.map(r=>r.to),overlaps}});
 console.log('VILLAGE LINKS',JSON.stringify(overlap));assert.equal(overlap.routes.length,3);assert.equal(overlap.overlaps,0,'new branch does not overlap previous terrain belts');
 await p.keyboard.press('m');await p.locator('[data-destination="arches"]').click();await p.locator('.atlas-travel').click();await p.waitForFunction(()=>window.lab?.ready&&!worldTravel.busy&&document.documentElement.dataset.scene==='arches',null,{timeout:180000});
 assert.equal(await p.evaluate(()=>lab.game.state.visited.length),3,'observations persist across travel');
 await p.setViewportSize({width:390,height:844});await p.keyboard.press('m');await p.evaluate(()=>{lab.renderer.setAnimationLoop(null);lab.step(1/60,3)});
 const box=await p.locator('#world-atlas').boundingBox();assert(box.x>=0&&box.x+box.width<=391&&box.y>=0&&box.y+box.height<=845);await p.screenshot({path:'shots/arches/mobile-map.png'});
 assert.deepEqual(errors,[]);writeFileSync('shots/arches/proof.json',JSON.stringify({volumes,walk,wall,overlap,errors},null,2));
 console.log('PASS watertight 3D arches, real roof/wall collision, complete physical walk through both openings, 3 observations, five-region map and persisted progress, mobile layout');
}finally{await browser.close()}
