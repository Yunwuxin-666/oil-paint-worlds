import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { guard } from './no-pointer-lock.mjs';
guard(chromium);
const browser=await chromium.launch({executablePath:process.env.CHROME,headless:true,args:['--mute-audio','--ignore-gpu-blocklist','--use-angle=d3d11','--enable-gpu']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:5405/alpine/assets.html');
 await page.waitForFunction(()=>document.querySelectorAll('.asset img').length===12&&[...document.images].every(i=>i.complete&&i.naturalWidth>0));
 assert.equal(await page.locator('.asset a[download]').count(),12);
 await page.screenshot({path:'shots/alpine-asset-catalog.png',fullPage:true});
 await page.setViewportSize({width:390,height:844});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.setViewportSize({width:1440,height:900});
 await page.goto('http://127.0.0.1:5405/?scene=alpine&nopad');
 await page.waitForFunction(()=>window.lab?.ready,null,{timeout:120000});
 const performanceSample=await page.evaluate(async()=>{
  const deltas=[];let last=performance.now();
  for(let i=0;i<180;i++){const now=await new Promise(requestAnimationFrame);if(i>=60)deltas.push(now-last);last=now;}
  deltas.sort((a,b)=>a-b);return {medianMs:deltas[60],p95Ms:deltas[114],samples:deltas.length};
 });console.log('1440x900 headless frame sample',performanceSample);
 await page.evaluate(()=>lab.renderer.setAnimationLoop(null));
 await page.evaluate(()=>{const s=lab.props.supply;lab.view([s.x-7,s.y+3.4,s.z-6],[s.x+2,s.y+1.4,s.z-1]);lab.step(1/60,2);});
 await page.screenshot({path:'shots/alpine-v3-bus.png'});
 await page.evaluate(()=>{const y=lab.heightAt(67,-15);lab.view([70,y+2,-20],[67,y+.6,-14.7]);lab.step(1/60,2);});
 await page.screenshot({path:'shots/alpine-v3-bench.png'});
 await page.evaluate(()=>{lab.teleport(-12,29,-14,28);const y=lab.heightAt(-12,29);lab.view([-8,y+1.2,34],[-14,y+.3,28]);lab.step(1/60,2);});
 await page.screenshot({path:'shots/alpine-v3-meadow.png'});
 const river=await page.evaluate(()=>{const z=30,x=47+5*Math.sin(z/35);return {main:lab.environment.waterDepth(x,z),bar:lab.environment.waterDepth(x+4.4,z),pebbles:lab.environment.stats.riverPebbles};});
 assert(river.main>.2&&river.bar<.03&&river.pebbles>5000,JSON.stringify(river));
 assert.deepEqual(errors,[]);console.log('PASS 12 individual assets load; mobile catalog; dry gravel bar and wet channel; model views and shaders');
}finally{await browser.close();}
