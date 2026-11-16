import assert from 'node:assert/strict';
import {chromium} from 'playwright-core';
import {guard} from './no-pointer-lock.mjs';
guard(chromium);
const browser=await chromium.launch({executablePath:process.env.CHROME,headless:true,args:['--mute-audio','--ignore-gpu-blocklist','--use-angle=d3d11','--enable-gpu']});
const root=process.env.WORLD_URL??'http://127.0.0.1:5405/';
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.message)});page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.log('ERROR',m.text())}});
 await page.goto(`${root}?scene=alpine&nopad`);await page.waitForFunction(()=>window.lab?.ready,null,{timeout:120000});
 const token=await page.evaluate(()=>window.__walkTestToken=Math.random());
 for(const to of ['village','autumn','aurora','alpine','aurora','autumn','village','alpine']){
  await page.evaluate(()=>lab.renderer.setAnimationLoop(null));
  const result=await page.evaluate(to=>{
   const L=lab,route=L.travel.walking.routes.find(r=>r.to===to),start=route.points[0],next=route.points[1];
   L.teleport(start.x,start.z,next.x,next.z);L.input.keys.clear();L.input.keys.add('KeyW');
   const render=L.renderer.render;L.renderer.render=()=>{};let frames=0,stuck;
   for(let i=1;i<route.points.length;i++){
    const q=route.points[i];if(i>=route.points.length-4)L.renderer.render=render;
    let f=0;
    for(;f<1500&&!window.worldTravel.busy;f++){
     const dx=q.x-L.player.feet.x,dz=q.z-L.player.feet.z;if(Math.hypot(dx,dz)<.48)break;
     L.follow.yaw=Math.atan2(dx,dz);L.step(1/60);frames++;
    }
    if(window.worldTravel.busy)break;
    if(f===1500){stuck={i,target:q.toArray(),at:L.player.feet.toArray()};break;}
   }
   L.renderer.render=render;
   return {from:L.travel.regionId,to,frames,n:route.points.length,stuck,triggered:window.worldTravel.busy};
  },to);
  console.log('WALK',result);assert(!result.stuck,JSON.stringify(result));assert(result.triggered,'walking activates region connection');
  await page.waitForFunction(id=>window.lab?.ready&&!window.worldTravel.busy&&document.documentElement.dataset.scene===id,to,{timeout:120000});
  await page.locator('#world-transition').waitFor({state:'hidden',timeout:3000});
  await page.evaluate(()=>{lab.renderer.setAnimationLoop(null);lab.input.keys.clear();lab.step(1/60,2)});
  assert.equal(await page.evaluate(()=>window.__walkTestToken),token,'region change keeps the document');
  const landing=await page.evaluate(()=>({y:lab.player.feet.y,ground:lab.heightAt(lab.player.feet.x,lab.player.feet.z),stationDistance:Math.hypot(lab.player.feet.x-lab.travel.station.x,lab.player.feet.z-lab.travel.station.z),canvases:document.querySelectorAll('#view canvas').length,maps:document.querySelectorAll('#world-atlas').length}));
  assert(Math.abs(landing.y-landing.ground)<.35);assert(landing.stationDistance>6,'walking arrives at a connecting trail, not the station landing');assert.equal(landing.canvases,1);assert.equal(landing.maps,1);
  await page.screenshot({path:`shots/walk-arrival-${to}.png`});
 }
 const recovery=await page.evaluate(()=>{
  const L=lab,p=L.travel.walking.routes.find(r=>r.to==='village').points.at(-12);L.teleport(p.x,p.z,p.x,p.z+10);L.step(1/60,180);const before=L.player.feet.clone();
  L.player.body.setTranslation({x:before.x,y:before.y-14,z:before.z},true);L.physics.propagateModifiedBodyPositionsToColliders();L.player.feet.y-=14;L.step(1/60,2);
  return {d:Math.hypot(before.x-L.player.feet.x,before.z-L.player.feet.z),ground:Math.abs(L.player.feet.y-L.heightAt(L.player.feet.x,L.player.feet.z))};
 });assert(recovery.d<1&&recovery.ground<.4,'fall recovery uses the last safe ground');
 assert.deepEqual(errors,[]);console.log('PASS eight full physical walking routes, no document reload, grounded trail arrivals, one active canvas/map, safe recovery, no errors');
}finally{await browser.close()}
