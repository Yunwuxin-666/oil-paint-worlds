import * as THREE from 'three';
import { createKit } from '../night/kit.js';

const pal = (l, m, s) => ({ l, m, s });
export const PALETTES = {
  plaster: pal([.82,.80,.67],[.60,.62,.52],[.35,.43,.40]),
  slate: pal([.46,.47,.43],[.31,.35,.34],[.17,.23,.25]),
  masonry: pal([.63,.65,.58],[.42,.48,.44],[.26,.33,.33]),
  wood: pal([.65,.48,.27],[.40,.29,.18],[.19,.22,.21]),
  pale: pal([.94,.89,.72],[.69,.66,.53],[.37,.44,.42]),
  blue: pal([.18,.48,.67],[.10,.31,.46],[.075,.16,.24]),
  yellow: pal([.99,.77,.22],[.79,.53,.12],[.44,.35,.15]),
  glass: pal([.45,.64,.70],[.18,.34,.41],[.075,.17,.22]),
  rubber: pal([.22,.25,.25],[.12,.15,.16],[.06,.08,.09]),
  metal: pal([.72,.75,.69],[.43,.48,.46],[.22,.28,.30]),
  brown: pal([.48,.37,.22],[.30,.23,.15],[.13,.15,.14]),
  cream: pal([.96,.90,.72],[.76,.68,.50],[.43,.44,.35]),
  nose: pal([.44,.34,.28],[.28,.22,.20],[.12,.13,.13]),
  grass: pal([.65,.75,.28],[.41,.56,.20],[.17,.32,.21]),
  stone: pal([.77,.80,.77],[.51,.60,.62],[.32,.42,.48]),
};
export const DAYLIGHT = `
vec3 kitPaint(vec3 P, vec3 Nn, int k, float tone, float r) {
  float lit = clamp(dot(Nn, uSunDir) * .72 + .38, 0.0, 1.0);
  vec3 c = paint3(PAL_L[k], PAL_M[k], PAL_S[k], lit, r);
  return c * tone;
}`;

export function kit(shared, options = {}) {
  return createKit(shared, { palettes: PALETTES, light: DAYLIGHT, haze: true, ...options });
}

// The upstream kit stores world coordinates. For articulated props only, apply this
// group's rigid matrix to BOTH the base mesh and the brush pins. No upstream scene changes.
export function movable(painted) {
  const { group, under, strokes } = painted;
  const matrix = { value: group.matrixWorld };
  under.material.uniforms = { ...under.material.uniforms, uObject: matrix };
  under.material.vertexShader = under.material.vertexShader
    .replace('in float aPal;', 'uniform mat4 uObject; in float aPal;')
    .replace('vWorld = position; vN = normal;', 'vWorld = (uObject * vec4(position, 1.0)).xyz; vN = mat3(uObject) * normal;')
    .replace('vec4(position, 1.0); }', 'vec4(vWorld, 1.0); }');
  strokes.material.uniforms.uObject = matrix;
  strokes.material.vertexShader = strokes.material.vertexShader
    .replace('in vec3 aPos;', 'uniform mat4 uObject; in vec3 aPos;')
    .replace('vec3 Nn = normalize(aNrm);', 'vec3 P = (uObject * vec4(aPos, 1.0)).xyz; vec3 Nn = normalize(mat3(uObject) * aNrm);')
    .replaceAll('cameraPosition - aPos', 'cameraPosition - P')
    .replaceAll('kitPaint(aPos,', 'kitPaint(P,')
    .replace('d.pos = aPos;', 'd.pos = P;')
    .replace('d.dir = aDir;', 'd.dir = mat3(uObject) * aDir;')
    .replaceAll('hazed(c1, aPos)', 'hazed(c1, P)')
    .replaceAll('hazed(c2, aPos)', 'hazed(c2, P)');
  return painted;
}

export function ellipsoid(builder, x, y, z, sx, sy, sz, palette, opts = {}) {
  builder.add(new THREE.SphereGeometry(1, 20, 12), builder.place(x,y,z,0,[sx,sy,sz]), palette,
    { smooth: true, stroke: [.075,.19], density: .7, grain: new THREE.Vector3(0,1,0), ...opts });
}
