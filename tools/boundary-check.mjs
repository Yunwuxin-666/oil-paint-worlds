// End-to-end physics check: travel across each belt, then actually walk out of
// the incoming half into its original region. Not just a successful load event.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {chromium} from 'playwright-core';
import {guard} from './no-pointer-lock.mjs';
guard(chromium);
mkdirSync('shots/boundaries',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME,headless:true,args:['--mute-audio','--ignore-gpu-blocklist','--use-angle=d3d11','--enable-gpu']});
const results=[];
try{
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.message)});
 page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.log('ERROR',m.text())}});
 const links=[['alpine','village','golden'],['village','autumn','bridge'],['autumn','aurora','pass'],['aurora','alpine','snowmelt'],['village','arches','drywash'],['arches','village','drywash']];
 for(const [from,to,id] of links){
  await page.goto(`http://127.0.0.1:5405/?scene=${from}&trail=${id}&nopad`);
  await page.waitForFunction(()=>window.lab?.ready,null,{timeout:120000});
  await page.evaluate(()=>{lab.renderer.setAnimationLoop(null);lab.input.keys.clear();lab.step(1/60,180)});
  if(from==='village')await page.evaluate(()=>{lab.game.state.colors=['wheat']});
  const crossing=await page.evaluate(to=>{
   const L=lab,route=L.travel.walking.routes.find(r=>r.to===to),b=route.boundary,render=L.renderer.render;
   L.input.keys.add('KeyW');L.renderer.render=()=>{};
   let start=0;for(let i=0;i<route.points.length;i++)if(route.points[i].distanceTo(L.player.feet)<route.points[start].distanceTo(L.player.feet))start=i;
   let frames=0,stuck;
   for(let i=start+1;i<route.points.length&&!worldTravel.busy;i++){
    const q=route.points[i];let f=0;
    for(;f<900&&!worldTravel.busy;f++){
     const dx=q.x-L.player.feet.x,dz=q.z-L.player.feet.z;if(Math.hypot(dx,dz)<.48)break;
     if(b.progress(L.player.feet.x,L.player.feet.z)>117)L.renderer.render=render;
     L.follow.yaw=Math.atan2(dx,dz);L.step(1/60);frames++;
    }
    if(f===900){stuck={i,target:q.toArray(),at:L.player.feet.toArray()};break;}
   }
   L.renderer.render=render;
   return {frames,stuck,triggered:worldTravel.busy,at:b.project(L.player.feet.x,L.player.feet.z),height:L.player.feet.y-b.end.y,
    canonicalCore:[-45,0,45].map(s=>[-8,0,8].map(u=>b.height(u,s))),camera:{s:b.project(L.camera.position.x,L.camera.position.z).s,y:L.camera.position.y-b.end.y}};
  },to);
  assert(!crossing.stuck,JSON.stringify(crossing));assert(crossing.triggered,'physical crossing');
  await page.waitForFunction(to=>lab?.ready&&!worldTravel.busy&&document.documentElement.dataset.scene===to,to,{timeout:120000});
  if(from==='village')assert.deepEqual(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('painted-worlds-progress-v1')).village.colors),['wheat'],'disposing old region preserves its own progress key');
  const match=await page.evaluate(from=>{
   lab.renderer.setAnimationLoop(null);lab.input.keys.clear();
   const b=lab.travel.walking.routes.find(r=>r.to===from).boundary,p=b.project(lab.player.feet.x,lab.player.feet.z);
   return {at:p,height:lab.player.feet.y-b.end.y,canonicalCore:[-45,0,45].map(s=>[-8,0,8].map(u=>b.height(u,s))),canvas:document.querySelectorAll('#view canvas').length,atlas:document.querySelectorAll('#world-atlas').length,veil:!!document.getElementById('world-transition'),camera:{s:b.project(lab.camera.position.x,lab.camera.position.z).s,y:lab.camera.position.y-b.end.y}};
  },from);
  assert(Math.abs(match.at.s-crossing.at.s)<.3,'same valley station at handoff');
  assert(Math.abs(match.height-crossing.height)<.3,'same relative elevation at handoff');
  for(let i=0;i<3;i++)for(let j=0;j<3;j++)assert(Math.abs(match.canonicalCore[i][j]-crossing.canonicalCore[i][j])<.001,'shared core heights');
  assert(Math.abs(match.camera.s-crossing.camera.s)<1,'camera remains in its canonical frame');
  assert.equal(match.canvas,1);assert.equal(match.atlas,1);assert(!match.veil,'no screenshot fade for walking');
  await page.screenshot({path:`shots/boundaries/${id}-middle.png`});
  const exit=await page.evaluate(from=>{
   const L=lab,route=L.travel.walking.routes.find(r=>r.to===from),render=L.renderer.render;
   let nearest=0;for(let i=0;i<route.points.length;i++)if(route.points[i].distanceTo(L.player.feet)<route.points[nearest].distanceTo(L.player.feet))nearest=i;
   L.renderer.render=()=>{};L.input.keys.add('KeyW');let frames=0,stuck;
   for(let i=nearest-1;i>=0;i--){const q=route.points[i];let f=0;
    for(;f<900;f++){const dx=q.x-L.player.feet.x,dz=q.z-L.player.feet.z;if(Math.hypot(dx,dz)<.48)break;L.follow.yaw=Math.atan2(dx,dz);L.step(1/60);frames++;}
    if(f===900){stuck={i,target:q.toArray(),at:L.player.feet.toArray()};break;}
   }
   L.renderer.render=render;L.input.keys.clear();L.step(1/60,90);
   return {frames,stuck,active:L.travel.walking.active?.spec.id,visibility:L.travel.walking.regionVisibility.value,grounded:L.player.grounded,feet:L.player.feet.toArray(),ground:L.heightAt(L.player.feet.x,L.player.feet.z)};
  },from);
  assert(!exit.stuck,JSON.stringify({id,exit}));assert.equal(exit.visibility,1,'original region restored on exit');assert(!exit.active);assert(exit.grounded,'grounded at destination');
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.scene),to,'walking inward does not send player back');
  await page.screenshot({path:`shots/boundaries/${id}-exit.png`});
  results.push({id,crossing,match,exit});console.log('PASS BELT',id,'crossing',crossing.frames,'incoming-half',exit.frames);
 }
 assert.deepEqual(errors,[]);
 writeFileSync('shots/boundaries/proof.json',JSON.stringify({results,errors},null,2));
 console.log('PASS shared valley coordinates, physical entry AND exit, continuous camera, one renderer/map, no screenshot fades or JS/shader errors');
}finally{await browser.close()}
