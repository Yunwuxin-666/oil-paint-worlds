// Record the actual running game, including the region-loading transition.
// One initial placement puts the actor before the former village boundary;
// all subsequent movement and the final fall/recovery are real game physics.
import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright-core';
import {guard} from './no-pointer-lock.mjs';
guard(chromium);
const output=resolve(process.argv[2]??'shots/edge-test-20261117');mkdirSync(output,{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROME,headless:true,args:['--mute-audio','--ignore-gpu-blocklist','--use-angle=d3d11','--enable-gpu']});
const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1,recordVideo:{dir:join(output,'raw'),size:{width:1280,height:720}}});
const page=await context.newPage(),video=page.video(),errors=[];
page.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.message)});
let proof;
try{
 await page.goto('http://127.0.0.1:5405/?scene=village&nopad');
 await page.waitForFunction(()=>window.lab?.ready,null,{timeout:120000});
 await page.evaluate(()=>{
  const L=lab,route=L.travel.walking.routes.find(r=>r.to==='alpine');
  let start=0;for(let i=0;i<route.points.length;i++)if(Math.abs(route.points[i].z+92)<Math.abs(route.points[start].z+92))start=i;
  const p=route.points[start],q=route.points[start+1];L.teleport(p.x,p.z,q.x,q.z);L.follow.want=L.follow.distance=11.5;L.follow.pitch=.18;L.follow.lift=2.8;
  const hud=document.createElement('div');hud.id='edge-proof-hud';
  hud.style.cssText='position:fixed;left:20px;top:20px;width:440px;max-width:80vw;padding:15px 18px;border-radius:5px;background:#142d29ee;color:#fff4d4;font:14px/1.7 Microsoft YaHei,system-ui;z-index:60;pointer-events:none;box-sizing:border-box';
  hud.innerHTML='<div style="font-size:11px;color:#d2dcbf;letter-spacing:1px">边缘实测录像 · 实时游戏画面 / 不加速</div><b id="edge-proof-title" style="display:block;font-size:19px;margin:4px 0"></b><div id="edge-proof-sub"></div><div id="edge-proof-position" style="font:12px/1.7 Consolas,monospace;color:#d3ddcf;margin-top:7px"></div>';
  document.body.append(hud);document.getElementById('hint')?.classList.add('off');
  const title=hud.querySelector('#edge-proof-title'),sub=hud.querySelector('#edge-proof-sub'),position=hud.querySelector('#edge-proof-position');
  const began=performance.now(),token=Math.random(),events=[];
  window.__edgeProof={token,began,setup:{scene:'village',x:p.x,z:p.z,description:'仅测试开始前放置角色到旧边界前；之后全程行走'},events,crossBoundaryZ:false,crossRegion:false,crossBoundaryX:false,naturalFall:false,recovered:false,done:false};
  const proof=window.__edgeProof;
  let phase=0,index=start+1,previousScene='village',previousX=p.x,previousY=p.y,previousZ=p.z,finishedAt=0;
  const event=(name,data={})=>events.push({name,seconds:+((performance.now()-began)/1000).toFixed(2),...data});
  function guide(l,go,target){
   l.input.keys.add('KeyW');
   l.setInput(dt=>{
    const aim=target(l),dx=aim.x-l.player.feet.x,dz=aim.z-l.player.feet.z,want=Math.atan2(dx,dz),turn=Math.atan2(Math.sin(want-l.follow.yaw),Math.cos(want-l.follow.yaw));
    return {move:{x:0,y:go()?1:0},walk:false,sprint:false,strafe:false,jump:false,look:{x:-turn*Math.min(1,dt*6),y:0},zoom:0,device:'keyboard'};
   });
  }
  function line(l,axis,value,color){
   const points=[];for(let i=-16;i<=16;i++){const x=axis==='z'?l.player.feet.x+i:value,z=axis==='z'?value:l.player.feet.z+i;points.push(new l.THREE.Vector3(x,l.heightAt(x,z)+.13,z));}
   const mesh=new l.THREE.Line(new l.THREE.BufferGeometry().setFromPoints(points),new l.THREE.LineDashedMaterial({color,dashSize:.65,gapSize:.45,transparent:true,opacity:.9,depthTest:false}));mesh.computeLineDistances();mesh.renderOrder=25;l.scene.add(mesh);
  }
  line(L,'z',-105,0xf6d174);
  guide(L,()=>performance.now()-began>2200,()=>{
   while(index<route.points.length-1&&Math.hypot(route.points[index].x-L.player.feet.x,route.points[index].z-L.player.feet.z)<.85)index++;
   return route.points[index];
  });
  function tick(){
   const l=window.lab;if(!l?.ready||window.worldTravel.busy){title.textContent='02 / 步行进入相邻区域';sub.textContent='保留真实的分区加载过程，不刷新页面。';requestAnimationFrame(tick);return;}
   const scene=document.documentElement.dataset.scene,p=l.player.feet,elapsed=(performance.now()-began)/1000;
   if(scene==='village'){
    title.textContent='01 / 走过原来的区域边界';
    sub.textContent=proof.crossBoundaryZ?'✓ 已走过 Z=-105，角色继续前进，没有回出生点。':'黄虚线为旧北界 Z=-105；沿连接道前往雪山牧场。';
    if(p.z<-105&&!proof.crossBoundaryZ){proof.crossBoundaryZ=true;event('crossed former village boundary',{x:p.x,z:p.z});}
   }
   if(scene==='alpine'&&previousScene!=='alpine'){
    phase=1;proof.crossRegion=true;event('walked into alpine without reloading',{x:p.x,z:p.z});
    l.follow.pitch=.18;l.follow.lift=2.8;l.follow.want=11.5;
    line(l,'x',105,0xf6d174);line(l,'x',192,0xe79b7a);
    guide(l,()=>!proof.recovered,cur=>({x:230,z:cur.player.feet.z}));
    previousX=p.x;previousY=p.y;previousZ=p.z;
   }
   if(phase===1){
    title.textContent=elapsed<20?'02 / 已步行到达雪山牧场':'03 / 继续走向真正的地形边缘';
    sub.textContent=proof.crossBoundaryX?'✓ X 已超过旧边界 105m；继续测试 192m 处的物理地形边缘。':'持续向东行走：黄线为旧边界 105m，红线为物理地形边缘 192m。';
    if(p.x>105&&!proof.crossBoundaryX){proof.crossBoundaryX=true;event('crossed former alpine X boundary',{x:p.x,z:p.z});}
    if(p.y<l.heightAt(p.x,p.z)-.5&&!proof.naturalFall){proof.naturalFall=true;event('natural fall after leaving physical terrain',{x:p.x,y:p.y,z:p.z});}
    if(proof.naturalFall&&previousX-p.x>2){
     proof.recovered=true;proof.recovery={before:{x:previousX,y:previousY,z:previousZ},after:{x:p.x,y:p.y,z:p.z},distanceFromAlpineSpawn:Math.hypot(p.x-(11*Math.sin(76/34)+76*.12),p.z-76)};
     event('recovered to recent safe footing',proof.recovery);l.input.keys.clear();finishedAt=performance.now();phase=2;
    }
   }
   if(phase===2){
    title.textContent='04 / 安全恢复核验通过';sub.textContent='✓ 已回到最近的安全地面；没有回牧场出生点。';
    if(performance.now()-finishedAt>4500){proof.done=true;event('recording complete');}
   }
   position.textContent=`${scene==='village'?'柏树麦田':'雪山牧场'}  X ${p.x.toFixed(1)}  Y ${p.y.toFixed(1)}  Z ${p.z.toFixed(1)}  |  ${elapsed.toFixed(1)}s`;
   previousScene=scene;previousX=p.x;previousY=p.y;previousZ=p.z;
   if(!proof.done)requestAnimationFrame(tick);
  }
  event('initial placement complete');tick();
 });
 for(let i=0;i<32;i++){
  try{await page.waitForFunction(()=>window.__edgeProof?.done,null,{timeout:5000});break;}catch{}
  console.log('RECORDING',await page.evaluate(()=>({scene:document.documentElement.dataset.scene,at:window.lab?.player?.feet?.toArray(),crossed:window.__edgeProof?.crossBoundaryX,fall:window.__edgeProof?.naturalFall,recovered:window.__edgeProof?.recovered})));
 }
 proof=await page.evaluate(()=>window.__edgeProof);
 writeFileSync(join(output,'proof.json'),JSON.stringify({recording:'Realtime Playwright screen recording; no game-time acceleration; one disclosed initial placement; natural fall, no injected failure',proof,errors},null,2));
 await page.screenshot({path:join(output,'final-frame.png')});
 assert(proof.crossBoundaryZ&&proof.crossRegion&&proof.crossBoundaryX&&proof.naturalFall&&proof.recovered&&proof.done,'all recorded edge checks complete');
 assert(proof.recovery.distanceFromAlpineSpawn>100,'recovery did not return to spawn');assert.deepEqual(errors,[]);
}finally{await page.close();await context.close();await browser.close();}
const raw=await video.path(),mp4=join(output,'edge-test.mp4');
execFileSync('ffmpeg',['-y','-loglevel','error','-i',raw,'-an','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-movflags','+faststart',mp4]);
console.log('VIDEO',mp4);console.log('EVENTS',proof.events);
