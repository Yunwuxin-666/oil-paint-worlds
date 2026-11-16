import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
export function paintBus(b,x,y,z){
 const rounded=(dx,dy,dz,w,h,l,pal,r=.08,stroke=[.14,.42])=>b.add(new RoundedBoxGeometry(w,h,l,3,r),b.place(x+dx,y+dy,z+dz),pal,{smooth:true,free:true,stroke,density:.8});
 rounded(0,1.12,0,2.25,1.35,6.2,'yellow',.15);
 rounded(0,2.09,.02,2.20,.90,6.05,'blue',.17);
 rounded(0,2.60,.05,2.24,.22,6.0,'blue',.10);
 rounded(0,2.75,.65,1.35,.20,1.45,'pale',.08);
 for(const side of [-1,1]){
  for(let i=0;i<5;i++){
   const wz=-2.22+i*1.08;
   rounded(side*1.108,2.14,wz,.028,.64,.91,'glass',.012,[.15,.30]);
   b.box(x+side*1.13,y+1.83,z+wz,.035,.055,.94,'metal',{grain:'z',stroke:[.045,.35]});
  }
  for(const wz of [-1.92,1.86]){
   const rot=new THREE.Matrix4().makeRotationZ(Math.PI/2);
   b.round(x+side*1.135,y+.46,z+wz,.51,.035,'rubber',{turn:rot,sides:20,stroke:[.12,.22]});
   b.round(x+side*1.20,y+.43,z+wz,.43,.25,'rubber',{turn:rot,sides:24,stroke:[.10,.22]});
   b.round(x+side*1.335,y+.43,z+wz,.24,.035,'metal',{turn:rot,sides:16,stroke:[.09,.15]});
   b.round(x+side*1.36,y+.43,z+wz,.085,.04,'rubber',{turn:rot,sides:10,stroke:[.04,.07]});
  }
  b.box(x+side*1.14,y+1.43,z,.025,.06,5.95,'pale',{grain:'z',stroke:[.05,.55]});
  rounded(side*1.42,2.02,-2.80,.18,.32,.14,'blue',.035,[.08,.20]);
  b.box(x+side*1.27,y+2.24,z-2.74,.30,.035,.04,'metal',{grain:'x'});
 }
 // Front glass split, lamps, bumper, grille and wipers.
 for(const side of [-1,1])rounded(side*.49,2.08,-3.018,.93,.73,.035,'glass',.03,[.22,.35]);
 b.box(x,y+2.07,z-3.05,.045,.77,.04,'blue',{grain:'y'});
 b.box(x,y+1.58,z-3.075,1.94,.075,.08,'blue',{grain:'x'});
 rounded(0,.59,-3.13,2.17,.19,.15,'metal',.04,[.10,.4]);
 rounded(0,.94,-3.12,.83,.24,.035,'rubber',.03,[.10,.3]);
 for(const side of [-1,1]){
  rounded(side*.76,1.05,-3.12,.40,.21,.055,'pale',.05,[.12,.20]);
  b.box(x+side*.48,y+1.78,z-3.08,.58,.025,.025,'rubber',{grain:'x'});
  rounded(side*.82,1.10,3.12,.17,.32,.04,'brown',.025,[.10,.20]);
 }
 // Door has a real frame and panels; it shares the bus's solid hull collider.
 rounded(1.145,1.46,-2.13,.045,1.70,.83,'blue',.03,[.14,.35]);
 for(const dz of [-.21,.21]){
  b.box(x+1.18,y+1.73,z-2.13+dz,.025,1.07,.34,'glass',{stroke:[.12,.35]});
  b.box(x+1.19,y+.91,z-2.13+dz,.028,.48,.34,'yellow',{stroke:[.13,.25]});
 }
 b.box(x+1.22,y+1.35,z-2.13,.045,.24,.035,'metal');
 b.box(x+1.20,y+.54,z-2.13,.18,.06,.85,'metal',{grain:'z'});
 for(let i=0;i<4;i++)b.box(x+1.145,y+.95+i*.085,z+2.55,.03,.035,.50,'rubber',{grain:'z'});
}
