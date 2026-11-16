import * as THREE from 'three';
import { COMMON, LAND_RES } from '../oilpaint/common.js';
import { groundRings } from '../oilpaint/ground.js';
import { noise } from '../world/noise.js';
import { EXTENT, roadX, riverX, ROAD_WIDTH, riverLevel, riverHalfWidth, gravelHalfWidth, sideChannelX, sideHalfWidth, riverObstacles, COTTAGE } from './config.js';
export { EXTENT, roadX, riverX };

const N = LAND_RES, heights = new Float32Array(N*N), map = new Uint8Array(N*N*4), hydro = new Float32Array(N*N*4);
const smooth = (a,b,x) => THREE.MathUtils.smoothstep(x,a,b);
export function baseHeight(x,z) {
  return 2.3 + 1.9*Math.sin(z/58) + 1.3*Math.cos(x/53) + .65*noise(x/42+2,z/42)
    + 30*smooth(80,240,Math.abs(x)) + 36*smooth(100,250,-z);
}
export async function prepareLand(pause) {
  for (let j=0;j<N;j++) {
    if (j%64===0) await pause?.(j/N);
    for (let i=0;i<N;i++) {
      const x=-EXTENT+i/(N-1)*2*EXTENT,z=-EXTENT+j/(N-1)*2*EXTENT;
      const road=Math.abs(x-roadX(z)), river=Math.abs(x-riverX(z));
      const level=riverLevel(z),wide=gravelHalfWidth(z),side=Math.abs(x-sideChannelX(z));
      const width=riverHalfWidth(z),sw=sideHalfWidth(z);
      const mainCut=1-smooth(width*.35,width*1.20,river);
      const sideCut=1-smooth(sw*.20,sw*1.25,side);
      const flood=1-smooth(wide-3,wide+2,river);
      const bed=level+.26+.07*noise(x/3.2,z/4.2)-Math.max(.88*mainCut,.53*sideCut);
      const y=THREE.MathUtils.lerp(baseHeight(x,z),bed,flood);
      heights[i+j*N]=y;
      const k=(i+j*N)*4;
      // Restrict water to carved channels, including where surrounding meadows lie lower.
      let depth=Math.min(level-y,Math.max(width*1.18-river,sw*1.23-side));
      const sideFlow=side<sw&&river>width,cx=sideFlow?sideChannelX:riverX;
      const slope=(riverLevel(z+.25)-riverLevel(z-.25))/.5;
      const speed=Math.min(1.75,.38+Math.sqrt(slope)*2.3)*(sideFlow?.70:1)*(2.6/width)**.35;
      let vx=-(cx(z+.25)-cx(z-.25))/.5*speed,vz=-speed;
      if(flood>.2)for(const rock of riverObstacles){
        const dx=x-rock.x,dz=z-rock.z,dist=Math.hypot(dx,dz);
        depth=Math.min(depth,dist-rock.r*.76);
        const influence=Math.exp(-(dx*dx+dz*dz*.45)/(rock.r*rock.r*7));
        vx+=Math.sign(dx||.001)*influence*speed*.8;vz*=1-influence*.36;
      }
      hydro[k]=level;hydro[k+1]=depth;hydro[k+2]=vx;hydro[k+3]=vz;
      const pathX=THREE.MathUtils.clamp(x,COTTAGE.x+3.1,roadX(COTTAGE.z));
      const cottagePath=1-smooth(.75,1.2,Math.hypot(x-pathX,z-COTTAGE.z));
      map[k]=255*Math.max(cottagePath,1-smooth(ROAD_WIDTH/2-.15,ROAD_WIDTH/2+.28,road));
      map[k+1]=255*flood;
      map[k+2]=255*(.5+.35*noise(x/13,z/13));map[k+3]=255*(.5+.5*noise(x/19+7,z/23-3));
    }
  }
}
export function hydroAt(x,z){
 const fx=THREE.MathUtils.clamp((x+EXTENT)/(2*EXTENT)*(N-1),0,N-1.001),fz=THREE.MathUtils.clamp((z+EXTENT)/(2*EXTENT)*(N-1),0,N-1.001);
 const i=Math.floor(fx),j=Math.floor(fz),tx=fx-i,tz=fz-j,k=(i+j*N)*4;
 const out=[];for(let c=0;c<4;c++)out.push(THREE.MathUtils.lerp(THREE.MathUtils.lerp(hydro[k+c],hydro[k+4+c],tx),THREE.MathUtils.lerp(hydro[k+N*4+c],hydro[k+(N+1)*4+c],tx),tz));
 return {level:out[0],depth:out[1],vx:out[2],vz:out[3]};
}
export function heightAt(x,z) {
  const fx=THREE.MathUtils.clamp((x+EXTENT)/(2*EXTENT)*(N-1),0,N-1.001);
  const fz=THREE.MathUtils.clamp((z+EXTENT)/(2*EXTENT)*(N-1),0,N-1.001);
  const i=Math.floor(fx),j=Math.floor(fz),tx=fx-i,tz=fz-j;
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(heights[i+j*N],heights[i+1+j*N],tx),
    THREE.MathUtils.lerp(heights[i+(j+1)*N],heights[i+1+(j+1)*N],tx),tz);
}
const COLORS = `
uniform sampler2D tMeadowPaint;
uniform sampler2D tGravelPaint;
uniform sampler2D tHydro;
vec3 meadowColour(vec3 P, vec4 m, float r) {
 float lit = clamp(dot(normalAt(P.xz),uSunDir)*.48+.19+(m.a-.5)*.30,0.0,1.0);
 float colourPatch=texture(tNoise,P.xz/37.).r;
 vec3 c=paint3(vec3(.53,.61,.25),vec3(.34,.44,.19),vec3(.13,.25,.23),lit,r);
 c=mix(c,vec3(.57,.53,.29),smoothstep(.60,.79,colourPatch)*.48);
 c=mix(c,vec3(.48,.55,.27),m.b*.28);
 c=mix(c,texture(tMeadowPaint,P.xz/13.).rgb*(.62+lit*.38),.28);
 c=mix(c,paint3(vec3(.84,.82,.68),vec3(.67,.68,.59),vec3(.43,.51,.50),lit,r),m.r);
 vec3 stone=r<.22?vec3(.65,.62,.59):r<.44?vec3(.49,.53,.61):r<.65?vec3(.74,.70,.59):r<.82?vec3(.79,.80,.73):vec3(.43,.41,.39);
 stone=mix(stone,texture(tGravelPaint,P.xz/8.).rgb,.30);
 float wet=1.-smoothstep(0.,.23,P.y-texture(tHydro,landUv(P.xz)).r);stone=mix(stone,stone*.64,wet*.6);
 c=mix(c,stone,m.g);
 return c*mix(.69,1.,woodSunAt(P));
}`;
export async function createLand(shared) {
  const loader=new THREE.TextureLoader();
  const [meadowPaint,gravelPaint]=await Promise.all([
    loader.loadAsync('/alpine/assets-v3/09-meadow-ground.png'),
    loader.loadAsync('/alpine/assets-v3/08-river-gravel.png'),
  ]);
  for(const t of [meadowPaint,gravelPaint]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.NoColorSpace;t.anisotropy=8;}
  shared.tMeadowPaint={value:meadowPaint};shared.tGravelPaint={value:gravelPaint};
  shared.uExtent.value=EXTENT;
  const th=new THREE.DataTexture(heights,N,N,THREE.RedFormat,THREE.FloatType);
  const tm=new THREE.DataTexture(map,N,N);
  for (const t of [th,tm]) { t.minFilter=t.magFilter=THREE.LinearFilter;t.needsUpdate=true; }
  shared.tHeight.value=th;shared.tLand.value=tm;
  const hyd=new THREE.DataTexture(hydro,N,N,THREE.RGBAFormat,THREE.FloatType);hyd.minFilter=hyd.magFilter=THREE.LinearFilter;hyd.needsUpdate=true;shared.tHydro={value:hyd};
  const geo=new THREE.PlaneGeometry(2*EXTENT,2*EXTENT,512,512);geo.rotateX(-Math.PI/2);
  const p=geo.attributes.position;
  for(let i=0;i<p.count;i++)p.setY(i,heightAt(p.getX(i),p.getZ(i))-.025);
  const mesh=new THREE.Mesh(geo,new THREE.ShaderMaterial({glslVersion:THREE.GLSL3,uniforms:shared,
    vertexShader:`${COMMON}\nout vec3 P;void main(){P=position;gl_Position=projectionMatrix*viewMatrix*vec4(P,1.);}`,
    fragmentShader:`${COMMON}\n${COLORS}\nin vec3 P;layout(location=0)out vec4 color;void main(){vec4 m=texture(tLand,landUv(P.xz));color=vec4(hazed(meadowColour(P,m,texture(tNoise,P.xz/6.).r)*.91,P),1.);}` }));
  const floor=groundRings(shared,{head:COLORS,body:`
void makeDab(inout Dab d){
 vec2 cell;float sub;if(!ringCell(17.,true,cell,sub)){d.alive=0.;return;}
 vec4 r=hash4(cell,sub*13.+8.);vec2 xz=(cell+r.xy)*uCell0;
 if(max(abs(xz.x),abs(xz.y))>254.){d.alive=0.;return;}
 float lod;d.alive=ringGrow(distance(xz,cameraPosition.xz),lod);if(d.alive<=0.)return;
 vec3 P=vec3(xz.x,heightAt(xz),xz.y);vec4 m=texture(tLand,landUv(xz));
 vec3 c=jitter(meadowColour(P,m,r.z),r.yzw,.28);
 float a=sin(xz.y/30.)*.45+(r.w-.5)*2.3;
 d.pos=P;d.dir=normalize(mix(vec3(cos(a),0.,sin(a)),vec3(.3*cos(xz.y/34.)+.12,0.,1.),m.r));
 d.size=mix(vec2(.40,.77),vec2(.28,.44),m.g)*(1.+r.z*.55)*lod;d.c1=hazed(c,P);d.c2=hazed(c*1.08,P);
 d.lie=1.;d.nrm=normalAt(xz);d.height=.012+.025*r.w;d.glaze=1.;d.seed=dot(cell,vec2(1.,57.))+sub;
}`,per:2,n:128,cell0:.42,levels:5,minPx:[1.5,3],maxPx:[4000,4000],cells:[0,8]});
  function heightField(cells=384,half=192){
    const out=new Float32Array((cells+1)*(cells+1));
    for(let col=0;col<=cells;col++)for(let row=0;row<=cells;row++)out[row+col*(cells+1)]=heightAt(-half+col/cells*2*half,-half+row/cells*2*half);
    return {heights:out,cells,half};
  }
  return {mesh,floor,heightField};
}
