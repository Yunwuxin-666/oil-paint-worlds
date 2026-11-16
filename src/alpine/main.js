// Alpine pasture: a metre-scale playable world, using the original painter and human rig.
// Shown with ?scene=alpine.
//   ?capture       no clock: window.lab.step(dt, n) advances it (for stills and films)
//   ?quality=low   lower pixel ratio and no volumetric shafts
//   ?shafts=0 ?canvas=0 ?impasto=0..2    parts of the finish, for comparing
import * as THREE from 'three';
import {createWorldScope} from '../travel/lifecycle.js';
import {createWorldTravel} from '../travel/world-map.js';
import { patchBlock } from 'patch-block';
import recipe from '../../recipe.json';
import RAPIER from '../figure/rapier/rapier.mjs';
import { createShared, WIND } from '../oilpaint/common.js';
import { createBrushSheet } from '../oilpaint/brush.js';
import { prepareLand, createLand, heightAt } from './land.js';
import { noise } from '../world/noise.js';
import { START, BOUNDS, roadX } from './config.js';
import { createEnvironment } from './environment.js';
import { createLandscape } from './landscape.js';
import { createProps } from './props.js';
import { createGame } from './game.js';





import { createShade } from '../oilpaint/shade.js';
import { createFrame } from '../oilpaint/finish.js';
import { createFigure } from '../figure/figure.js';
import { Animator } from '../figure/animator.js';
import { Player } from '../figure/player.js';
import { Input } from '../figure/input.js';
import { Follow } from '../figure/camera.js';

export async function startWorld(){
const scope=createWorldScope();
const addEventListener=scope.listen, setTimeout=scope.delay;
const q = new URLSearchParams(location.search);
const capture = q.has('capture');
// ?quality wins; otherwise Patch's performance mode, where there is one
const lowQuality = () => (q.get('quality') ?? window.patch?.quality ?? 'high') === 'low';

// Patch's page talks to the demo through this. There are no controls yet; it carries loading, ready and hiding.
let shown = true;
let loaded = false;
const block = patchBlock({
  ...recipe.block,
  onSet() {},
  onTrigger() {},
  onVisible(visible) { shown = visible; if (loaded) run(); },
});
block.progress(0.03, '铺设地形');
const timings = {};
let mark = performance.now();
const lap = (name) => { const now = performance.now(); timings[name] = Math.round(now - mark); mark = now; };

const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(capture ? 1 : Math.min(devicePixelRatio, 1.5));
renderer.setSize(innerWidth, innerHeight);
renderer.autoClear = false;
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
document.getElementById('view').appendChild(renderer.domElement);

const shared = createShared();
shared.uSunDir.value.set(-.50,.62,-.60).normalize();
shared.uHaze.value.setRGB(.54,.63,.66);
shared.uHazeSun.value.setRGB(.80,.79,.66);
shared.uHazeGlow.value.setRGB(.025,.022,.012);
shared.uHazeDensity.value=.00065;
shared.uGroundMist.value=.0026;
shared.uBounce.value.setRGB(.045,.06,.02);
shared.uGlazeMul.value.setRGB(.43,.46,.57);
shared.uImpasto.value=.52;
shared.tBrush.value = createBrushSheet();
if (q.has('impasto')) shared.uImpasto.value = +q.get('impasto');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.2, 9500);
// Listened for from the start, not once loaded: the page may go fullscreen while the world is still being made.
// The frame's target joins in once it exists.
let fitFrame = () => {};
function fitView() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  fitFrame();
}
addEventListener('resize', fitView);
lap('start');
// the wanderer's files are the large ones: they start coming down now, while the wood is made
let told = 0;
const say = (value, label) => { told = Math.max(told, value); block.progress(told, label); };
const figureComing = createFigure(shared, (done) => say(0.05 + 0.55 * done, '加载旅人'));

