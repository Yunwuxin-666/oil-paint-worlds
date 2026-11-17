import * as THREE from 'three';
import {SCENE,showScene} from '../scenes.js';
import {REGIONS,regionById} from './regions.js';
import {createWaystation} from './waystation.js';
import {createWalkingConnections} from './walk-connections.js';
import './world-map.css';

const PROGRESS_KEY='painted-worlds-progress-v1';
const safeRead=()=>{try{return JSON.parse(sessionStorage.getItem(PROGRESS_KEY))??{}}catch{return {}}};
export function createWorldTravel({shared,scene,player,input,follow,camera,heightAt,spawn,pathAt,physics,animator,game,props,capture,signal}){
 const region=regionById(SCENE),saved=safeRead();let expanded=false,selected=SCENE,traveling=false,clock=0,nextDOM=0;
 physics.step();
 const station=createWaystation({shared,scene,player,heightAt,spawn,pathAt});
 physics.step();
 // Retain each region's small activity when travelling elsewhere in this tab.
 if(game?.state&&saved[SCENE]){
  Object.assign(game.state,saved[SCENE]);
  if(SCENE==='village')props.drawPicture(game.state.complete);
  if(SCENE==='alpine')for(const cow of props.cows)cow.fed=game.state.fed.includes(cow.id);
 }
 function save(){if(!game?.state)return;const all=safeRead();all[region.id]=JSON.parse(JSON.stringify(game.state));try{sessionStorage.setItem(PROGRESS_KEY,JSON.stringify(all))}catch{}}
 function arrive(){
  if(new URLSearchParams(location.search).get('arrival')!=='waystation')return;
  const {x,z}=station.landing,y=heightAt(x,z),half=player.halfHeight();
  player.body.setTranslation({x,y:y+player.t.radius+half+.05,z},true);physics.propagateModifiedBodyPositionsToColliders();
  player.feet.set(x,y,z);player.prevFeet.copy(player.feet);player.visualY=y;player.vel.set(0,0,0);player.speed=0;player.grounded=true;
  player.yaw=player.lastYaw=Math.PI;follow.yaw=Math.PI;follow.pivot.set(0,0,0);animator.lock=animator.lockOff=null;
  const url=new URL(location.href);url.searchParams.delete('arrival');history.replaceState(null,'',url);
 }
 arrive();
 const walking=createWalkingConnections({shared,scene,player,input,follow,heightAt,pathAt,spawn,capture,physics,RAPIER:player.R,onCross(to,walk){save();window.worldTravel.switchScene(to,{walk});}});
 // Shareable walking-trail entrances for reviewing the real playable geometry.
 const entry=new URLSearchParams(location.search).get('trail');
 const entrance=walking.routes.find(r=>r.boundary.spec.id===entry||r.to===entry);
 if(entrance){
  const b=entrance.boundary,s=b.sEnd+b.sign*8,p=b.point(b.path(s),s,b.height(b.path(s),s)),half=player.halfHeight();
  player.body.setTranslation({x:p.x,y:p.y+player.t.radius+half+.03,z:p.z},true);physics.propagateModifiedBodyPositionsToColliders();player.feet.copy(p);player.prevFeet.copy(p);player.visualY=p.y;player.vel.set(0,0,0);player.speed=0;player.grounded=true;
  player.yaw=player.lastYaw=b.yaw+(b.sign<0?Math.PI:0);follow.yaw=player.yaw;follow.free=null;follow.pivot.set(0,0,0);walking.updateBoundary();
  const url=new URL(location.href);url.searchParams.delete('trail');history.replaceState(null,'',url);
 }
 if(capture)return {station,walking,regionId:SCENE,recover:walking.recover,update(time,dt){station.update(time);walking.update(time,dt)},save,open(){},close(){}};
 const atlas=document.createElement('section');atlas.id='world-atlas';atlas.setAttribute('aria-label','五境漫游世界地图');
 atlas.style.setProperty('--atlas-image',`url("${new URL('./world-map-v2.png',location.href).href}")`);
 atlas.innerHTML=`<button type="button" class="atlas-head" aria-label="展开世界地图" aria-expanded="false" aria-controls="atlas-details"><span class="atlas-heading"><strong>五境漫游</strong><small>世界地图</small></span><span class="atlas-head-action"><kbd>M</kbd><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg><span class="atlas-close-icon" aria-hidden="true">×</span></span></button><div class="atlas-sheet"><div class="atlas-map-column"><div class="atlas-picture"><img src="./world-map-v2.png" alt="五区油画地图：雪岭、牧场、秋林、麦田和东南红岩双拱">${REGIONS.map(r=>`<button type="button" class="atlas-point" data-region="${r.id}" style="left:${r.x/12}%;top:${r.y/8}%" aria-label="选择${r.name}" aria-current="${r.id===SCENE}">${r.name}</button>`).join('')}<i class="atlas-player" aria-hidden="true"></i></div><div class="atlas-caption"><b><i aria-hidden="true"></i>${region.name}</b><span class="atlas-mini-help">世界地图 <kbd>M</kbd></span><span class="atlas-legend">白色箭头 · 你的位置</span></div></div><div class="atlas-detail" id="atlas-details"><p class="atlas-list-label">选择目的地</p><div class="atlas-destinations">${REGIONS.map(r=>`<button type="button" data-destination="${r.id}"><span class="atlas-region-thumb" style="background-position:${r.x/12}% ${r.y/8}%" aria-hidden="true"></span><span class="atlas-region-name">${r.name}<small>${r.id===SCENE?'当前位置':r.station}</small></span><span class="atlas-region-state" aria-hidden="true">${r.id===SCENE?'●':'↗'}</span></button>`).join('')}</div><div class="atlas-selection"><p class="eyebrow"></p><h2></h2><p class="description"></p></div><button type="button" class="atlas-travel"></button><p class="atlas-travel-note">抵达驿站，继续你的旅程</p></div></div>`;
 const portalAction=document.createElement('button');portalAction.id='world-portal-action';portalAction.hidden=true;portalAction.textContent=`G · ${region.station} · 选择目的地`;
 const label=document.createElement('div');label.id='world-portal-label';label.hidden=true;label.textContent=`◎ ${region.station}`;
 const status=document.createElement('div');status.id='world-travel-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 document.body.append(atlas,portalAction,label,status);
 const head=atlas.querySelector('.atlas-head'),button=atlas.querySelector('.atlas-travel'),position=atlas.querySelector('.atlas-player');
 function select(id){if(!regionById(id))return;selected=id;const r=regionById(id);atlas.querySelector('.eyebrow').textContent=r.tag;atlas.querySelector('h2').textContent=r.name;atlas.querySelector('.description').textContent=r.description;button.disabled=id===SCENE;button.textContent=id===SCENE?'当前所在区域':`传送至${r.station}`;for(const el of atlas.querySelectorAll('[data-region],[data-destination]')){const on=(el.dataset.region??el.dataset.destination)===id;el.classList.toggle('selected',on);if(el.dataset.destination)el.setAttribute('aria-pressed',String(on));}}
 function open(id=SCENE){expanded=true;select(id);atlas.classList.add('expanded');document.body.classList.add('world-map-open');head.setAttribute('aria-expanded','true');head.setAttribute('aria-label','收起世界地图');input.suspended=true;input.keys.clear();input.pressed.clear();input.mouse.x=input.mouse.y=0;document.exitPointerLock?.();head.focus({preventScroll:true});}
 function close(){expanded=false;atlas.classList.remove('expanded');document.body.classList.remove('world-map-open');head.setAttribute('aria-expanded','false');head.setAttribute('aria-label','展开世界地图');input.suspended=false;input.keys.clear();input.pressed.clear();head.blur();}
 function travel(id){if(traveling||id===SCENE||!regionById(id))return false;traveling=true;save();status.textContent=`正在前往${regionById(id).station}…`;input.suspended=true;input.keys.clear();document.body.classList.add('world-traveling');document.exitPointerLock?.();showScene(id,{arrival:true});return true;}
 head.onclick=()=>expanded?close():open();
 atlas.querySelector('.atlas-picture img').onclick=()=>{if(!expanded)open();};
 for(const el of atlas.querySelectorAll('[data-region]'))el.onclick=()=>{if(!expanded)open(el.dataset.region);else select(el.dataset.region);};
 for(const el of atlas.querySelectorAll('[data-destination]'))el.onclick=()=>select(el.dataset.destination);
 button.onclick=()=>travel(selected);portalAction.onclick=()=>open(region.neighbors[0]);
 addEventListener('keydown',e=>{
  if(window.worldTravel?.busy)return;
  if(e.ctrlKey||e.altKey||e.metaKey)return;
  if(e.code==='KeyM'||(e.code==='Escape'&&expanded)){
   e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)(expanded?close():open());return;
  }
  if(e.code==='KeyG'&&!expanded){if(Math.hypot(player.feet.x-station.x,player.feet.z-station.z)<3.4){e.preventDefault();e.stopImmediatePropagation();if(!e.repeat)open(region.neighbors[0]);}return;}
  if(expanded&&e.code!=='Tab'&&e.code!=='Enter'&&e.code!=='Space'){e.preventDefault();e.stopImmediatePropagation();}
  if(expanded&&e.code==='Tab')e.stopImmediatePropagation();
  if(expanded&&(e.code==='Space'||e.code==='Enter'))e.stopImmediatePropagation();
 },{capture:true,signal});
 addEventListener('pagehide',save,{signal});
 select(SCENE);
 const projected=new THREE.Vector3();
 return {station,walking,regionId:SCENE,recover:walking.recover,open,close,travel,save,get expanded(){return expanded},update(time,dt){
  walking.update(time,dt);
  station.update(time);clock+=dt;if(clock<nextDOM)return;nextDOM=clock+.08;
  const d=Math.hypot(player.feet.x-station.x,player.feet.z-station.z);portalAction.hidden=expanded||d>=3.4;
  projected.set(station.x,station.y+3.65,station.z).project(camera);label.hidden=expanded||d>65||projected.z<0||projected.z>1||Math.abs(projected.x)>.92||Math.abs(projected.y)>.88;
  if(!label.hidden){label.style.left=`${(projected.x*.5+.5)*innerWidth}px`;label.style.top=`${(-projected.y*.5+.5)*innerHeight}px`;label.textContent=`◎ ${region.station} · ${Math.round(d)}m`;}
  const span=SCENE==='aurora'?470:190;
  const dx=THREE.MathUtils.clamp((player.feet.x-spawn.x)/span,-.9,.9)*110;
  const dz=THREE.MathUtils.clamp((player.feet.z-spawn.z)/span,-.9,.9)*110;
  position.style.left=`${(region.x+dx)/12}%`;position.style.top=`${(region.y+dz)/8}%`;position.style.rotate=`${Math.PI-player.yaw}rad`;
 }};
}
