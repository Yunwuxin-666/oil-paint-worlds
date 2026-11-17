import {STATIONS} from './config.js';
import './style.css';
export function createGame({player,respawn,capture,signal}){
 const state={visited:[]};let pending=false,reset=false,clock=0,until=6,message='循着沙地穿过双拱，靠近石堆按 E 留下你的观察。';
 const action=document.createElement('button');action.id='arches-action';action.hidden=true;
 const toast=document.createElement('div');toast.id='arches-toast';toast.setAttribute('role','status');
 if(!capture)document.body.append(action,toast);
 const near=()=>STATIONS.find(s=>Math.hypot(s.x-player.feet.x,s.z-player.feet.z)<3.1);
 const notify=text=>{message=text;until=clock+6;};
 function interact(){const s=near();if(!s)return false;if(!state.visited.includes(s.id))state.visited.push(s.id);notify(s.text+(state.visited.length===3?' 三处观察已完成，沿来路回驿站或继续漫游。':''));return true;}
 action.onclick=()=>pending=true;
 addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;if(e.code==='KeyE')pending=true;if(e.code==='KeyR')reset=true;},{signal});
 return {state,targets:STATIONS,interact,update(dt){clock+=dt;if(reset){reset=false;state.visited=[];respawn();notify('回到峡谷入口，重新出发。');}if(pending){pending=false;interact();}const s=near();action.hidden=!s;if(s)action.textContent=`E · ${s.name} · ${state.visited.includes(s.id)?'再次观察':`${state.visited.length}/3`}`;toast.textContent=message;toast.classList.toggle('visible',clock<until);}};
}
