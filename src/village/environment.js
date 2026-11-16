import * as THREE from 'three';
import { groundRings } from '../oilpaint/ground.js';
export function createEnvironment(shared){
 const trail=Array.from({length:16},()=>new THREE.Vector4(9999,9999,-99,0)),uniforms={...shared,uTrail:{value:trail}};
 const growth=groundRings(uniforms,{head:'uniform vec4 uTrail[16];',per:5,n:104,cell0:.55,levels:4,minPx:[1,2],maxPx:[45,130],cells:[0,8],body:`
 void makeDab(inout Dab d){
 vec2 cell;float sub;if(!ringCell(82.,false,cell,sub)){d.alive=0.;return;}vec4 r=hash4(cell,19.),f=hash4(cell+sub*9.,sub+2.);
 vec2 foot=(cell+r.xy)*uCell0+vec2(f.x-.5,f.y-.5)*.26;vec4 m=texture(tLand,landUv(foot));
 if(m.r>.10||m.a<.6||max(abs(foot.x),abs(foot.y))>244.){d.alive=0.;return;}
 float lod;d.alive=ringGrow(distance(foot,cameraPosition.xz),lod)*smoothstep(.8,2.4,distance(foot,cameraPosition.xz));if(d.alive<=0.)return;
 float bend=0.;vec2 push=vec2(0.);
 for(int i=0;i<16;i++){vec2 delta=foot-uTrail[i].xy;float age=uTime-uTrail[i].z,k=(1.-smoothstep(.12,.85,length(delta)))*exp(-max(age,0.)*.58)*step(0.,age);bend=max(bend,k);push+=delta/max(length(delta),.05)*k*.35;}
 vec2 delta=foot-uFocus.xz;float contact=1.-smoothstep(.18,.72,length(delta));bend=max(bend,contact);push+=delta/max(length(delta),.05)*contact;
 float h=.48+f.z*.42,wind=gustAt(foot),sway=sin(uTime*1.35+foot.x*.23+foot.y*.11)*(.06+wind*.10);
 vec2 lean=vec2(.16,.09)+uWind.xy*(.13+wind*.22+sway)+push;
 vec3 P=vec3(foot.x,heightAt(foot),foot.y);vec3 axis=normalize(vec3(lean.x,1.-bend*.7,lean.y));
 float lit=.45+woodSunAt(P)*.3;
 vec3 c=paint3(vec3(.96,.79,.35),vec3(.78,.56,.21),vec3(.40,.41,.24),lit,f.w);
 if(m.g>.45){h*=.65;c=mix(c,vec3(.47,.60,.37),.75);}
 bool ear=sub>2.5;d.pos=P;if(ear)d.pos+=axis*h*.73;
 d.dir=ear?normalize(axis+vec3(.35,0.,.05)):axis;d.size=vec2(ear?.19:.115,ear?h*.36:h*.82)*(1.+f.y*.4)*min(pow(lod,.25),1.5);
 d.base=1.;d.lift=0.;d.c1=hazed(c,P);d.c2=hazed(c*1.10,P);d.seed=dot(cell,vec2(1.,57.))+sub;d.cell=floor(f.y*7.99);
 }`});
 const group=new THREE.Group();group.add(growth.group);let cursor=0,last=new THREE.Vector2(999,999);
 return {group,growth,trail,uniforms,stats:{wheatHeight:[.48,.90]},inWater:false,
 setQuality(low){growth.group.children.forEach((o,i)=>o.visible=!low||i<3);},
 update(time,dt,player,camera){growth.follow(camera.position.x,camera.position.z);const p=player.feet;if(player.grounded&&last.distanceTo(new THREE.Vector2(p.x,p.z))>.28){trail[cursor].set(p.x,p.z,time,1);cursor=(cursor+1)%16;last.set(p.x,p.z);}}
 };
}
