import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { guard } from './no-pointer-lock.mjs';
guard(chromium);
const browser=await chromium.launch({executablePath:process.env.CHROME,headless:true,args:['--mute-audio','--ignore-gpu-blocklist','--use-angle=d3d11','--enable-gpu']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:5405/?scene=alpine&nopad');await page.waitForFunction(()=>window.lab?.ready,null,{timeout:120000});
 await page.evaluate(()=>lab.renderer.setAnimationLoop(null));
 const data=await page.evaluate(()=>{
  const E=lab.environment,S=E.stream,levels=[],speeds=[];
  for(let z=-90;z<=110;z++){const h=S.hydroAt(47+5*Math.sin(z/35),z);levels.push(h.level);speeds.push(Math.hypot(h.vx,h.vz));}
  const slopes=levels.slice(1).map((v,i)=>v-levels[i]);
  const ray=new lab.THREE.Raycaster(new lab.THREE.Vector3(65,100,-16),new lab.THREE.Vector3(0,-1,0));S.surface.updateMatrixWorld(true);
  const stoneX=47+5*Math.sin(28/35)-.75,stoneZ=28;
  const left=S.hydroAt(stoneX-1,stoneZ+1.4),right=S.hydroAt(stoneX+1,stoneZ+1.4);
  return {minSlope:Math.min(...slopes),maxSlope:Math.max(...slopes),bankDepth:E.waterDepth(65,-16),bankTriangles:ray.intersectObject(S.surface).length,diversion:right.vx-left.vx,vertices:S.surface.geometry.attributes.position.count,cottageSolids:lab.props.cottage.solids.length,treeCount:lab.landscape.forest.trees.filter(t=>t.x>-25&&t.x<15&&t.z>45&&t.z<82).length};
 });
 assert(data.minSlope>0&&data.maxSlope>data.minSlope*2,JSON.stringify(data));
 assert.equal(data.bankDepth,0);assert.equal(data.bankTriangles,0,'old grassy water-sheet bug must be absent in geometry');assert(data.diversion>.1);assert(data.cottageSolids>=10&&data.treeCount>=10);
 console.log('PASS monotone pools/riffles, dry bank without water triangles, stone deflection, 3D cottage and grove',data);
 // Raycast the rendered building mesh at 3 cm above terrain all around both foundations.
 // This catches a visible gap even if stored placement metadata claims contact.
 const contact=await page.evaluate(()=>{
  const L=lab,c=L.props.cottage,mesh=c.group.children.find(o=>o.geometry?.attributes.aPal),ray=new L.THREE.Raycaster(),fail=[];
  mesh.updateMatrixWorld(true);
  for(const f of c.grounding.filter(f=>f.name.endsWith('foundation'))){
   for(const axis of ['x','z'])for(const side of [-1,1])for(const t of [-.8,-.4,0,.4,.8]){
    const x=f.x+(axis==='x'?side*f.width/2:t*f.width/2),z=f.z+(axis==='z'?side*f.depth/2:t*f.depth/2),y=L.heightAt(x,z)+.03;
    const dir=new L.THREE.Vector3(axis==='x'?-side:0,0,axis==='z'?-side:0),origin=new L.THREE.Vector3(x,y,z).addScaledVector(dir,-.25);
    ray.set(origin,dir);ray.far=.55;if(!ray.intersectObject(mesh).length)fail.push({name:f.name,x,y,z});
   }
  }
  return {fail,levels:{main:c.y,shed:c.shed.y},bench:L.props.bench.feet.map(f=>({gap:f.bottom-L.heightAt(f.x,f.z)}))};
 });assert.deepEqual(contact.fail,[],'rendered foundations must meet terrain on all sides');assert(contact.bench.every(f=>f.gap<=0&&f.gap>-.1));console.log('PASS 40 rendered foundation contact rays and four bench feet',contact);
 const advection=await page.evaluate(()=>{const S=lab.environment.stream,p=S.particles.map(p=>[p.x,p.z]);lab.step(1/60,60);let moved=0,good=0;for(let i=0;i<p.length;i++){const dz=S.particles[i].z-p[i][1];if(Math.abs(dz)<4){moved++;if(dz<-.1)good++;}}return good/moved;});assert(advection>.95,'flow marks must advect downstream');
 await page.evaluate(()=>{const c=lab.props.cottage;lab.teleport(c.x+10,c.z,c.x,c.z);lab.view([c.x+15,c.y+5.2,c.z+14],[c.x-2,c.y+2.5,c.z]);lab.step(1/60,30);});
 await page.screenshot({path:'shots/alpine-cottage-roadside.png'});
 await page.evaluate(()=>{const c=lab.props.cottage;lab.view([c.x-16,c.y+7,c.z+9],[c.x-3,c.y+2,c.z-1]);lab.step(1/60,2);});
 await page.screenshot({path:'shots/alpine-cottage-rear.png'});
 await page.evaluate(()=>{const c=lab.props.cottage,s=c.shed;lab.view([s.x-6,s.y+1.1,s.z+5.5],[s.x,s.y+.8,s.z]);lab.step(1/60,2);});
 await page.screenshot({path:'shots/alpine-shed-grounded.png'});
 await page.evaluate(()=>{const c=lab.props.cottage;lab.view(null);lab.teleport(c.x+8,c.z,c.x,c.z);lab.step(1/60,60);lab.input.keys.add('KeyW');lab.step(1/60,150);lab.input.keys.clear();});
 assert(await page.evaluate(()=>lab.player.feet.x>lab.props.cottage.x+3.7),'house wall must block player');
 await page.evaluate(()=>{lab.teleport(65,-16,47,12);lab.view([74,9,-28],[48,2,35]);lab.step(1/60,30);});
 await page.screenshot({path:'shots/alpine-river-lookout-fixed.png'});
 await page.evaluate(()=>{lab.view([55,5,20],[49,2.6,30]);lab.step(1/60,2);});
 await page.screenshot({path:'shots/alpine-river-shallows.png'});
 assert.deepEqual(errors,[]);console.log('PASS downstream advection, cottage collision, bridge-side and shallow-bank views; no runtime errors');
}finally{await browser.close();}
