import { heightAt } from './land.js';

// Use the whole footprint, not a shared group pivot or a single centre sample.
export function groundFootprint(x,z,width,depth,spacing=.35){
 const nx=Math.max(1,Math.ceil(width/spacing)),nz=Math.max(1,Math.ceil(depth/spacing));
 let min=Infinity,max=-Infinity;
 for(let i=0;i<=nx;i++)for(let j=0;j<=nz;j++){
  const h=heightAt(x-width/2+width*i/nx,z-depth/2+depth*j/nz);min=Math.min(min,h);max=Math.max(max,h);
 }
 return {x,z,width,depth,min,max};
}
