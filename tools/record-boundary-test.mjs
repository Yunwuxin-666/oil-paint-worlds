// Real-time screen recording. Only the initial trail entrance is selected;
// subsequent travel is the real character controller, including the handoff.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright-core';
import {guard} from './no-pointer-lock.mjs';
guard(chromium);
const out=resolve('shots/boundary-video');mkdirSync(out,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME,headless:true,args:['--mute-audio','--ignore-gpu-blocklist','--use-angle=d3d11','--enable-gpu']});
const context=await browser.newContext({viewport:{width:1280,height:720},recordVideo:{dir:join(out,'raw'),size:{width:1280,height:720}}});
const page=await context.newPage(),video=page.video(),errors=[];
page.on('pageerror',e=>errors.push(e.message));
let proof;
try{
 await page.goto('http://127.0.0.1:5405/?scene=village&trail=bridge&nopad');await page.waitForFunction(()=>window.lab?.ready,null,{timeout:120000});
 await page.evaluate(()=>{
  document.getElementById('hint')?.classList.add('off');
  const hud=document.createElement('div');hud.style.cssText='position:fixed;left:22px;top:22px;padding:12px 17px;background:#243f36df;color:#ffedc5;font:13px/1.6 Microsoft YaHei,system-ui;border-radius:5px;z-index:60;pointer-events:none';
  hud.innerHTML='<div style="font-size:11px;opacity:.8">林缘石桥 · 实机连续步行 / 不加速</div><b id="boundary-video-stage"></b><div id="boundary-video-position" style="font:11px/1.6 Consolas,monospace"></div>';document.body.append(hud);
  const title=hud.querySelector('b'),label=hud.querySelector('#boundary-video-position'),began=performance.now();
  window.__boundaryVideo={began,events:[],done:false};const proof=window.__boundaryVideo;
  let last=null,index=0,finished=0;
  function attach(L){
   const incoming=L.travel.regionId==='autumn',route=L.travel.walking.routes.find(r=>r.to===(incoming?'village':'autumn'));
   let nearest=0;for(let i=0;i<route.points.length;i++)if(route.points[i].distanceTo(L.player.feet)<route.points[nearest].distanceTo(L.player.feet))nearest=i;
   index=nearest+(incoming?-1:1);L.follow.want=11;L.follow.pitch=.13;L.follow.lift=1.3;
   L.setInput(dt=>{
    const b=route.boundary,p=L.player.feet;
    if(incoming&&b.progress(p.x,p.z)<10&&!finished){finished=performance.now();proof.events.push({event:'walked out into autumn',seconds:(finished-began)/1000});}
    if(finished||performance.now()-began<2000)return {move:{x:0,y:0},look:{x:0,y:0},zoom:0,device:'keyboard'};
    while(index>0&&index<route.points.length-1&&Math.hypot(route.points[index].x-p.x,route.points[index].z-p.z)<.9)index+=incoming?-1:1;
    const target=route.points[index],yaw=Math.atan2(target.x-p.x,target.z-p.z),turn=Math.atan2(Math.sin(yaw-L.follow.yaw),Math.cos(yaw-L.follow.yaw));
    return {move:{x:0,y:1},walk:false,sprint:false,strafe:false,jump:false,look:{x:-turn*Math.min(1,dt*7),y:0},zoom:0,device:'keyboard'};
   });
   if(incoming)proof.events.push({event:'crossed canonical centre',seconds:(performance.now()-began)/1000,scene:L.travel.regionId});
  }
  function tick(){
   const L=window.lab;
   if(L?.ready&&!worldTravel.busy){
    if(L!==last){last=L;attach(L)}
    const route=L.travel.walking.routes.find(r=>r.boundary.spec.id==='bridge'),local=route.boundary.project(L.player.feet.x,L.player.feet.z);
    title.textContent=finished?'已连续走入秋日森林':L.travel.regionId==='village'?'麦田 → 混交林缘 → 石桥':'石桥 → 秋日森林';
    label.textContent=`沿路位置 ${local.s.toFixed(1)}m  |  ${( (performance.now()-began)/1000).toFixed(1)}s`;
    if(finished&&performance.now()-finished>3500)proof.done=true;
   }else title.textContent='交界区块加载中（保留真实等待过程）';
   if(!proof.done)requestAnimationFrame(tick);
  }tick();
 });
 for(let i=0;i<24;i++){
  try{await page.waitForFunction(()=>window.__boundaryVideo?.done,null,{timeout:5000});break}catch{}
  console.log('RECORD',await page.evaluate(()=>({scene:document.documentElement.dataset.scene,busy:worldTravel.busy,position:lab?.player?.feet?.toArray()})));
 }
 proof=await page.evaluate(()=>window.__boundaryVideo);
 await page.screenshot({path:join(out,'final.png')});writeFileSync(join(out,'proof.json'),JSON.stringify({proof,errors},null,2));
 assert(proof.done,'walked through BOTH halves in real time');assert.deepEqual(errors,[]);
}finally{await page.close();await context.close();await browser.close()}
const raw=await video.path(),mp4=join(out,'boundary-walk.mp4');
execFileSync('ffmpeg',['-y','-loglevel','error','-i',raw,'-an','-c:v','libx264','-preset','medium','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',mp4]);console.log('VIDEO',mp4,proof.events);
