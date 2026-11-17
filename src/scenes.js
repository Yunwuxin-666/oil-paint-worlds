// Each region has a repeatable entry point; the world host releases it before a handoff.
const q = new URLSearchParams(location.search);
export const SCENE_IDS = ['aurora', 'autumn', 'alpine', 'village','arches'];
export let SCENE = SCENE_IDS.includes(q.get('scene')) ? q.get('scene') : 'aurora';
export function setScene(scene){if(SCENE_IDS.includes(scene))SCENE=scene;}

/** Goes to the other picture, from its start. Asked for the one already showing, does nothing. */
export function showScene(scene, {arrival = false} = {}) {
  if (scene === SCENE || !SCENE_IDS.includes(scene)) return;
  if(window.worldTravel)return window.worldTravel.switchScene(scene,{arrival});
  const next = new URLSearchParams(location.search);
  next.set('scene', scene);
  if (arrival) next.set('arrival', 'waystation');
  else next.delete('arrival');
  location.search = next.toString();
}
