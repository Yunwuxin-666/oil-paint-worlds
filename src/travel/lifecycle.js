// A region can be entered more than once without accumulating render loops,
// keyboard listeners, WebGL resources or Rapier worlds.
export function createWorldScope(){
 const controller=new AbortController(),timers=new Set();
 return {
  signal:controller.signal,
  listen(type,listener,options){window.addEventListener(type,listener,{...(typeof options==='boolean'?{capture:options}:options),signal:controller.signal});},
  delay(fn,ms){const id=window.setTimeout(()=>{timers.delete(id);if(!controller.signal.aborted)fn()},ms);timers.add(id);return id;},
  dispose({renderer,scene,shared,physics,input,travel,frame,shade,block}){
   travel.save?.();controller.abort();for(const id of timers)window.clearTimeout(id);
   input.destroy?.();renderer.setAnimationLoop(null);block.destroy?.();frame.dispose?.();shade.dispose?.();
   const geometries=new Set(),materials=new Set(),textures=new Set();
   scene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);for(const m of [o.material].flat().filter(Boolean)){materials.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v)}});
   for(const u of Object.values(shared))if(u?.value?.isTexture)textures.add(u.value);
   for(const g of geometries)g.dispose();for(const m of materials)m.dispose();for(const t of textures)t.dispose();
   physics.free();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove();
   for(const el of document.querySelectorAll('#world-atlas,#world-portal-action,#world-portal-label,#world-travel-status,#world-walk-status,#world-road-signs,#pasture-action,#pasture-toast,#pasture-markers,#pasture-camera,#village-action,#village-toast,#village-camera'))el.remove();
   document.body.classList.remove('world-map-open','world-traveling');
  },
 };
}
