import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright-core';
import {guard} from './no-pointer-lock.mjs';
guard(chromium);const out=resolve('shots/arches-video');mkdirSync(out,{recursive:true});
const b=await chromium.launch({executablePath:process.env.CHROME,headless:true,args:['--mute-audio','--ignore-gpu-blocklist','--use-angle=d3d11','--enable-gpu']});
const c=await b.newContext({viewport:{width:1280,height:800},recordVideo:{dir:join(out,'raw'),size:{width:1280,height:800}}}),p=await c.newPage(),video=p.video(),errors=[];
p.on('pageerror',e=>errors.push(e.message));let proof;
try{
 await p.goto(`${process.env.WORLD_URL??'http://127.0.0.1:5405/'}?scene=arches&nopad`);await p.waitForFunction(()=>window.lab?.ready,null,{timeout:180000});
 await p.evaluate(()=>{
  document.getElementById('hint')?.classList.add('off');const L=lab,start=performance.now();
  const hud=document.createElement('div');hud.style.cssText='position:fixed;left:20px;top:20px;padding:11px 16px;background:#593d2ee8;color:#ffedcc;font:13px/1.6 Microsoft YaHei,system-ui;border-radius:4px;z-index:60;pointer-events:none';document.body.append(hud);
  window.__archesFilm={done:false,events:[],footprints:0};const film=window.__archesFilm;let z=62,finish=0;
  L.setInput(dt=>{
   if(performance.now()-start<2000||finish)return {move:{x:0,y:0},look:{x:0,y:0},zoom:0,device:'keyboard'};
   const feet=L.player.feet;
   while(z>-128&&Math.hypot(-6+6*Math.sin(z/34)-feet.x,z-feet.z)<.9)z-=2;
   for(const t of L.game.targets)if(!L.game.state.visited.includes(t.id)&&Math.hypot(t.x-feet.x,t.z-feet.z)<2.9){L.game.interact();film.events.push({id:t.id,seconds:(performance.now()-start)/1000});}
   if(z<=-128&&Math.abs(feet.z-z)<1){finish=performance.now();return {move:{x:0,y:0},look:{x:0,y:0},zoom:0,device:'keyboard'};}
   const yaw=Math.atan2(-6+6*Math.sin(z/34)-feet.x,z-feet.z),turn=Math.atan2(Math.sin(yaw-L.follow.yaw),Math.cos(yaw-L.follow.yaw));
   return {move:{x:0,y:1},walk:false,sprint:false,strafe:false,jump:false,look:{x:-turn*Math.min(1,dt*6),y:0},zoom:0,device:'keyboard'};
  });
  function tick(){
   const elapsed=(performance.now()-start)/1000;
   hud.innerHTML=`<small style="opacity:.8">红岩双拱 · 实时游戏画面 / 不加速</small><br><b>${finish?'双拱穿行完成':L.player.feet.z>0?'沿沙地走向巨拱':'穿过拱腹，走向后方小拱'}</b><br>观察 ${L.game.state.visited.length}/3 · ${elapsed.toFixed(1)}s`;
   film.footprints=L.environment.tracks.filter(t=>t.z>=0).length;
   if(finish&&performance.now()-finish>2000)L.view([65,49,85],[-4,28,-40]);
   if(finish&&performance.now()-finish>6500)film.done=true;
   if(!film.done)requestAnimationFrame(tick);
  }tick();
 });
 for(let i=0;i<24;i++){try{await p.waitForFunction(()=>window.__archesFilm?.done,null,{timeout:5000});break}catch{}console.log('RECORD',await p.evaluate(()=>({feet:lab.player.feet.toArray(),visited:lab.game.state.visited})));}
 proof=await p.evaluate(()=>window.__archesFilm);assert(proof.done);assert.equal(proof.events.length,3);assert(proof.footprints>10);assert.deepEqual(errors,[]);
 await p.screenshot({path:join(out,'overview.png')});writeFileSync(join(out,'proof.json'),JSON.stringify({proof,errors},null,2));
}finally{await p.close();await c.close();await b.close()}
const file=join(out,'red-rock-arches.mp4');execFileSync('ffmpeg',['-y','-loglevel','error','-i',await video.path(),'-an','-c:v','libx264','-preset','medium','-crf','22','-pix_fmt','yuv420p','-movflags','+faststart',file]);console.log('VIDEO',file,proof);
