import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { guard } from './no-pointer-lock.mjs';
import { createHash } from 'node:crypto';
guard(chromium);
const browser=await chromium.launch({executablePath:process.env.CHROME,headless:true,args:['--mute-audio','--ignore-gpu-blocklist','--use-angle=d3d11','--enable-gpu']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:5405/?scene=alpine&nopad');await page.waitForFunction(()=>window.lab?.ready,null,{timeout:120000});await page.evaluate(()=>lab.renderer.setAnimationLoop(null));
 await page.screenshot({path:'shots/alpine-v3-overview.png'});
 console.log(await page.evaluate(()=>({counts:lab.counts,grass:lab.environment.stats})));
 await page.keyboard.press('v');await page.evaluate(()=>lab.step(1/60,2));
 assert(await page.evaluate(()=>Boolean(lab.follow.free)));
 await page.screenshot({path:'shots/alpine-v3-panorama.png'});
 await page.keyboard.press('r');await page.evaluate(()=>lab.step(1/60,2));
 assert.equal(await page.evaluate(()=>lab.follow.free),null);
 await page.keyboard.press('v');await page.evaluate(()=>lab.step(1/60,2));assert(await page.evaluate(()=>Boolean(lab.follow.free)));
 await page.keyboard.press('v');await page.evaluate(()=>lab.step(1/60,2));
 const stable=await page.evaluate(()=>{const g=lab.landscape.mountains.surface.geometry.attributes.position.array,copy=Array.from(g);lab.teleport(14,70,0,-60);lab.step(1/60,50);return copy.every((v,i)=>g[i]===v);});assert(stable,'mountain vertices must stay fixed');
 const trunk=await page.evaluate(()=>{const t=lab.landscape.forest.colliders.find(t=>t.x>78&&t.z>15&&t.z<70);lab.teleport(t.x-4,t.z+5,t.x,t.z);lab.view([t.x-8,t.y+3.3,t.z+8],[t.x,t.y+4,t.z]);lab.step(1/60,30);return t;});
 await page.screenshot({path:'shots/alpine-v3-tree.png'});assert(trunk.h>8);assert(await page.evaluate(()=>lab.landscape.forest.trunks.count===lab.counts.trees));
 const blocked=await page.evaluate(t=>{lab.view(null);lab.teleport(t.x-3,t.z,t.x,t.z);lab.input.keys.add('KeyW');lab.step(1/60,100);lab.input.keys.clear();return Math.hypot(lab.player.feet.x-t.x,lab.player.feet.z-t.z);},trunk);
 assert(blocked>=trunk.r+.2,'solid trunk must block the player');
 await page.evaluate(()=>{lab.view(null);const c=lab.props.cows[0];lab.teleport(c.x+3,c.z+1,c.x,c.z);lab.view([c.x+5,c.object.position.y+2.7,c.z-5],[c.x,c.object.position.y+.8,c.z]);lab.step(1/60,40);});await page.screenshot({path:'shots/alpine-v3-cow.png'});
 await page.evaluate(()=>{lab.teleport(46,25,46,0);lab.view([56,7,38],[46,3,17]);lab.step(1/60,70);});
 const water=await page.evaluate(()=>({depth:lab.environment.waterDepth(lab.player.feet.x,lab.player.feet.z),inside:lab.environment.inWater}));console.log('water',water);
 // Put the player exactly in the current channel, then walk through it to leave a wake.
 await page.evaluate(()=>{const z=25,x=47+5*Math.sin(z/35);lab.teleport(x,z,x,z-10);lab.step(1/60,50);lab.input.keys.add('KeyW');lab.step(1/60,60);lab.input.keys.clear();});
 assert(await page.evaluate(()=>lab.environment.trail.some(t=>t.w===1)),'wading must emit wake history');
 await page.screenshot({path:'shots/alpine-v3-water.png'});
 await page.evaluate(()=>{for(const o of lab.scene.children)o.visible=o===lab.environment.group;for(const o of lab.environment.group.children)o.visible=o===lab.environment.stream.group;for(const o of lab.environment.stream.group.children)o.visible=o===lab.environment.water;lab.shared.uTime.value=1;lab.frame.render(lab.scene,lab.camera);});
 const first=await page.screenshot();await page.evaluate(()=>{lab.shared.uTime.value=2;lab.frame.render(lab.scene,lab.camera);});const second=await page.screenshot();assert.notEqual(createHash('sha256').update(first).digest('hex'),createHash('sha256').update(second).digest('hex'),'visible water must change with time');
 assert.deepEqual(errors,[]);console.log('PASS world-fixed mountain, physical tree trunks, grass/wake history, visible flowing water and shaders');
}finally{await browser.close();}
