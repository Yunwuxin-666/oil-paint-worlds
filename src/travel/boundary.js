// The same canonical valley is built at BOTH ends of a regional link. Everything
// (including collider vertices) is baked into the host region's floating origin.
// Mid-valley handoffs preserve this frame rather than jumping to another road.
import * as THREE from 'three';
import {createKit} from '../night/kit.js';
import {rng} from '../world/noise.js';

export const BOUNDARIES=[
 {id:'snowmelt',a:'aurora',b:'alpine',name:'雪线融水谷',seed:373261},
 {id:'golden',a:'alpine',b:'village',name:'金草缓坡',seed:373262},
 {id:'bridge',a:'village',b:'autumn',name:'林缘石桥',seed:373263},
 {id:'pass',a:'autumn',b:'aurora',name:'落叶松山口',seed:373264},
 {id:'drywash',a:'village',b:'arches',name:'红砂风谷',seed:316937,width:42},
];
export const smooth=(a,b,x)=>{const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)};
const UP=new THREE.Vector3(0,1,0),I=new THREE.Matrix4();
const palettes={
 grass:{l:[.69,.75,.32],m:[.40,.52,.22],s:[.16,.31,.20]},
 gold:{l:[.94,.77,.32],m:[.73,.51,.19],s:[.36,.37,.17]},
 leaf:{l:[1,.68,.20],m:[.79,.35,.12],s:[.35,.23,.17]},
 snow:{l:[.91,.94,.91],m:[.62,.75,.83],s:[.34,.47,.64]},
 stone:{l:[.67,.70,.65],m:[.45,.52,.53],s:[.25,.35,.39]},
 earth:{l:[.86,.79,.60],m:[.64,.55,.39],s:[.36,.36,.30]},
 bark:{l:[.52,.42,.28],m:[.31,.29,.23],s:[.16,.23,.21]},
 pine:{l:[.42,.53,.30],m:[.19,.36,.27],s:[.09,.23,.22]},
 plaster:{l:[.92,.85,.64],m:[.75,.69,.52],s:[.43,.49,.44]},
 roof:{l:[.82,.47,.25],m:[.57,.29,.18],s:[.31,.28,.23]},
 water:{l:[.67,.83,.82],m:[.31,.58,.63],s:[.15,.37,.45]},
 foam:{l:[.93,.94,.83],m:[.76,.86,.82],s:[.45,.64,.67]},
 sand:{l:[.98,.75,.40],m:[.80,.51,.28],s:[.44,.31,.27]},
};

