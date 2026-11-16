import { STATIONS } from './config.js';
import './style.css';
export function createGame({props,player,respawn,capture,signal}){
 const state={colors:[],complete:false};let pending=false,resetPending=false,time=0,until=7,message='沿田埂入村，在三处调色台采色，再回画架作画。';
 const action=document.createElement('button');action.id='village-action';action.hidden=true;
 const toast=document.createElement('div');toast.id='village-toast';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');
 if(!capture)document.body.append(action,toast);
 const near=()=>STATIONS.filter(s=>Math.hypot(s.x-player.feet.x,s.z-player.feet.z)<2.7).sort((a,b)=>Math.hypot(a.x-player.feet.x,a.z-player.feet.z)-Math.hypot(b.x-player.feet.x,b.z-player.feet.z))[0];
 const notify=t=>{message=t;until=time+5;};
 function reset(){state.colors=[];state.complete=false;props.drawPicture(false);respawn();notify('新画布准备好了，沿小路寻找麦田金、柏树绿与远山蓝。');}
 function interact(){const s=near();if(!s)return false;if(s.id==='easel'){
  if(state.colors.length<3)notify(`还缺 ${3-state.colors.length} 种颜色。调色台沿着村中小路排列。`);
  else {state.complete=true;props.drawPicture(true);notify('画作完成。你把麦田、柏树与远山带回了画布。');}
 }else if(!state.colors.includes(s.id)){state.colors.push(s.id);notify(`采得「${s.name}」 · ${state.colors.length}/3${state.colors.length===3?'，回村口画架完成画作。':''}`);}else notify(`「${s.name}」已经在调色盘上。`);return true;}
 action.onclick=()=>{pending=true;action.blur();};
 addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;if(e.code==='KeyE')pending=true;if(e.code==='KeyR')resetPending=true;},{signal});
 return {state,targets:STATIONS,reset,interact,update(dt){time+=dt;if(resetPending){resetPending=false;reset();}if(pending){pending=false;interact();}const s=near();action.hidden=!s;if(s)action.textContent=s.id==='easel'?'E · 在画布上作画':`E · 采集${s.name}`;toast.textContent=message;toast.classList.toggle('visible',time<until);}};
}
