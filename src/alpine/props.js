import * as THREE from 'three';
import { paintBus } from './vehicle.js';
import { paintBench } from './bench.js';
import { createCow } from './cow.js';
import { createCottage } from './cottage.js';
import { rng } from '../world/noise.js';
import { kit, movable, ellipsoid } from './paint.js';
import { heightAt, baseHeight } from './land.js';
import { BUS, COWS, GRAZERS, GATE, LOOKOUT, SEED, riverX, riverLevel, riverObstacles } from './config.js';

export function createProps(shared){
 const group=new THREE.Group(),solids=[];
 const addBox=(x,y,z,sx,sy,sz,yaw=0,roll=0)=>solids.push({x,y,z,hx:sx/2,hy:sy/2,hz:sz/2,yaw,roll});
 const cottage=createCottage(shared);group.add(cottage.group);solids.push(...cottage.solids);
 const b=kit(shared,{seed:SEED+10});
 // Compact 6.2 m shuttle, 2.25 m wide and 2.8 m high, matching the reference bus colours.
 const by=heightAt(BUS.x,BUS.z);
 paintBus(b,BUS.x,by,BUS.z);
 addBox(BUS.x,by+1.45,BUS.z,2.3,2.9,6.3);
 // Feed crate sits beside the accessible left bus flank.
 const supply={x:BUS.x-2.05,z:BUS.z+1};supply.y=heightAt(supply.x,supply.z);
 b.box(supply.x,supply.y+.36,supply.z,.8,.65,.65,'wood',{rows:.14});
 b.box(supply.x,supply.y+.69,supply.z,.72,.09,.57,'grass');
 addBox(supply.x,supply.y+.35,supply.z,.8,.7,.65);

 // A low pasture fence with an explicit 3.2 m gate, and generous open ends.
 const fenceZ=43;
 for(let x=-50;x<=3;x+=3.2){
   if(x>GATE.x-.1 && x<GATE.x+GATE.width+.1)continue;
   const y=heightAt(x,fenceZ);b.box(x,y+.57,fenceZ,.14,1.14,.14,'wood',{grain:'y'});
   addBox(x,y+.57,fenceZ,.18,1.14,.18);
 }
 for(const [from,to]of [[-50,GATE.x],[GATE.x+GATE.width,3]]){
   for(let x=from;x<to;x+=2){
     const len=Math.min(2,to-x),y=heightAt(x+len/2,fenceZ);
     for(const h of [.45,.88])b.box(x+len/2,y+h,fenceZ,len,.065,.065,'wood',{grain:'x',stroke:[.04,.25]});
     addBox(x+len/2,y+.55,fenceZ,len,1.1,.10);
   }
 }
 const gy=heightAt(GATE.x,GATE.z),g=kit(shared,{seed:SEED+11});
 for(const x of [.09,GATE.width-.09])g.box(x,.53,0,.15,1.06,.12,'wood',{grain:'y'});
 for(const h of [.18,.55,.94])g.box(GATE.width/2,h,0,GATE.width,.105,.10,'wood',{grain:'x'});
 const gate=movable(g.build());gate.group.position.set(GATE.x,gy,GATE.z);group.add(gate.group);

 // The bridge spans the full gravel bed; sloping approaches meet both banks.
 const bridgeX=riverX(-16),half=14,bridgeY=Math.max(heightAt(bridgeX-half-4,-16),heightAt(bridgeX+half+4,-16),riverLevel(-16)+.60)+.10;
 for(let x=bridgeX-half;x<=bridgeX+half;x+=.42)b.box(x,bridgeY-.08,-16,.40,.16,1.9,'wood',{grain:'z',stroke:[.13,.5]});
 addBox(bridgeX,bridgeY-.08,-16,half*2+.4,.16,1.9);
 for(const side of [-1,1]){
   for(let x=bridgeX-half;x<=bridgeX+half;x+=1.8)b.box(x,bridgeY+.5,-16+side*.95,.10,1.0,.10,'wood');
   b.box(bridgeX,bridgeY+.96,-16+side*.95,half*2,.10,.10,'pale',{grain:'x',stroke:[.08,.6]});
   addBox(bridgeX,bridgeY+.5,-16+side*.98,half*2,1,.10);
 }
 for(const side of [-1,1]){
  const outer=bridgeX+side*(half+4),outerY=heightAt(outer,-16)+.035,dx=side*4,dy=outerY-bridgeY;
  const len=Math.hypot(dx,dy),angle=Math.atan2(dy,dx),cx=bridgeX+side*(half+2),cy=(outerY+bridgeY)/2-.08;
  const matrix=new THREE.Matrix4().makeRotationZ(angle);matrix.setPosition(cx,cy,-16);
  b.add(new THREE.BoxGeometry(len,.16,1.9),matrix,'wood',{grain:new THREE.Vector3(1,0,0),stroke:[.16,.45],free:true});
  addBox(cx,cy,-16,len,.16,1.9,0,angle);
 }
 // Viewpoint sign and seat: rail height 1.05 m, seat height .46 m.
 const ly=heightAt(LOOKOUT.x,LOOKOUT.z);
 b.box(LOOKOUT.x,ly+.8,LOOKOUT.z,.13,1.6,.13,'wood');
 b.box(LOOKOUT.x,ly+1.5,LOOKOUT.z,1.1,.42,.12,'blue');
 const benchY=Math.max(...[-.65,.65].flatMap(dx=>[-.18,.23].map(dz=>heightAt(LOOKOUT.x+2+dx,LOOKOUT.z+1.3+dz))));
 const bench=paintBench(b,LOOKOUT.x+2,benchY,LOOKOUT.z+1.3);
 addBox(LOOKOUT.x+2,benchY+.25,LOOKOUT.z+1.3,1.7,.5,.6);
 addBox(LOOKOUT.x+2,benchY+.70,LOOKOUT.z+1.58,1.7,.4,.10);
 // River cobbles: embedded in the bank, with matching collision volumes.
 const random=rng(SEED+88);
 for(let i=0;i<130;i++){
   const z=-85+random()*180;if(Math.abs(z+16)<5)continue;
   const x=riverX(z)+(i%2?1:-1)*(2.7+random()*10.4),y=heightAt(x,z),r=.22+random()*.46;
   ellipsoid(b,x,y+r*.25,z,r,r*.52,r*.73,['stone','pale','wood'][i%3],{stroke:[.15,.32],density:.7,free:true});
   addBox(x,y+r*.20,z,r*1.55,r*.63,r*1.12);
 }
 // These eight stones share their footprint with the flow field and foam wakes.
 for(const rock of riverObstacles){
  const y=riverLevel(rock.z)-.07;
  ellipsoid(b,rock.x,y,rock.z,rock.r,rock.r*.72,rock.r*.9,'stone',{stroke:[.14,.30],density:.8,free:true});
  addBox(rock.x,y,rock.z,rock.r*1.5,rock.r*1.3,rock.r*1.5);
 }
 const staticPaint=b.build();group.add(staticPaint.group);

 const herd=[...COWS,...GRAZERS].map((spec,index)=>{
   const cow=createCow(shared,spec,index);group.add(cow.object);
   solids.push({x:spec.x,y:cow.object.position.y+.76,z:spec.z,hx:.46,hy:.71,hz:1.13,yaw:spec.yaw});
   return cow;
 });
 const cows=herd.slice(0,COWS.length),grazers=herd.slice(COWS.length);
 return {group,solids,supply,gate,cows,grazers,cottage,bench,bridge:{x:bridgeX,y:bridgeY,z:-16},
   update(time,dt){
     for(let i=0;i<herd.length;i++){
       const c=herd[i];c.reaction=Math.max(0,c.reaction-dt);
       const headTarget=c.reaction>0?-.10+Math.sin(time*2)*.025:-.88+Math.sin(time*.65+i)*.08;
       c.head.rotation.x+=(headTarget-c.head.rotation.x)*(1-Math.exp(-dt*3));
       c.body.scale.y=1+Math.sin(time*1.8+i)*.0025;
       c.tail.rotation.z=Math.sin(time*1.5+i)*.13;
     }
     group.updateMatrixWorld(true);
   }};
}