export function createBoundary({route,current,shared,physics,heightAt,RAPIER:R}){
 const spec=BOUNDARIES.find(b=>[b.a,b.b].includes(current)&&[b.a,b.b].includes(route.to));
 const sign=current===spec.a?1:-1,sEnd=-120*sign;
 const end=route.points.at(-1).clone(),before=route.points.at(-4);
 const axis=end.clone().sub(before).setY(0).normalize().multiplyScalar(sign);
 const side=new THREE.Vector3(axis.z,0,-axis.x),origin=end.clone().addScaledVector(axis,-sEnd);
 const yaw=Math.atan2(axis.x,axis.z),rand=rng(spec.seed),colliders=new Set();
 const group=new THREE.Group();group.name=`boundary-${spec.id}`;
 const cs={...shared};
 for(const key of ['uSunDir','uHaze','uHazeSun','uHazeGlow','uBounce','uGlazeMul'])cs[key]={value:shared[key].value.clone()};
 cs.uSunDir.value.set(-.48,.67,-.56).applyAxisAngle(UP,yaw).normalize();
 cs.uHaze.value.setRGB(.59,.66,.69);cs.uHazeSun.value.setRGB(.85,.82,.66);cs.uHazeGlow.value.setRGB(.025,.022,.014);
 cs.uBounce.value.setRGB(.07,.065,.025);cs.uGlazeMul.value.setRGB(.44,.44,.51);
 cs.uHazeDensity={value:.0025};cs.uGroundMist={value:0};
 cs.uImpasto={value:.8};
 const kit=createKit(cs,{palettes:spec.id==='drywash'?{...palettes,stone:{l:[.90,.60,.35],m:[.67,.37,.23],s:[.35,.26,.26]}}:palettes,seed:spec.seed,haze:true,light:`vec3 kitPaint(vec3 P,vec3 Nn,int k,float tone,float r){return paint3(PAL_L[k],PAL_M[k],PAL_S[k],clamp(dot(Nn,uSunDir)*.5+.5,0.,1.),r)*tone;}`});
 const path=s=>7*Math.sin(Math.PI*(s+120)/240)**2*Math.sin(2*Math.PI*(s+120)/240);
 const project=(x,z)=>{const dx=x-origin.x,dz=z-origin.z;return {s:dx*axis.x+dz*axis.z,u:dx*side.x+dz*side.z}};
 const point=(u,s,y=0)=>new THREE.Vector3(origin.x+axis.x*s+side.x*u,end.y+y,origin.z+axis.z*s+side.z*u);
 const distance=(s)=>sign*(s-sEnd);
 function core(u,s){
  const d=u-path(s),hill=2.5*Math.sin((s+120)/240*Math.PI)**2;
  const shoulders=smooth(5,42,Math.abs(d))*(3+7*Math.sin(s*.018+u*.012)**2);
  const mountain=smooth(38,90,Math.abs(d))*(18+22*Math.sin(s*.012+u*.03)**2);
  const rough=smooth(3,12,Math.abs(d))*(Math.sin(u*.4+s*.18)*.21+Math.sin(s*.3)*.16);
  let y=hill+shoulders+mountain+rough;
  if(spec.id==='snowmelt'){const channel=1-smooth(1.8,4.5,Math.abs(d-10));y=THREE.MathUtils.lerp(y,-.45-.008*s,channel);}
  if(spec.id==='bridge'){const channel=1-smooth(2.5,7,Math.abs(s+19));y=THREE.MathUtils.lerp(y,-1.6-.003*u,channel);}
  return y;
 }
 const halfWidth=spec.width??110,cols=halfWidth,rows=168,cell=2,heights=new Float32Array((cols+1)*(rows+1));let sampled=false;
 const owns=(u,s)=>Math.abs(u)<halfWidth&&Math.abs(s)<168&&distance(s)>-40;
 function rawHeight(u,s){
  const p=point(u,s);
  const natural=heightAt(p.x,p.z)-end.y;
  // All FOUR edges meet the host terrain, with zero derivative in the blend
  // weight at the edge. A side step must not switch between unrelated heights.
  const weight=smooth(0,64,distance(s))*(1-smooth(halfWidth*.545,halfWidth-2,Math.abs(u)))*(1-smooth(136,168,Math.abs(s)));
  return THREE.MathUtils.lerp(natural,core(u,s),weight)+.015;
 }
 function h(u,s){
  if(!sampled)return rawHeight(u,s);
  const x=THREE.MathUtils.clamp((u+halfWidth)/cell,0,cols-.000001),z=THREE.MathUtils.clamp((s+168)/cell,0,rows-.000001),i=Math.floor(x),j=Math.floor(z),tx=x-i,tz=z-j,k=i+j*(cols+1);
  const a=heights[k],b=heights[k+1],c=heights[k+cols+1],d=heights[k+cols+2];
  // Barycentric interpolation of the ACTUAL visible/collision triangles.
  return tx+tz<=1?a+(b-a)*tx+(c-a)*tz:d+(c-d)*(1-tx)+(b-d)*(1-tz);
 }
 const deck=s=>2.5*Math.sin((s+120)/240*Math.PI)**2+.035;
 function palette(u,s){
  const t=(s+120)/240,patch=Math.sin(s*.12+u*.22)*.13+Math.sin(u*.43-s*.05)*.09;
  if(spec.id==='drywash')return t+patch<.35?'gold':'sand';
  if(spec.id==='snowmelt')return t+patch<.38?'snow':t+patch<.61?'gold':'grass';
  if(spec.id==='golden')return t+patch<.49?'grass':'gold';
  if(spec.id==='bridge')return t+patch<.43?'gold':t+patch<.68?'grass':'leaf';
  return t+patch>.70?'snow':t+patch>.47?'gold':'leaf';
 }
 function meshGrid(u0,u1,s0,s1,du,ds,fn,pal,opts={},solid=false,centre=()=>0){
  const pos=[],idx=[],cols=Math.round((u1-u0)/du),rows=Math.round((s1-s0)/ds);
  for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const u=THREE.MathUtils.lerp(u0,u1,i/cols),s=THREE.MathUtils.lerp(s0,s1,j/rows),p=point(u+centre(s),s,fn(u,s));pos.push(...p.toArray());}
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const a=j*(cols+1)+i,b=a+1,c=a+cols+1,d=c+1;idx.push(a,c,b,b,c,d);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
  if(pal)kit.add(geo,I,pal,{stroke:[.8,2.3],density:.30,free:true,...opts});
  if(solid){const c=physics.createCollider(R.ColliderDesc.trimesh(new Float32Array(pos),new Uint32Array(idx)));colliders.add(c.handle);}
  return geo;
 }
 // A 220 m wide valley, including sculpted shoulders, not a rectangular road card.
 const pos=[],idx=[],geo=new THREE.BufferGeometry();
 for(let j=0;j<=rows;j++)for(let i=0;i<=cols;i++){const u=-halfWidth+i*cell,s=-168+j*cell,p=point(u,s,rawHeight(u,s));pos.push(...p.toArray());heights[i+j*(cols+1)]=Math.fround(p.y)-end.y;}
 sampled=true;
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
  const u=-halfWidth+(i+.5)*cell,s=-168+(j+.5)*cell;if(!owns(u,s))continue;
  const a=j*(cols+1)+i,b=a+1,c=a+cols+1,d=c+1;idx.push(a,c,b,b,c,d);
  const edge=1-smooth(halfWidth*.545,halfWidth-2,Math.abs(u)),sourcePal={aurora:'snow',alpine:'grass',village:'gold',autumn:'leaf',arches:'sand'}[current];
  const pal=edge<.5?sourcePal:palette(u,s);kit.reseed(spec.seed+Math.round((s+400)*cols+(u+400)));
  const patch=new THREE.BufferGeometry();patch.setAttribute('position',new THREE.Float32BufferAttribute([...pos.slice(a*3,a*3+3),...pos.slice(c*3,c*3+3),...pos.slice(b*3,b*3+3),...pos.slice(b*3,b*3+3),...pos.slice(c*3,c*3+3),...pos.slice(d*3,d*3+3)],3));patch.computeVertexNormals();
  kit.add(patch,I,pal,{stroke:[1,2.7],density:.25,free:true,grain:axis});patch.dispose();
 }
 geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setIndex(idx);geo.computeVertexNormals();
 const groundCollider=physics.createCollider(R.ColliderDesc.trimesh(new Float32Array(pos),new Uint32Array(idx)));colliders.add(groundCollider.handle);
 const terrainMesh=new THREE.Mesh(geo,new THREE.MeshBasicMaterial());
 terrainMesh.name='boundary-collision-surface';terrainMesh.visible=false;group.add(terrainMesh);
 // The visible road is a thin finish on this SAME collider, with a soft broken shoulder.
 for(let s=-164;s<164;s+=2){
  if(!owns(path(s),s+1))continue;
  kit.reseed(spec.seed+30000+s*4);
  const a=point(path(s)-1.65,s,h(path(s)-1.65,s)+.025),b=point(path(s)+1.65,s,h(path(s)+1.65,s)+.025),c=point(path(s+2)-1.65,s+2,h(path(s+2)-1.65,s+2)+.025),d=point(path(s+2)+1.65,s+2,h(path(s+2)+1.65,s+2)+.025);
  kit.tri(a.toArray(),c.toArray(),b.toArray(),'earth',{stroke:[.48,1.45],density:.6,free:true,grain:axis.toArray()});kit.tri(b.toArray(),c.toArray(),d.toArray(),'earth',{stroke:[.48,1.45],density:.6,free:true,grain:axis.toArray()});
 }
 function solidBox(u,s,w,height,depth,pal,base=h(u,s)){
  const p=point(u,s,base+height/2);kit.box(p.x,p.y,p.z,w,height,depth,pal,{rotY:yaw,stroke:[.24,.8],density:.55});
  const c=physics.createCollider(R.ColliderDesc.cuboid(w/2,height/2,depth/2).setTranslation(p.x,p.y,p.z).setRotation(new THREE.Quaternion().setFromAxisAngle(UP,yaw)));colliders.add(c.handle);
 }
 function rock(u,s,size){
  kit.reseed(spec.seed+Math.floor((u+500)*113+(s+500)*887));
  const p=point(u,s,h(u,s)+size*.33),g=new THREE.DodecahedronGeometry(size,0),rotation=new THREE.Quaternion().setFromAxisAngle(UP,yaw).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(.2,rand()*3,.25)));kit.add(g,new THREE.Matrix4().compose(p,rotation,new THREE.Vector3(1,.7,.86)),'stone',{stroke:[.55,1.5],density:.65});g.dispose();
  const c=physics.createCollider(R.ColliderDesc.ball(size*.82).setTranslation(p.x,p.y-size*.12,p.z));colliders.add(c.handle);
 }
 function tree(u,s,tall,type){
  kit.reseed(spec.seed+Math.floor((u+500)*37+(s+500)*119));
  const p=point(u,s,h(u,s)),trunk=tall*.032;
  kit.round(p.x,p.y+tall*.48,p.z,trunk,tall*.96,'bark',{top:trunk*.38,stroke:[.22,1.5],density:.5});
  const c=physics.createCollider(R.ColliderDesc.cylinder(tall*.47,trunk).setTranslation(p.x,p.y+tall*.47,p.z));colliders.add(c.handle);
  if(type==='pine'||type==='snow'||type==='larch'||type==='cypress'){
   for(let k=0;k<6;k++){
    const y=tall*(.29+k*.108),r=tall*(type==='cypress'?.085:.22)*(1-k*.135),g=new THREE.ConeGeometry(r,tall*.27,7);
    kit.add(g,new THREE.Matrix4().compose(new THREE.Vector3(p.x,p.y+y,p.z),new THREE.Quaternion().setFromAxisAngle(UP,yaw),new THREE.Vector3(1,1,1)),type==='larch'?'gold':'pine',{stroke:[.42,1.4],density:.55,free:true});
    if(type==='snow'&&k<5)kit.add(g,new THREE.Matrix4().compose(new THREE.Vector3(p.x,p.y+y+tall*.055,p.z),new THREE.Quaternion().setFromAxisAngle(UP,yaw),new THREE.Vector3(.92,.62,.92)),'snow',{stroke:[.5,1.6],density:.5,free:true});g.dispose();
   }
  }else{
   for(let k=0;k<6;k++){
    const angle=k*2.4,branch=new THREE.Vector3(Math.sin(angle)*.65,.76,Math.cos(angle)*.65).normalize().applyAxisAngle(UP,yaw);
    const q=p.clone().add(new THREE.Vector3(Math.sin(angle)*tall*.16,tall*(.60+rand()*.22),Math.cos(angle)*tall*.16).applyAxisAngle(UP,yaw));
    const turn=new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(UP,branch));
    kit.round(q.x-branch.x*tall*.08,q.y-branch.y*tall*.08,q.z-branch.z*tall*.08,trunk*.40,tall*.32,'bark',{turn,stroke:[.16,.8],density:.4});
    for(let j=0;j<78;j++){
     const a=rand()*Math.PI*2,v=rand()*2-1,r=Math.sqrt(1-v*v),n=new THREE.Vector3(Math.cos(a)*r,v,Math.sin(a)*r).applyAxisAngle(UP,yaw);
     const leaf=q.clone().addScaledVector(n,tall*(.10+rand()*.075));
     kit.stroke(leaf,n,new THREE.Vector3(Math.cos(a),.2,Math.sin(a)).applyAxisAngle(UP,yaw),.30+rand()*.28,.70+rand()*.55,type==='olive'?'grass':'leaf',.85+rand()*.35,-.1);
    }
   }
  }
 }
 // Clustered placement leaves the route and sightline open; trunks always meet terrain.
 for(let i=0;i<142;i++){
  const s=-158+rand()*316,u=(rand()<.5?-1:1)*(8+rand()**1.5*56),t=(s+120)/240;
  if(Math.abs(u)>halfWidth-5||spec.id==='drywash'&&(t>.48||rand()>.16))continue;
  let type='pine';
  if(spec.id==='drywash')type=t<.25?'cypress':'olive';
  if(spec.id==='golden')type=t<.38?'pine':rand()<.25?'cypress':'olive';
  if(spec.id==='bridge')type=t<.25?'olive':'leaf';
  if(spec.id==='pass')type=t<.3?'leaf':t<.68?'larch':'snow';
  if(spec.id==='snowmelt')type=t<.5?'snow':'pine';
  tree(u,s,6+rand()*9,type);
 }
 for(let i=0;i<90;i++){const s=-148+rand()*296,u=(rand()<.5?-1:1)*(5+rand()*55);if(Math.abs(u)<halfWidth-3)rock(u,s,.35+rand()*1.15);}
 // Large individual three-dimensional grass/wheat strokes, bent by wind AND walker.
 for(let i=0;i<5300;i++){
  const s=-158+rand()*316,u=(rand()-.5)*126;if(Math.abs(u-path(s))<2.3||Math.abs(u)>halfWidth-2)continue;
  if(spec.id==='drywash'&&rand()>.22)continue;
  const p=point(u,s,h(u,s)),pal=palette(u,s);if(pal==='snow'&&rand()<.86)continue;
  const tall=pal==='gold'?.42+rand()*.5:.13+rand()*.42;
  kit.stroke(p,UP,new THREE.Vector3(.2,1,.05).normalize().applyAxisAngle(UP,yaw),.10+rand()*.15,tall,pal,.9+rand()*.25,.025);
 }
 if(spec.id==='golden'){
  for(let s=-32;s<42;s+=3)solidBox(path(s)+5.7,s,1,.72,2.6,'stone');
  const u=19,s=16,y=h(u,s);solidBox(u,s,7,4.2,5.5,'plaster',y);
  const p=point(u,s,y+4.2);kit.tri(point(u-4,s-3.3,y+4).toArray(),point(u+4,s-3.3,y+4).toArray(),point(u,s-3.3,y+6).toArray(),'roof',{stroke:[.35,1],density:.7});
  for(const direction of [-1,1]){
   const roof=new THREE.BoxGeometry(4.5,.22,6.6),m=new THREE.Matrix4().compose(point(u+direction*2,s,y+5),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,yaw,-direction*.46)),new THREE.Vector3(1,1,1));kit.add(roof,m,'roof',{stroke:[.4,1.3],density:.8});roof.dispose();
  }
  solidBox(u-1.2,s-2.81,1.1,2.2,.15,'bark',y);solidBox(u+1.5,s-2.82,1.1,1,.16,'pine',y+1.9);
 }
 const waterGroup=new THREE.Group();group.add(waterGroup);
 if(spec.id==='snowmelt'||spec.id==='bridge'){
  const isBridge=spec.id==='bridge',waterPos=[],waterIdx=[];
  for(let i=0;i<=144;i++){
   const a=-144+i*2;
   for(let k=0;k<5;k++){
    const u=isBridge?a:path(a)+10+(k-2)*1.1,s=isBridge?-19+(k-2)*1.05:a;
    const level=isBridge?-.7-.003*u:.35-.008*a,p=point(u,s,level);waterPos.push(...p.toArray());
   }
   if(i)for(let k=0;k<4;k++){const n=i*5+k;waterIdx.push(n,n-5,n+1,n+1,n-5,n-4);}
  }
  const wg=new THREE.BufferGeometry();wg.setAttribute('position',new THREE.Float32BufferAttribute(waterPos,3));wg.setIndex(waterIdx);wg.computeVertexNormals();
  const wm=new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,uniforms:{uTime:shared.uTime,uAxis:{value:axis},uOrigin:{value:origin}},side:THREE.DoubleSide,
   vertexShader:'out vec3 P;void main(){P=position;vec3 p=position;p.y+=sin(position.x*2.+position.z*1.4)*.015;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.);}',
   fragmentShader:`uniform float uTime;uniform vec3 uAxis;uniform vec3 uOrigin;in vec3 P;out vec4 color;void main(){vec2 p=P.xz-uOrigin.xz;float along=dot(p,uAxis.xz);float crosswise=dot(p,vec2(uAxis.z,-uAxis.x));float a=${isBridge?'crosswise':'along'};float b=${isBridge?'along':'crosswise'};float band=floor((a-uTime*1.6)*2.);float streak=sin(b*7.+sin(band*1.8)*1.9);float c=step(.36,streak)*(.45+.3*sin(band*2.7));color=vec4(mix(vec3(.20,.43,.47),vec3(.71,.83,.80),c),1.);}`});
  const water=new THREE.Mesh(wg,wm);water.name='flowing-gravel-creek';waterGroup.add(water);
  for(let i=0;i<170;i++){
   const a=-140+rand()*280,u=isBridge?a:path(a)+10+(rand()<.5?-1:1)*(2.5+rand()*2.2),s=isBridge?-19+(rand()<.5?-1:1)*(2.5+rand()*2.2):a;
   rock(u,s,.15+rand()*.5);
  }
  if(isBridge){
   // Arched deck follows a modest rise; same triangles used for collision.
   const bridge=meshGrid(-1.9,1.9,-28,-10,.95,1,(u,s)=>deck(s),'stone',{stroke:[.35,.9],density:.8},true,path);bridge.dispose();
   for(const u of [-1.95,1.95])for(let s=-27;s<-10;s+=1.6)solidBox(path(s)+u,s,.34,.85,1.5,'stone',deck(s));
   for(const s of [-26,-12])solidBox(path(s),s,4.3,2.4,1,'stone',deck(s)-2.4);
  }else{
   // Small footbridge across the tributary, offset beside the main hiking path.
   for(let u=6;u<17;u+=.55)solidBox(u,-37,.52,.19,2.9,'bark',2.5);
   for(const s of [-38.45,-35.55])for(let u=6;u<17;u+=2)solidBox(u,s,.12,1,.12,'bark',2.6);
  }
 }
 if(spec.id==='snowmelt'){rock(-12,-7,5.2);rock(-19,-4,3.2);}
 if(spec.id==='pass'){rock(-14,5,8);rock(-22,13,7);tree(14,-3,19,'larch');}
 const built=kit.build();group.add(built.group);
 // A coherent sky behind the outgoing region's gradually disappearing sky.
 const sky=new THREE.Mesh(new THREE.SphereGeometry(1400,20,12),new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,side:THREE.BackSide,depthWrite:false,depthTest:false,
  uniforms:{uPass:{value:spec.id==='pass'?1:0}},
  vertexShader:'out vec3 D;void main(){D=position;gl_Position=projectionMatrix*viewMatrix*vec4(position+cameraPosition,1.);}',
  fragmentShader:'uniform float uPass;in vec3 D;out vec4 color;void main(){float t=smoothstep(-.12,.8,normalize(D).y);vec3 c=mix(vec3(.86,.82,.67),vec3(.46,.64,.76),t);c=mix(c,mix(vec3(.60,.64,.67),vec3(.19,.30,.43),t),uPass*.45);color=vec4(c,1.);}'
 }));sky.frustumCulled=false;sky.renderOrder=-30;group.add(sky);
 const grass=built.strokes.material;
 grass.uniforms.uBoundaryWalker={value:new THREE.Vector3(99999,0,99999)};
 grass.uniforms.uBoundaryOrigin={value:origin};grass.uniforms.uBoundaryAxis={value:axis};
 grass.vertexShader=grass.vertexShader.replace('void makeDab(inout Dab d)', 'uniform vec3 uBoundaryWalker;uniform vec3 uBoundaryOrigin;uniform vec3 uBoundaryAxis;\nvoid makeDab(inout Dab d)');
 grass.vertexShader=grass.vertexShader.replace('d.height = 0.004 + aMore.y + 0.01 * r.z;',`d.height = 0.004 + aMore.y + 0.01 * r.z;
 if(aMore.y<0.){d.lie=0.;d.height=0.;}
 if(aData.z<1.05&&aData.y<.29&&(k==0||k==1||k==2||k==12)){float w=1.-smoothstep(.35,1.45,length(aPos.xz-uBoundaryWalker.xz));vec3 side=vec3(uBoundaryAxis.z,0.,-uBoundaryAxis.x);vec3 q=aPos-uBoundaryOrigin;float u=dot(q,side),s=dot(q,uBoundaryAxis);d.lie=0.;d.base=1.;d.dir=normalize(aDir+side*(sin(uTime*1.7+u*.25)*.18+w*.8)+uBoundaryAxis*cos(uTime+s*.25)*.1);d.size.y*=1.-w*.48;}`);
 built.under.material.uniforms.uBoundaryOrigin={value:origin};built.under.material.uniforms.uBoundaryAxis={value:axis};
 built.under.material.fragmentShader='uniform vec3 uBoundaryOrigin;uniform vec3 uBoundaryAxis;\n'+built.under.material.fragmentShader;
 built.under.material.fragmentShader=built.under.material.fragmentShader.replace('(vWorld.xz + vWorld.y) * 0.9','(vec2(dot(vWorld-uBoundaryOrigin,vec3(uBoundaryAxis.z,0.,-uBoundaryAxis.x)),dot(vWorld-uBoundaryOrigin,uBoundaryAxis)) + vWorld.y-uBoundaryOrigin.y) * 0.9');
 sky.visible=false;
 return {spec,group,sky,colliders,groundCollider,terrainMesh,halfWidth,sharedWidth:Math.min(55,halfWidth*.5),axis,side,origin,yaw,sign,sEnd,end,path,project,point,height:h,rawHeight,shared:cs,count:built.count,
  sampleHeight(x,z){const {s,u}=project(x,z);return end.y+(spec.id==='bridge'&&Math.abs(u-path(s))<1.9&&s>-28&&s<-10?Math.max(h(u,s),deck(s)):h(u,s))},
  contains(x,z){const {s,u}=project(x,z);return owns(u,s)},
  progress(x,z){return distance(project(x,z).s)},
  update(feet){grass.uniforms.uBoundaryWalker.value.copy(feet)},
  pathPoints(){const out=[];for(let d=2;d<=136;d+=2){const s=sEnd+sign*d,u=path(s);out.push(point(u,s,h(u,s)))}return out;},
 };
}
