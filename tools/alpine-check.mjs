// Behaviour-level regression: real KCC travel, proximity checks, gate collision,
// quest completion/reset, scales, screenshots and scene navigation.
import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { guard } from './no-pointer-lock.mjs';
guard(chromium);
const browser=await chromium.launch({executablePath:process.env.CHROME,headless:true,args:['--mute-audio','--ignore-gpu-blocklist','--use-angle=d3d11','--enable-gpu']});
const base=process.env.DEMO_URL??'http://127.0.0.1:5405/';
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto(`${base}?scene=alpine&nopad`);
 await page.waitForFunction(()=>window.lab?.ready,null,{timeout:120000});
 await page.evaluate(()=>lab.renderer.setAnimationLoop(null));
 await page.screenshot({path:'shots/alpine-overview.png'});
 assert.equal(await page.locator('#scenes button.on').textContent(),'雪山牧场');
 const scales=await page.evaluate(()=>({capsule:lab.player.t.height,person:new lab.THREE.Box3().setFromObject(lab.figure.man.object).getSize(new lab.THREE.Vector3()).y,cows:lab.props.cows.map(c=>{
   // Brush instances use a unit quad displaced in the shader; measure the actual underpainting.
   const bounds=new lab.THREE.Box3();
   const point=new lab.THREE.Vector3();
   c.object.traverse(o=>{if(o.geometry?.attributes.aPal){const a=o.geometry.attributes.position;for(let i=0;i<a.count;i++)bounds.expandByPoint(point.fromBufferAttribute(a,i).applyMatrix4(o.matrixWorld));}});
   return bounds.getSize(new lab.THREE.Vector3()).y;
 })}));
 assert.equal(scales.capsule,1.8);assert(scales.person>1.7&&scales.person<2.2);
 for(const h of scales.cows)assert(h>1.2&&h<1.7,JSON.stringify(scales));
 console.log('PASS metre scales',JSON.stringify(scales));
 const press=async key=>{await page.keyboard.press(key);await page.evaluate(()=>lab.step(1/60,2));};
 await press('e');assert.equal(await page.evaluate(()=>lab.game.state.started),false,'remote E must not start quest');
 await page.evaluate(()=>{const c=lab.props.cows[0];lab.teleport(c.x+2,c.z+1,c.x,c.z);});
 await press('e');assert.equal(await page.evaluate(()=>lab.game.state.fed.length),0,'feeding requires supplies');
 await page.evaluate(()=>{lab.game.reset();lab.step(1/60,30);});
 async function walk(x,z){
   const result=await page.evaluate(([x,z])=>{
     const L=lab;
     let frames=0;
     L.setInput(()=>{
       const dx=x-L.player.feet.x,dz=z-L.player.feet.z;
       L.follow.yaw=Math.atan2(dx,dz);
       return {move:{x:0,y:Math.hypot(dx,dz)>.65?1:0},walk:false,sprint:false,strafe:false,jump:false,look:{x:0,y:0},zoom:0,device:'keyboard'};
     });
     while(Math.hypot(x-L.player.feet.x,z-L.player.feet.z)>.7&&frames<1800){L.step(1/60);frames++;}
     L.setInput(null);L.step(1/60,8);
     return {distance:Math.hypot(x-L.player.feet.x,z-L.player.feet.z),frames,at:L.player.feet.toArray()};
   },[x,z]);
   assert(result.distance<1.2,`unreachable ${x},${z}: ${JSON.stringify(result)}`);
   console.log('PASS walk',x,z,JSON.stringify(result));
 }
 const supply=await page.evaluate(()=>lab.props.supply);
 await walk(supply.x-2,supply.z+1);await press('e');
 assert.equal(await page.evaluate(()=>lab.game.state.started),true);
 await walk(-3.4,46);await press('e');
 assert.equal(await page.evaluate(()=>lab.game.state.gateOpen),true);
 await page.evaluate(()=>lab.step(1/60,60));
 await walk(-3.4,39);
 await walk(-12,29);await press('e');
 assert.equal(await page.evaluate(()=>lab.game.state.fed.length),1);
 await press('e');assert.equal(await page.evaluate(()=>lab.game.state.fed.length),1,'no duplicate feed');
 await page.evaluate(()=>{lab.follow.yaw=1.1;lab.follow.pitch=.14;lab.step(1/60,20);});
 await page.screenshot({path:'shots/alpine-feeding.png'});
 await walk(-29,6);await press('e');
 await walk(16,-21);await press('e');
 assert.equal(await page.evaluate(()=>lab.game.state.fed.length),3);
 // Cross the bridge and visit the optional landmark using actual movement.
 const bridge=await page.evaluate(()=>lab.props.bridge);
 await walk(bridge.x-19,-16);await walk(bridge.x+19,-16);await walk(63,-16);await press('e');
 assert.equal(await page.evaluate(()=>lab.game.state.viewpoint),true);
 await page.screenshot({path:'shots/alpine-lookout.png'});
 await walk(bridge.x+19,-16);await walk(bridge.x-19,-16);await walk(10,35);await walk(supply.x-2,supply.z+1);await press('e');
 assert.equal(await page.evaluate(()=>lab.game.state.complete),true);
 assert.equal(await page.locator('#pasture-panel').count(),0,'task sidebar removed');
 assert.equal(await page.evaluate(()=>lab.game.state.complete),true,'feeding remains playable without sidebar');
 assert.equal(await page.evaluate(()=>lab.props.grazers.length),6,'six additional grazing animals');
 console.log('PASS full quest and optional lookout');
 await press('r');assert.equal(await page.evaluate(()=>lab.game.state.started),false);assert.equal(await page.evaluate(()=>lab.game.state.fed.length),0);
 // A closed gate must block the capsule; opening it above already proved passage.
 await page.evaluate(()=>{lab.teleport(-3.4,45,-3.4,40);lab.step(1/60,90);lab.input.keys.add('KeyW');lab.step(1/60,100);lab.input.keys.clear();});
 const blockedZ=await page.evaluate(()=>lab.player.feet.z);assert(blockedZ>43.25,`closed gate crossed: ${blockedZ}`);
 console.log('PASS closed gate blocks',blockedZ);
 await page.setViewportSize({width:640,height:720});await page.evaluate(()=>lab.step(1/60,2));
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.screenshot({path:'shots/alpine-narrow.png'});
 for(const scene of ['autumn','aurora','alpine']){
   await page.locator(`#scenes button[data-scene="${scene}"]`).click();
   await page.waitForFunction(s=>window.lab?.ready&&document.documentElement.dataset.scene===s,scene,{timeout:90000});
 }
 assert.deepEqual(errors,[]);console.log('PASS all three scenes; no runtime or shader errors');
}finally{await browser.close();}