const turn = () => new Promise((resolve) => setTimeout(resolve, 0));
await prepareLand((done) => { say(0.03 + 0.07 * done, '铺设地形'); return turn(); });
const land = await createLand(shared);
lap('land');
say(0.1, '描绘雪峰与牧场');
await turn();
const landscape = await createLandscape(shared);
const environment = createEnvironment(shared);
scene.add(environment.group);
const props = createProps(shared);
const floor = land.floor;
scene.add(land.mesh, floor.group, landscape.group, props.group);
props.group.updateMatrixWorld(true);
const still = new THREE.Scene();
const shadowMaterial = new THREE.MeshBasicMaterial();
for (const t of landscape.colliders) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(t.r,t.r,t.h,5), shadowMaterial);
  trunk.position.set(t.x,t.y+t.h/2,t.z); still.add(trunk);
  const canopy=new THREE.Mesh(new THREE.ConeGeometry(t.h*.18,t.h*.7,7),shadowMaterial);canopy.position.set(t.x,t.y+t.h*.62,t.z);still.add(canopy);
}
for (const box of props.solids) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(box.hx*2,box.hy*2,box.hz*2),shadowMaterial);
  m.position.set(box.x,box.y,box.z);m.rotation.set(0,box.yaw,box.roll??0);still.add(m);
}
const shade = createShade(renderer,shared,still,{sun:shared.uSunDir.value,size:[2048,2048],box:[180,180],centre:[0,5,0],back:400,near:10,far:800});
for (const m of [...still.children]) m.geometry.dispose();
shadowMaterial.dispose();
lap('world');
// --- the ground and the trunks, for his feet ---
await RAPIER.init();
const physics = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
{
  const f = land.heightField();
  physics.createCollider(RAPIER.ColliderDesc.heightfield(f.cells, f.cells, f.heights, { x: 2 * f.half, y: 1, z: 2 * f.half }));
  for (const t of landscape.colliders) physics.createCollider(RAPIER.ColliderDesc.cylinder(t.h/2,t.r).setTranslation(t.x,t.y+t.h/2,t.z));
  for (const b of props.solids) physics.createCollider(RAPIER.ColliderDesc.cuboid(b.hx,b.hy,b.hz).setTranslation(b.x,b.y,b.z).setRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(0,b.yaw,b.roll??0))));
}
lap('physics');

const figure = await figureComing;
const { man } = figure;
scene.add(man.object, figure.cloakMesh, figure.dabs);
const animator = new Animator(man);
const spawn = new THREE.Vector3(START.x, heightAt(START.x, START.z), START.z);
const player = new Player({ RAPIER, world: physics, man, animator, spawn, yaw: Math.PI });
const follow = new Follow(camera);
follow.yaw = Math.PI;
// Closer third-person framing, with room above the figure for the road and valley.
follow.pitch = .18;
follow.want = follow.distance = 13;
follow.side = .65;
follow.lift = 1.5;
const input = new Input(document.getElementById('view'), { pads: !capture && !q.has('nopad') });
physics.step();
lap('figure');

const frame = createFrame(renderer, shared);
fitFrame = () => frame.resize();
frame.uniforms.uCanvas.value = q.has('canvas') ? +q.get('canvas') : 1.35;
/** Low quality drops volumetric lighting and caps the pixel ratio. */
function applyQuality() {
  const low = lowQuality();
  frame.uniforms.uShafts.value = q.has('shafts') ? +q.get('shafts') : low ? 0 : .16;
  environment.setQuality(low);
  renderer.setPixelRatio(capture ? 1 : Math.min(devicePixelRatio, low ? 1 : 1.5));
  renderer.setSize(innerWidth,innerHeight); frame.resize();
}
applyQuality();
window.patch?.addEventListener?.('qualitychange', applyQuality, {signal:scope.signal});

// Meadow wind drives the cape; grass and airborne seeds use the same prevailing direction.
const wind = { x: WIND.x, z: WIND.y };
let time = 0;
function air(x, y, z, out) {
  const along = x * wind.x + z * wind.z, across = -x * wind.z + z * wind.x;
  const gust = THREE.MathUtils.clamp(0.5 + 0.8 * noise((along - time * 4) / 40, across / 90) + 0.3 * noise((along - time * 6.5) / 11, across / 17), 0, 1);
  const speed = 0.4 + 3.2 * gust * gust;
  return out.set(wind.x * speed, 0.25 * Math.sin(time * 2.3 + x) * gust, wind.z * speed);
}

