import * as THREE from 'three';
import {createKit} from '../night/kit.js';
import {SCENE} from '../scenes.js';
import {regionById} from './regions.js';

export const WALK_LINKS={
 aurora:[{to:'alpine',z:-50,endOffset:14},{to:'autumn',z:320}],
 alpine:[{to:'aurora',z:-150},{to:'village',z:150}],
 autumn:[{to:'aurora',z:-150},{to:'village',z:150}],
 village:[{to:'alpine',z:-150},{to:'autumn',z:150}],
};

// Terrain-aware A*: roads avoid existing trunks, buildings and unclimbable slopes.
// Two metre samples follow the same heightfield the character controller walks on.
function plan({player,heightAt,pathAt,startZ,endZ,endOffset=0}){
 const cell=2,start={x:Math.round(pathAt(startZ)/cell),z:Math.round(startZ/cell)},goal={x:Math.round((pathAt(endZ)+endOffset)/cell),z:Math.round(endZ/cell)};
 const z0=Math.min(start.z,goal.z)-4,z1=Math.max(start.z,goal.z)+4;
 const centres=Array.from({length:z1-z0+1},(_,i)=>pathAt((z0+i)*cell)/cell);
 const x0=Math.floor(Math.min(...centres)-16),x1=Math.ceil(Math.max(...centres)+16);
 const nodes=new Map(),heap=[];
 const push=n=>{heap.push(n);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].f<=n.f)break;heap[i]=heap[p];i=p;}heap[i]=n;};
 const pop=()=>{const top=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].f<heap[c].f)c++;if(heap[c].f>=last.f)break;heap[i]=heap[c];i=c;}heap[i]=last;}return top;};
 const at=(ix,iz)=>{
  const key=`${ix},${iz}`;if(nodes.has(key))return nodes.get(key);
  const x=ix*cell,z=iz*cell,y=heightAt(x,z);let clear=Number.isFinite(y)&&y>(SCENE==='aurora'?15:-50);
  const p=new THREE.Vector3(x,y+.95,z);
  if(clear)for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1],[.707,.707],[-.707,.707],[.707,-.707],[-.707,-.707]])if(player.castRay(p,new THREE.Vector3(dx,0,dz),.95)!=null){clear=false;break;}
  const n={key,ix,iz,x,z,y,clear,g:Infinity,f:Infinity,parent:null,closed:false};nodes.set(key,n);return n;
 };
 const first=at(start.x,start.z);first.g=0;first.f=Math.hypot(goal.x-start.x,goal.z-start.z);push(first);let reached;
 while(heap.length&&nodes.size<24000){
  const n=pop();if(n.closed)continue;n.closed=true;
  if(Math.hypot(n.ix-goal.x,n.iz-goal.z)<1.5){reached=n;break;}
  for(const [dx,dz] of [[0,1],[0,-1],[1,0],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1],[2,1],[-2,1],[2,-1],[-2,-1],[1,2],[-1,2],[1,-2],[-1,-2]]){
   const ix=n.ix+dx,iz=n.iz+dz;if(ix<x0||ix>x1||iz<z0||iz>z1)continue;
   const next=at(ix,iz),length=Math.hypot(dx,dz)*cell,grade=Math.abs(next.y-n.y)/length;
   if(!next.clear||next.closed||grade>.70)continue;
   if(dx&&dz&&(!at(ix,n.iz).clear||!at(n.ix,iz).clear))continue;
   if(!at((n.ix+ix)/2,(n.iz+iz)/2).clear)continue;
   const cost=n.g+length*(1+grade*2)+Math.abs(next.x-pathAt(next.z))*.025;
   if(cost>=next.g)continue;next.g=cost;next.parent=n;next.f=cost+Math.hypot(next.ix-goal.x,next.iz-goal.z)*cell;push(next);
  }
 }
 if(!reached){const closed=[...nodes.values()].filter(n=>n.closed);throw new Error(`No walkable connection from ${SCENE} to z=${endZ}; start=${first.clear}/${first.y}; goal=${at(goal.x,goal.z).clear}/${at(goal.x,goal.z).y}; reached z=${Math.min(...closed.map(n=>n.z))}..${Math.max(...closed.map(n=>n.z))}; nodes=${nodes.size}`);}
 const points=[];for(let n=reached;n;n=n.parent)points.push(new THREE.Vector3(n.x,n.y,n.z));points.reverse();
 return points;
}

