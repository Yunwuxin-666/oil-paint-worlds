import { createKit } from '../night/kit.js';
import { DAYLIGHT } from '../alpine/paint.js';
const pal=(l,m,s)=>({l,m,s});
export const PALETTES={
 wall:pal([.94,.88,.67],[.76,.75,.57],[.43,.53,.46]),
 sage:pal([.77,.84,.64],[.56,.67,.54],[.29,.45,.40]),
 roof:pal([.83,.56,.31],[.66,.37,.21],[.38,.29,.22]),
 stone:pal([.79,.73,.50],[.57,.57,.40],[.30,.39,.32]),
 wood:pal([.57,.43,.25],[.35,.29,.18],[.16,.24,.22]),
 dark:pal([.27,.37,.34],[.13,.24,.25],[.06,.14,.16]),
 leaf:pal([.27,.43,.29],[.10,.29,.27],[.035,.16,.20]),
 olive:pal([.64,.70,.44],[.42,.57,.39],[.19,.36,.30]),
 gold:pal([.96,.78,.35],[.78,.56,.21],[.41,.36,.20]),
 blue:pal([.62,.73,.80],[.39,.55,.67],[.20,.36,.47]),
};
export const kit=(shared,options={})=>createKit(shared,{palettes:PALETTES,light:DAYLIGHT,haze:true,...options});
