import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { guard } from './no-pointer-lock.mjs';
guard(chromium);
const browser=await chromium.launch({executablePath:process.env.CHROME,headless:true,args:['--mute-audio','--ignore-gpu-blocklist','--use-angle=d3d11','--enable-gpu']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[],requests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 page.on('request',r=>requests.push(r.url()));
 await page.goto('http://127.0.0.1:5405/?scene=alpine&nopad');await page.waitForFunction(()=>window.lab?.ready,null,{timeout:120000});
 await page.evaluate(()=>lab.renderer.setAnimationLoop(null));
 assert(!requests.some(r=>/mountain-panorama/.test(r)),'game must not request a mountain image');
 const stats=await page.evaluate(()=>{
  const m=lab.landscape.mountains,b=new lab.THREE.Box3().setFromObject(m.surface);
  return {vertices:m.surface.geometry.attributes.position.count,size:b.getSize(new lab.THREE.Vector3()).toArray(),strokes:m.strokeCount,opaque:!m.surface.material.transparent,depthWrite:m.surface.material.depthWrite};
 });assert(stats.vertices>100000&&stats.size[1]>2000&&stats.size[2]>10000&&stats.opaque&&stats.depthWrite);console.log('PASS solid 3D range; no panorama request',stats);
 await page.screenshot({path:'shots/alpine-3d-mountains-front.png'});
 const stable=await page.evaluate(()=>{const m=lab.landscape.mountains;window.mountainSnapshot={pos:Array.from(m.surface.geometry.attributes.position.array),pins:Array.from(m.strokes.geometry.attributes.aPos.array)};return true;});
 for(const [name,x,z,yaw,distance] of [['bus-right',20,63,-2.25,6],['east',55,40,-Math.PI/2,14],['west',-40,15,Math.PI/2,14],['south',0,20,0,18],['wide',-15,80,Math.PI,26]]){
  await page.evaluate(([x,z,yaw,d])=>{lab.view(null);lab.teleport(x,z,x+Math.sin(yaw)*10,z+Math.cos(yaw)*10);lab.follow.yaw=yaw;lab.follow.pitch=-.10;lab.follow.want=lab.follow.distance=d;lab.step(1/60,45);},[x,z,yaw,distance]);
  await page.screenshot({path:`shots/alpine-3d-mountains-${name}.png`});
 }
 assert(await page.evaluate(()=>{const m=lab.landscape.mountains;return mountainSnapshot.pos.every((v,i)=>v===m.surface.geometry.attributes.position.array[i])&&mountainSnapshot.pins.every((v,i)=>v===m.strokes.geometry.attributes.aPos.array[i]);}),'geometry and stroke pins must stay fixed during traversal and rotation');
 // Raycast different depths through the real range; a single backdrop card cannot satisfy this.
 const depths=await page.evaluate(()=>{const L=lab,m=L.landscape.mountains.surface,ray=new L.THREE.Raycaster();m.updateMatrixWorld(true);return [-1800,-900,0,1400].map(x=>{const target=new L.THREE.Vector3(x,800,-2700),origin=new L.THREE.Vector3(0,80,0);ray.set(origin,target.sub(origin).normalize());return ray.intersectObject(m)[0]?.distance;});});
 assert(depths.every(Number.isFinite)&&Math.max(...depths)-Math.min(...depths)>100,JSON.stringify(depths));
 assert.deepEqual(errors,[]);console.log('PASS multiple angles/distances, stable world pins, real raycast depths',depths);
}finally{await browser.close();}