export function createWalkingConnections({shared,scene,player,input,follow,heightAt,pathAt,spawn,onCross,capture}){
 const group=new THREE.Group();group.name='regional-walking-trails';scene.add(group);
 const current=SCENE,anchorZ=spawn.z-20;
 const routes=WALK_LINKS[current].map(link=>({...link,points:plan({player,heightAt,pathAt,startZ:anchorZ,endZ:link.z,endOffset:link.endOffset})}));
 for(const route of routes){route.remaining=new Array(route.points.length).fill(0);for(let i=route.points.length-2;i>=0;i--){const a=route.points[i],c=route.points[i+1];route.remaining[i]=route.remaining[i+1]+Math.hypot(a.x-c.x,a.z-c.z);}}
 const night=current==='aurora';
 const b=createKit(shared,{seed:583232,haze:true,palettes:{
  path:night?{l:[.59,.75,.74],m:[.32,.51,.56],s:[.14,.28,.38]}:{l:[.86,.80,.60],m:[.64,.61,.43],s:[.35,.42,.33]},
  wood:{l:[.65,.48,.27],m:[.40,.30,.19],s:[.17,.24,.21]},
 },light:`vec3 kitPaint(vec3 P,vec3 Nn,int k,float tone,float r){float lit=clamp(dot(Nn,uSunDir)*.6+.4,0.,1.);return paint3(PAL_L[k],PAL_M[k],PAL_S[k],lit,r)*tone;}`});
 const signs=[];
 for(const route of routes){
  const pos=[],indices=[];
  for(let i=0;i<route.points.length;i++){
   const p=route.points[i],a=route.points[Math.max(0,i-1)],c=route.points[Math.min(route.points.length-1,i+1)],dir=c.clone().sub(a).setY(0).normalize(),side=new THREE.Vector3(dir.z,0,-dir.x);
   for(let k=0;k<3;k++){const q=p.clone().addScaledVector(side,(k-1)*1.15);q.y=heightAt(q.x,q.z)+.045;pos.push(q.x,q.y,q.z);}
   if(i)for(let k=0;k<2;k++){const n=i*3+k;indices.push(n,n+1,n-3,n+1,n-2,n-3);}
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(indices);geo.computeVertexNormals();
  b.add(geo,new THREE.Matrix4(),'path',{stroke:[.40,1.2],density:.7,free:true,grain:new THREE.Vector3(0,0,1)});
  for(const fraction of [.08,.62,.90]){
   const i=Math.floor((route.points.length-1)*fraction),p=route.points[i],next=route.points[Math.min(i+2,route.points.length-1)],dir=next.clone().sub(p).setY(0).normalize();
   const x=p.x+dir.z*2.0,z=p.z-dir.x*2.0,y=heightAt(x,z);
   b.box(x,y+.84,z,.13,1.68,.13,'wood',{stroke:[.13,.65],grain:'y'});
   const canvas=document.createElement('canvas');canvas.width=512;canvas.height=160;const ctx=canvas.getContext('2d');
   ctx.fillStyle=night?'#31524d':'#e6d9b6';ctx.fillRect(0,0,512,160);ctx.strokeStyle=night?'#9cbcac':'#6f795d';ctx.lineWidth=6;ctx.strokeRect(6,6,500,148);
   ctx.fillStyle=night?'#f5e9bf':'#2c493b';ctx.font='600 39px Microsoft YaHei';ctx.textAlign='center';ctx.fillText(`${regionById(route.to).name} ↑`,256,65);ctx.font='25px Microsoft YaHei';ctx.fillText(`山路 · ${Math.round(route.remaining[i])} 米`,256,118);
   const texture=new THREE.CanvasTexture(canvas),plate=new THREE.Mesh(new THREE.PlaneGeometry(1.65,.52),new THREE.MeshBasicMaterial({map:texture}));
   plate.position.set(x,y+1.58,z+(route.z<anchorZ?.095:-.095));plate.rotation.y=route.z<anchorZ?0:Math.PI;group.add(plate);signs.push({x,z,to:route.to});
  }
 }
 group.add(b.build().group);
 const status=document.createElement('div');status.id='world-walk-status';status.setAttribute('role','status');if(!capture)document.body.append(status);
 let clock=0,next=0,loading=false,lastSafe=player.feet.clone(),lastRecovery=-10;
 const temp=player.feet.clone();
 function recover(){
  if(clock-lastRecovery<1)return;lastRecovery=clock;
  const half=player.halfHeight(),p=lastSafe;
  player.body.setTranslation({x:p.x,y:p.y+player.t.radius+half+.04,z:p.z},true);player.world.propagateModifiedBodyPositionsToColliders();player.feet.copy(p);player.prevFeet.copy(p);player.visualY=p.y;player.vel.set(0,0,0);player.speed=0;player.grounded=true;
  status.textContent='已回到最近的安全路段';
 }
 return {routes,group,signs,recover,get loading(){return loading},update(time,dt){
  clock+=dt;
  const p=player.feet,ground=heightAt(p.x,p.z),half=current==='aurora'?500:184;
  if(player.grounded&&Math.abs(p.y-ground)<.45&&Math.abs(p.x)<half&&Math.abs(p.z)<half)lastSafe.copy(p);
  if(clock<next||loading||input.suspended)return;next=clock+.15;
  let nearest;
  for(const r of routes)for(let i=0;i<r.points.length;i+=2){const q=r.points[i],d=Math.hypot(q.x-p.x,q.z-p.z);if(!nearest||d<nearest.d)nearest={route:r,i,d};}
  if(!nearest)return;const {route,i,d}=nearest,end=route.points.at(-1),before=route.points.at(-4);
  const distance=Math.hypot(end.x-p.x,end.z-p.z),forward=temp.copy(end).sub(before).setY(0).normalize().dot(player.vel);
  status.textContent=d<5?`山路通往${regionById(route.to).name} · 约 ${Math.round(route.remaining[i])} 米`:'';
  if(d<7&&i>route.points.length*.68)window.worldTravel?.preload(route.to);
  if(clock>2.5&&distance<3.5&&forward>.15&&player.grounded){loading=true;status.textContent=`正在进入${regionById(route.to).name}…`;onCross(route.to,{from:current});}
 }};
}
