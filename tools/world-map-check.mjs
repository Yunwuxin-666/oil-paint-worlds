import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {guard} from './no-pointer-lock.mjs';
guard(chromium);
const browser=await chromium.launch({executablePath:process.env.CHROME,headless:true,args:['--mute-audio','--ignore-gpu-blocklist','--use-angle=d3d11','--enable-gpu']});
const root=process.env.WORLD_URL??'http://127.0.0.1:5405/';
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],bad=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 page.on('response',r=>{if(r.status()>=400)bad.push(`${r.status()} ${r.url()}`)});
 const ready=async()=>{await page.waitForFunction(()=>window.lab?.ready,null,{timeout:120000});await page.evaluate(()=>{lab.renderer.setAnimationLoop(null);lab.step(1/60,5)});};
 await page.goto(`${root}?scene=village&nopad`);await ready();
 assert(await page.locator('#world-atlas').isVisible());
 await page.evaluate(()=>{const t=lab.game.targets.find(t=>t.id==='wheat');lab.teleport(t.x,t.z+1,t.x,t.z-5);lab.game.interact()});
 assert.equal(await page.evaluate(()=>lab.game.state.colors.length),1);
 await page.keyboard.press('m');assert.equal(await page.evaluate(()=>lab.input.suspended),true);
 const stopped=await page.evaluate(()=>{const p=lab.player.feet.clone();lab.input.keys.add('KeyW');lab.step(1/60,60);return p.distanceTo(lab.player.feet)});
 assert(stopped<.1,'opening map stops movement');
 await page.screenshot({path:'shots/world-map-expanded.png'});
 for(const id of ['alpine','aurora','autumn','village']){
  await page.locator(`[data-destination="${id}"]`).click();
  await Promise.all([page.waitForNavigation(),page.locator('.atlas-travel').click()]);await ready();
  const arrival=await page.evaluate(()=>({id:document.documentElement.dataset.scene,d:Math.hypot(lab.player.feet.x-lab.travel.station.landing.x,lab.player.feet.z-lab.travel.station.landing.z),y:lab.player.feet.y,ground:lab.heightAt(lab.player.feet.x,lab.player.feet.z),station:{x:lab.travel.station.x,z:lab.travel.station.z}}));
  assert.equal(arrival.id,id);assert(arrival.d<.4,'arrival at destination waystation');assert(Math.abs(arrival.y-arrival.ground)<.3,'arrival grounded');
  await page.screenshot({path:`shots/world-portal-${id}.png`});
  await page.keyboard.press('g');assert(await page.locator('#world-atlas').evaluate(e=>e.classList.contains('expanded')),'G opens nearby station');
  console.log('PORTAL',arrival);
 }
 assert.deepEqual(await page.evaluate(()=>lab.game.state.colors),['wheat'],'travel preserves village activity');
 await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>lab.input.suspended),false);
 const before=await page.evaluate(()=>lab.player.feet.toArray());
 await page.evaluate(()=>{lab.input.keys.add('KeyW');lab.step(1/60,60);lab.input.keys.clear();});
 const after=await page.evaluate(()=>lab.player.feet.toArray());assert(Math.hypot(before[0]-after[0],before[2]-after[2])>1,'movement resumes');
 await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>lab.renderer.domElement.width===390);await page.keyboard.press('m');await page.evaluate(()=>lab.step(1/60,5));
 const box=await page.locator('#world-atlas').boundingBox();assert(box.x>=0&&box.x+box.width<=391&&box.y>=0&&box.y+box.height<=845);
 await page.screenshot({path:'shots/world-map-mobile.png'});
 await page.keyboard.press('Escape');await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(()=>lab.step(1/60,2));await page.screenshot({path:'shots/world-map-mini.png'});
 assert.deepEqual(errors,[]);assert.deepEqual(bad,[]);
 console.log('PASS four waystations, map travel, grounded arrivals, progress retained, input pause/resume, 390px map, no errors');
}finally{await browser.close()}
