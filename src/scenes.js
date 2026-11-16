// Each world has its own entry point; scene navigation reloads and releases the previous world.
const q = new URLSearchParams(location.search);
export const SCENE_IDS = ['aurora', 'autumn', 'alpine', 'village'];
export const SCENE = SCENE_IDS.includes(q.get('scene')) ? q.get('scene') : 'aurora';

/** Goes to the other picture, from its start. Asked for the one already showing, does nothing. */
export function showScene(scene, {arrival = false} = {}) {
  if (scene === SCENE || !SCENE_IDS.includes(scene)) return;
  const next = new URLSearchParams(location.search);
  next.set('scene', scene);
  if (arrival) next.set('arrival', 'waystation');
  else next.delete('arrival');
  location.search = next.toString();
}