function respawn() {
  const half = player.halfHeight();
  player.body.setTranslation({ x: spawn.x, y: spawn.y + player.t.radius + half + 0.05, z: spawn.z }, true);
  physics.propagateModifiedBodyPositionsToColliders();
  player.vel.set(0, 0, 0); player.speed = 0; player.mode = 'move';
  player.feet.copy(spawn); player.prevFeet.copy(spawn); player.visualY = spawn.y; player.grounded = true;
  follow.free=null;document.getElementById('pasture-camera')?.setAttribute('aria-pressed','false');
  player.yaw = player.lastYaw = Math.PI; follow.yaw = Math.PI; follow.pitch=.18; follow.pivot.set(0,0,0);
  animator.lock = null; animator.lockOff = null;
  animator.enter(animator.locoState({ strafe: false }), 0.1);
}

const game = createGame({props,player,camera,physics,RAPIER,respawn,capture:capture||q.has('clean'),signal:scope.signal});
const travel = createWorldTravel({shared,scene,player,input,follow,camera,heightAt,spawn,pathAt:roadX,physics,animator,game,props,capture:capture||q.has('clean'),signal:scope.signal});
let overview=false;
function toggleOverview(){
 overview=!follow.free;
 follow.free=overview?{position:new THREE.Vector3(44,30,137),target:new THREE.Vector3(-5,25,-100)}:null;
 document.getElementById('pasture-camera')?.setAttribute('aria-pressed',String(overview));
}
if(!capture&&!q.has('clean')){
 const button=document.createElement('button');button.id='pasture-camera';button.type='button';button.textContent='V · 全景 / 跟随';button.setAttribute('aria-pressed','false');
 button.onclick=()=>{toggleOverview();button.blur();};document.body.append(button);
 addEventListener('keydown',e=>{if(e.code==='KeyV'&&!e.repeat)toggleOverview();});
}
const size = new THREE.Vector2();
function tick(dt) {
  dt = Math.min(dt, 1 / 20);
  time += dt;
  const inp = input.read(dt);
  if(environment.inWater){inp.walk=true;inp.sprint=false;}
  player.update(dt, inp, follow.yaw);
  // Keep the wanderer inside the walkable pasture and recover from falling below its heightfield.
  if (player.feet.y < heightAt(player.feet.x,player.feet.z)-5) travel.recover();
  const root = player.visualRoot(dt);
  man.object.position.copy(root);
  man.object.rotation.set(0, player.yaw, 0);
  man.object.updateMatrixWorld(true);
  const local = player.vel.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), -player.yaw);
  animator.update(dt, { speed: player.mode === 'move' ? player.speed : Math.hypot(local.x, local.z), moveAngle: player.moveAngle, grounded: player.grounded });
  animator.relaxHands(player.speed);
  animator.uprightTrunk(dt, player.speed, player.grounded && player.mode !== 'jump' && player.mode !== 'air' ? 1 : 0.3);
  const lookW = player.mode === 'move' || player.mode === 'idleExtra' ? THREE.MathUtils.clamp(1 - (player.speed - 1.5) / 2, 0, 1) : 0;
  animator.lookToward(dt, camera.getWorldDirection(new THREE.Vector3()), lookW);
  animator.armClearance(dt);
  if (player.mode === 'move' && !player.strafe) animator.leanInto(dt, player.turnRate, player.speed, player.accelF);
  else animator.leanInto(dt, 0, 0, 0);
  const onGround = player.grounded && player.mode !== 'jump' && player.mode !== 'air';
  animator.placeFeet(dt, (x, z, from) => player.ground(x, z, from, 1.4), root.y, onGround ? 1 : 0);
  man.object.updateMatrixWorld(true);
  figure.updateCloak(dt, air, heightAt);
  props.update(time,dt);
  environment.update(time,dt,player,camera);

  follow.update(dt, root, inp.look, inp.zoom, (o, d, max) => player.castRay(o, d, max), heightAt);
  camera.updateMatrixWorld(true);
  game.update(dt);
  props.group.updateMatrixWorld(true);
  renderer.getDrawingBufferSize(size);
  shared.uTime.value = time;
  shared.uPixel.value = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / size.y;
  shared.uFocus.value.copy(root);
  floor.follow(camera.position.x, camera.position.z);
  shade.update(scene, root);
  travel.update(time,dt);
  frame.render(scene, camera);
}

