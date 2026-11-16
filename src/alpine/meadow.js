import * as THREE from 'three';
import { groundRings } from '../oilpaint/ground.js';

// Coarse flat brush marks grouped by habitat, not a uniform lawn of thin triangles.
export function createMeadowGrowth(shared,trail){
 const own={...shared,uTrail:{value:trail}};
 const rings=groundRings(own,{head:'uniform vec4 uTrail[16];',per:7,n:96,cell0:.48,levels:4,minPx:[1.5,3],maxPx:[100,360],cells:[0,8],body:`
 void makeDab(inout Dab d){
  vec2 cell;float sub;if(!ringCell(73.,false,cell,sub)){d.alive=0.;return;}
  vec4 r=hash4(cell,43.),q=hash4(cell+17.3,51.),f=hash4(cell+sub*7.7,sub*13.+3.);
  vec2 foot=(cell+r.xy)*uCell0;float lod;d.alive=ringGrow(distance(foot,cameraPosition.xz),lod);if(d.alive<=0.)return;
  vec4 m=texture(tLand,landUv(foot));if(m.r>.06||m.g>.14||max(abs(foot.x),abs(foot.y))>245.){d.alive=0.;return;}
  float drift=smoothstep(.43,.67,texture(tNoise,foot/38.).a);
  float tallPatch=smoothstep(.51,.69,m.a)*smoothstep(.4,.64,texture(tNoise,foot/17.).g);
  float chance=.24+.48*drift+.23*tallPatch;
  if(q.x>chance){d.alive=0.;return;}
  float broad=step(.48,q.z),h=mix(.07,.19,f.z)+tallPatch*mix(.19,.40,q.z);
  float a=(sub+f.x)/7.*TAU+r.z*TAU;vec2 fan=vec2(cos(a),sin(a));
  float bend=0.;vec2 push=vec2(0.);
  for(int i=0;i<16;i++){vec2 diff=foot-uTrail[i].xy;float dist=length(diff),age=uTime-uTrail[i].z;float k=(1.-smoothstep(.1,.85,dist))*exp(-max(age,0.)*.65)*step(0.,age);bend=max(bend,k);push+=diff/max(dist,.05)*k*.4;}
  vec2 diff=foot-uFocus.xz;float contact=1.-smoothstep(.2,.8,length(diff));bend=max(bend,contact);push+=diff/max(length(diff),.05)*contact;
  float gust=gustAt(foot),sway=sin(uTime*(1.1+f.z)+f.w*30.)*(.06+.1*gust);
  vec2 lean=fan*(.4+broad*1.5)+uWind.xy*(.09+.24*gust+sway)+push*1.3;
  vec3 P=vec3(foot.x,heightAt(foot)-.01,foot.y);P.xz+=fan*(.04+f.y*.13);
  float lit=sunAt(P+vec3(0.,.2,0.))*(.43+q.y*.37);
  vec3 c=paint3(vec3(.67,.72,.29),vec3(.37,.50,.21),vec3(.13,.27,.24),lit,f.w);
  if(q.y<.18)c=paint3(vec3(.73,.68,.39),vec3(.48,.45,.23),vec3(.24,.28,.22),lit,f.w);
  if(broad>.5&&q.y>.65)c=mix(c,vec3(.42,.55,.38),.35);
  d.pos=P;d.dir=normalize(vec3(lean.x,1.-bend*.72,lean.y));
  d.size=vec2(mix(.065,.145,broad)*(1.+f.x*.5),h*(1.-bend*.25))*min(pow(lod,.45),1.8);
  d.c1=hazed(c,P);d.c2=hazed(c*1.10,P);d.cell=floor(f.y*7.99);
  d.base=1.;d.lift=.08;d.seed=dot(cell,vec2(1.,57.))+sub*.37;
 }`});
 return rings;
}
