import {SCENE,SCENE_IDS,setScene,showScene} from './scenes.js';
import {Cache} from 'three';
Cache.enabled=true;

const loaders={aurora:()=>import('./night/main.js'),autumn:()=>import('./main.js'),alpine:()=>import('./alpine/main.js'),village:()=>import('./village/main.js'),arches:()=>import('./arches/main.js')};
let runtime,busy=false;
function updateNavigation(){
 document.documentElement.dataset.scene=SCENE;
 for(const el of document.querySelectorAll('#scenes button'))el.classList.toggle('on',el.dataset.scene===SCENE);
}
function ensureLoading(){if(!document.getElementById('loading')){const el=document.createElement('div');el.id='loading';el.textContent='沿山路前行…';document.body.append(el)}if(!document.getElementById('hint')){const el=document.createElement('div');el.id='hint';document.body.append(el)}const hint=document.getElementById('hint');hint.className='';hint.textContent='WASD 移动 · M 地图 · G 驿站';}
async function switchScene(id,options={}){
 if(busy||id===SCENE||!SCENE_IDS.includes(id))return false;
 busy=true;window.worldTravel.busy=true;
 const before=runtime.lab,held=[...before.input.keys],look={pitch:before.follow.pitch,want:before.follow.want,side:before.follow.side,lift:before.follow.lift};
 const released=new Set(),handoff=new AbortController(),speed=before.player.speed,orbit=before.follow.yaw-before.player.yaw;
 window.addEventListener('keyup',e=>released.add(e.code),{capture:true,signal:handoff.signal});
 let veil;
 try{
  before.travel.save();before.input.suspended=true;before.renderer.setAnimationLoop(null);
  before.frame.render(before.scene,before.camera);
  if(options.walk?.boundary){
   document.body.classList.add('boundary-loading');
   // Keep the actual outgoing canvas until the incoming renderer has painted
   // the SAME canonical valley. No screenshot veil or crossfade for walking.
   const old=runtime,walk=options.walk,source=before.travel.walking.routes.find(r=>r.to===id).boundary;
   const heading=before.player.yaw-source.yaw,orbitYaw=before.follow.yaw-source.yaw;
   const oldCamera=before.camera.position.clone(),oldPivot=before.follow.pivot.clone(),oldDistance=before.follow.distance,time=before.shared.uTime.value;
   const phase=before.animator.phase;
   old.removeUI();
   const module=await loaders[id]();
   setScene(id);const url=new URL(location.href);url.searchParams.set('scene',id);url.searchParams.delete('arrival');history.replaceState({scene:id},'',url);updateNavigation();ensureLoading();
   runtime=await module.startWorld({background:true});
   const L=runtime.lab,b=L.travel.walking.routes.find(r=>r.to===walk.from).boundary,p=b.point(walk.u,walk.s,walk.y);
   p.y=L.heightAt(p.x,p.z);
   L.teleport(p.x,p.z,p.x+Math.sin(b.yaw+heading),p.z+Math.cos(b.yaw+heading));
   const player=L.player,half=player.halfHeight();
   player.body.setTranslation({x:p.x,y:p.y+player.t.radius+half+.02,z:p.z},true);L.physics.propagateModifiedBodyPositionsToColliders();player.feet.copy(p);player.prevFeet.copy(p);player.visualY=p.y;
   player.yaw=player.lastYaw=b.yaw+heading;player.speed=speed;
   L.animator.phase=phase;L.animator.freeSpeed=speed;
   player.vel.copy(before.player.vel).applyAxisAngle(new L.THREE.Vector3(0,1,0),b.yaw-source.yaw);
   Object.assign(L.follow,look);L.follow.distance=oldDistance;L.follow.yaw=b.yaw+orbitYaw;
   const transform=v=>{const local=source.project(v.x,v.z);return b.point(local.u,local.s,v.y-source.end.y)};
   L.follow.free=before.follow.free?{position:transform(before.follow.free.position),target:transform(before.follow.free.target)}:null;
   L.follow.pivot.copy(transform(oldPivot));L.camera.position.copy(transform(oldCamera));
   L.setTime(time);
   L.input.keys=new Set(held.filter(k=>!released.has(k)&&!['KeyM','KeyG'].includes(k)));
   L.travel.walking.updateBoundary();L.step(1/60);
   L.travel.update(time,.2);runtime.activateUI();
   L.renderer.domElement.style.visibility='';old.dispose();
   window.lab=L;window.worldTravel.visits.push({from:walk.from,to:id,walk:true,boundary:b.spec.id});
   return true;
  }
  veil=document.createElement('div');veil.id='world-transition';
  const image=document.createElement('img');image.src=before.renderer.domElement.toDataURL('image/png');veil.append(image);
  const text=document.createElement('span');text.textContent=options.walk?'沿连接道前行…':'正在前往驿站…';veil.append(text);document.body.append(veil);
  const module=await loaders[id]();
  runtime.dispose();window.lab={ready:false};
  setScene(id);const url=new URL(location.href);url.searchParams.set('scene',id);url.searchParams.delete('arrival');if(options.arrival)url.searchParams.set('arrival','waystation');history.replaceState({scene:id},'',url);updateNavigation();ensureLoading();
  runtime=await module.startWorld();
  if(options.walk){
   const route=runtime.lab.travel.walking.routes.find(r=>r.to===options.walk.from);
   if(route){
    const p=route.points[Math.max(0,route.points.length-8)],toward=route.points[Math.max(0,route.points.length-14)];
    runtime.lab.teleport(p.x,p.z,toward.x,toward.z);Object.assign(runtime.lab.follow,look);runtime.lab.follow.distance=look.want;runtime.lab.follow.yaw=runtime.lab.player.yaw+orbit;
    runtime.lab.input.keys=new Set([...runtime.lab.input.keys,...held.filter(k=>!released.has(k)&&!['KeyM','KeyG'].includes(k))]);
    if(['KeyW','KeyA','KeyS','KeyD'].some(k=>runtime.lab.input.keys.has(k))){const p=runtime.lab.player;p.speed=speed;p.vel.set(Math.sin(p.yaw)*speed,0,Math.cos(p.yaw)*speed);p.mode='move';}
    // The camera is turned along the destination trail; forward remains forward.
    runtime.lab.follow.pivot.set(0,0,0);runtime.lab.step(1/60,2);
   }
  }
  window.worldTravel.visits.push({from:before.travel.regionId,to:id,walk:!!options.walk});
  veil.classList.add('arrived');setTimeout(()=>veil.remove(),300);
  return true;
 }catch(error){veil?.remove();busy=false;window.worldTravel.busy=false;throw error;}
 finally{handoff.abort();document.body.classList.remove('boundary-loading');busy=false;window.worldTravel.busy=false;}
}
window.worldTravel={switchScene,preload:id=>loaders[id]?.(),busy:false,visits:[]};
const q=new URLSearchParams(location.search);if(q.has('capture')||q.has('clean'))document.getElementById('scenes')?.remove();
for(const el of document.querySelectorAll('#scenes button')){el.onclick=()=>showScene(el.dataset.scene);el.onkeydown=e=>e.preventDefault();el.onfocus=()=>el.blur();}
updateNavigation();runtime=await (await loaders[SCENE]()).startWorld();
window.addEventListener('popstate',()=>{const id=new URLSearchParams(location.search).get('scene');if(id&&id!==SCENE)switchScene(id);});