window.lab = {
  THREE, player, follow, camera, input, animator, figure, shared, frame, renderer, timings, counts: landscape.counts, heightAt, respawn, game, props, physics, scene, environment, landscape, travel, way: Array.from({length:170},(_,i)=>[roadX(85-i),85-i]),
  step(dt = 1 / 60, n = 1) { for (let i = 0; i < n; i++) tick(dt); },
  setInput(fn) { input.override = fn; },
  /** Puts him at (x, z) on the ground, facing (fx, fz), with the eye behind him. */
  teleport(x, z, fx, fz) {
    const y = heightAt(x, z), half = player.halfHeight();
    player.body.setTranslation({ x, y: y + player.t.radius + half + 0.05, z }, true);
    physics.propagateModifiedBodyPositionsToColliders();
    player.feet.set(x, y, z); player.prevFeet.copy(player.feet); player.visualY = y;
    player.vel.set(0, 0, 0); player.speed = 0; player.mode = 'move'; player.grounded = true;
    player.yaw = player.lastYaw = Math.atan2(fx - x, fz - z);
    follow.yaw = player.yaw; follow.pivot.set(0, 0, 0);
    animator.lock = null; animator.lockOff = null;
    animator.enter(animator.locoState({ strafe: false }), 0.05);
    tick(1 / 60);
  },
  /** A fixed view for stills: eye and what it looks at. Call with nothing to go back to following him. */
  view(eye, target) { follow.free = eye ? { position: new THREE.Vector3(...eye), target: new THREE.Vector3(...target) } : null; },
};

// --- warming up: every shader is built and drawn once, and the GPU has caught up, before anyone is let in ---
say(0.68, '调配颜料');
/** Resolves when the GPU has done everything it has been sent: JavaScript finishing isn't the GPU finishing. */
function gpuDone() {
  const gl = renderer.getContext();
  const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
  gl.flush();
  return new Promise((resolve) => {
    const poll = () => {
      if (gl.clientWaitSync(sync, 0, 0) === gl.TIMEOUT_EXPIRED) return void setTimeout(poll, 4);
      gl.deleteSync(sync);
      resolve();
    };
    poll();
  });
}
if (!capture) {
  renderer.debug.checkShaderErrors = true;
  await renderer.compileAsync(scene, camera);
  lap('shaders');
  say(0.86, '调配颜料');
}
for (let i = 0; i < (capture ? 1 : 5); i++) {
  tick(1 / 60);
  if (capture) break;
  await gpuDone();
  say(0.88 + 0.025 * i, '落下第一笔');
  await turn();
}
lap('first frame');

// Draws while the page says the demo can be seen, and not at all while it can't.
let running = false;
let last = 0;
function run() {
  const want = shown && !capture;
  if (want === running) return;
  running = want;
  last = performance.now();
  renderer.setAnimationLoop(want ? () => { const now = performance.now(); tick((now - last) / 1000); last = now; } : null);
}
if (!capture) {
  const hint = document.getElementById('hint');
  hint.textContent = '点击转动视角 · WASD 移动 · Shift 冲刺 · 空格 跳跃 · E 互动 · R 重新巡场 · V 全景 · Esc 释放鼠标';
  addEventListener('keydown', (e) => { if (e.code === 'KeyH') hint.classList.toggle('off'); });
  setTimeout(() => hint.classList.add('faded'), 9000);
}
fitView();
loaded = true;
run();
document.getElementById('loading')?.remove();
if (q.has('clean') || capture) document.getElementById('hint')?.remove();
block.ready();
window.lab.ready = true;
// for the measuring tools
window.__block = { ready: true, block, timings, set() {} };

return {lab:window.lab,dispose(){scope.dispose({renderer,scene,shared,physics,input,travel,frame,shade,block});}};
}
