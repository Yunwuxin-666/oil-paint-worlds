import * as THREE from 'three';
import { GATE, LOOKOUT, BUS } from './config.js';
import { heightAt } from './land.js';
import './style.css';

export function createGame({props,player,camera,physics,RAPIER,respawn,capture}){
 const state={started:false,complete:false,viewpoint:false,gateOpen:false,fed:[],elapsed:0};
 let pending=false,resetPending=false,gateAngle=0,message='欢迎来到雪山牧场。先到小巴旁领取饲料。',messageUntil=9,time=0;
 const interaction=document.createElement('button');interaction.id='pasture-action';interaction.type='button';interaction.hidden=true;
 const toast=document.createElement('div');toast.id='pasture-toast';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');
 const markers=document.createElement('div');markers.id='pasture-markers';markers.setAttribute('aria-hidden','true');
 if(!capture)document.body.append(interaction,toast,markers);
 const notify=text=>{message=text;messageUntil=time+5;};
 const dist=p=>Math.hypot(player.feet.x-p.x,player.feet.z-p.z);
 const targets=[
   {id:'supply',name:'小巴 · 饲料箱',...props.supply,radius:2.6},
   {id:'gate',name:'牧场门',x:GATE.x+GATE.width/2,z:GATE.z,radius:3.2},
   ...props.cows.map(c=>({id:c.id,name:c.name,x:c.x,z:c.z,radius:2.8})),
   {id:'lookout',name:'溪畔观景点',...LOOKOUT,radius:2.8},
 ];
 const gy=heightAt(GATE.x,GATE.z);
 const gateCollider=physics.createCollider(RAPIER.ColliderDesc.cuboid(GATE.width/2,.56,.10).setTranslation(GATE.x+GATE.width/2,gy+.54,GATE.z));
 function label(t){
   if(t.id==='supply')return !state.started?'领取三份饲料':state.fed.length===3&&!state.complete?'交回篮子，完成巡场':state.complete?'再次巡场':'饲料已领取，去找牛群吧';
   if(t.id==='gate')return state.gateOpen?'关上牧场门':'打开牧场门';
   if(t.id==='lookout')return state.viewpoint?'欣赏雪山全景':'记录溪畔风景';
   return state.fed.includes(t.id)?`${t.name}吃饱了 · 轻轻打招呼`:state.started?`喂食${t.name}`:'先到小巴旁领取饲料';
 }
 function reset(){
   Object.assign(state,{started:false,complete:false,viewpoint:false,gateOpen:false,fed:[],elapsed:0});
   for(const c of props.cows){c.fed=false;c.reaction=0;}
   respawn();notify('新的一次巡场开始了。去小巴旁领取饲料。');
 }
 function interact(){
   const t=targets.filter(t=>dist(t)<t.radius).sort((a,b)=>dist(a)-dist(b))[0];
   if(!t){notify('靠近饲料箱、牛群、牧场门或观景牌后按 E。');return false;}
   if(t.id==='gate'){state.gateOpen=!state.gateOpen;notify(state.gateOpen?'牧场门打开了。':'牧场门已关好。');}
   else if(t.id==='supply'){
     if(state.complete)reset();
     else if(!state.started){state.started=true;notify('已领取三份饲料。靠近牛群按 E 喂食。');}
     else if(state.fed.length===3){state.complete=true;notify('巡场完成！三头牛都吃饱了。你可以继续散步，或重新巡场。');}
     else notify(`还剩 ${3-state.fed.length} 份饲料，牛群在等你。`);
   }else if(t.id==='lookout'){state.viewpoint=true;notify('已记录溪畔风景。雪峰、森林与牧场，在这里汇成一幅画。');}
   else{
     const c=props.cows.find(c=>c.id===t.id);
     if(!state.started){notify('篮子还是空的，先去小巴旁领取饲料。');return false;}
     c.reaction=3;
     if(!c.fed){c.fed=true;state.fed.push(c.id);notify(`${c.name}吃饱了。${state.fed.length===3?'返回小巴交回篮子，完成巡场。':`已喂食 ${state.fed.length}/3 头。`}`);}
     else notify(`${c.name}抬起头，向你打了个招呼。`);
   }
   return true;
 }
 interaction.addEventListener('click',()=>{pending=true;interaction.blur();});
 addEventListener('keydown',e=>{
   if(e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;
   if(e.code==='KeyE')pending=true;
   if(e.code==='KeyR')resetPending=true;
 });
 const markerNodes=new Map();
 for(const t of targets){const el=document.createElement('span');el.className='pasture-marker';markers.append(el);markerNodes.set(t.id,el);}
 function update(dt){
   time+=dt;if(state.started&&!state.complete)state.elapsed+=dt;
   if(resetPending){resetPending=false;reset();}
   if(pending){pending=false;interact();}
   gateAngle+=(state.gateOpen?-1.45-gateAngle:-gateAngle)*Math.min(1,dt*5);
   props.gate.group.rotation.y=gateAngle;
   gateCollider.setRotation({x:0,y:Math.sin(gateAngle/2),z:0,w:Math.cos(gateAngle/2)});
   gateCollider.setTranslation({x:GATE.x+Math.cos(gateAngle)*GATE.width/2,y:gy+.54,z:GATE.z-Math.sin(gateAngle)*GATE.width/2});
   const nearby=targets.filter(t=>dist(t)<t.radius).sort((a,b)=>dist(a)-dist(b))[0];
   const todo=!state.started?targets.filter(t=>t.id==='supply'):state.fed.length<3?targets.filter(t=>props.cows.some(c=>c.id===t.id)&&!state.fed.includes(t.id)):targets.filter(t=>t.id==='supply');
   interaction.hidden=!nearby;
   if(nearby)interaction.textContent=`E · ${label(nearby)}`;
   toast.textContent=message;toast.classList.toggle('visible',time<messageUntil);
   for(const t of targets){
     const el=markerNodes.get(t.id),d=dist(t),p=new THREE.Vector3(t.x,heightAt(t.x,t.z)+(t.id==='supply'?1.5:2.1),t.z).project(camera);
     const relevant=todo.includes(t)||t.id==='lookout'||(t.id==='gate'&&d<12);
     const visible=relevant&&d>3&&d<120&&p.z>-1&&p.z<1&&Math.abs(p.x)<.93&&Math.abs(p.y)<.85;
     el.hidden=!visible;if(!visible)continue;
     el.style.left=`${(p.x*.5+.5)*innerWidth}px`;el.style.top=`${(-p.y*.5+.5)*innerHeight}px`;
     el.textContent=`${t.name} · ${Math.round(d)}m`;
   }
 }
 return {state,targets,update,interact,reset,gateCollider};
}
