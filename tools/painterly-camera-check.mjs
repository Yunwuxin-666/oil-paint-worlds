import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { guard } from './no-pointer-lock.mjs';
guard(chromium);
const browser=await chromium.launch({executablePath:process.env.CHROME,headless:true,args:['--mute-audio','--ignore-gpu-blocklist','--use-angle=d3d11','--enable-gpu']});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 for(const scene of ['alpine','autumn','aurora']) {
  await page.goto(`http://127.0.0.1:5405/?scene=${scene}&capture&clean&nopad`);
  await page.waitForFunction(()=>window.lab?.ready,null,{timeout:120000});
  await page.addStyleTag({content:'body > :not(#view) { visibility: hidden !important; }'});
  const framing=await page.evaluate(()=>{
   lab.step(1/60,90);
   const p=lab.player.feet,feet=p.clone().project(lab.camera),head=p.clone().add(new lab.THREE.Vector3(0,2.02,0)).project(lab.camera);
   return {fov:lab.camera.fov,want:lab.follow.want,distance:lab.follow.distance,ratio:Math.abs(head.y-feet.y)/2,feet:feet.toArray(),head:head.toArray()};
  });
  console.log(scene,framing);
  assert(framing.feet[1]>-1&&framing.head[1]<1,'whole figure visible');
  if(scene==='alpine')assert(framing.ratio>.09&&framing.ratio<.23,'landscape framing');
  await page.screenshot({path:`shots/${scene}-painterly-camera.png`});
  if(scene==='alpine') {
   const painted=await page.screenshot();
   await page.evaluate(()=>{lab.frame.uniforms.uCanvas.value=0;lab.step(0,1);});
   const plain=await page.screenshot();assert(!painted.equals(plain),'canvas has a visible contribution');
   await page.evaluate(()=>{lab.frame.uniforms.uCanvas.value=1.35;lab.step(0,1);});
   await page.evaluate(()=>lab.frame.render(lab.scene,lab.camera));
   const stableA=await page.screenshot({path:'shots/canvas-stable-a.png'});await page.evaluate(()=>lab.frame.render(lab.scene,lab.camera));
   const stableB=await page.screenshot({path:'shots/canvas-stable-b.png'});
   const delta=await page.evaluate(async ([a,b])=>{
    async function pixels(s){const im=await createImageBitmap(await (await fetch('data:image/png;base64,'+s)).blob());const c=new OffscreenCanvas(im.width,im.height),ctx=c.getContext('2d');ctx.drawImage(im,0,0);return ctx.getImageData(0,0,im.width,im.height).data;}
    const A=await pixels(a),B=await pixels(b);let total=0,max=0;for(let i=0;i<A.length;i++){const d=Math.abs(A[i]-B[i]);total+=d;max=Math.max(max,d);}return {mean:total/A.length,max};
   },[stableA.toString('base64'),stableB.toString('base64')]);
   assert(delta.mean<.001&&delta.max<=3,'paused canvas must not shimmer beyond GPU rounding');
   await page.setViewportSize({width:640,height:960});
   await page.waitForFunction(()=>lab.renderer.domElement.width===640);
   await page.evaluate(()=>lab.step(1/60,5));
   await page.screenshot({path:'shots/alpine-painterly-camera-portrait.png'});
   await page.setViewportSize({width:1440,height:1000});
  }
 }
 assert.deepEqual(errors,[]);console.log('PASS framing, canvas toggle/stability, portrait and three-scene shaders');
} finally {await browser.close();}
