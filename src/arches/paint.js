import {createKit} from '../night/kit.js';
export const PALETTES={
 rock:{l:[.94,.57,.28],m:[.67,.32,.17],s:[.30,.21,.25]},
 pale:{l:[1,.75,.43],m:[.81,.45,.24],s:[.43,.28,.26]},
 sand:{l:[.98,.76,.40],m:[.81,.54,.28],s:[.48,.33,.26]},
 shrub:{l:[.65,.69,.30],m:[.35,.45,.23],s:[.19,.29,.22]},
 wood:{l:[.60,.43,.26],m:[.35,.26,.20],s:[.23,.21,.21]},
 dry:{l:[.87,.73,.37],m:[.59,.49,.25],s:[.35,.31,.22]},
};
export const ROCK_LIGHT=`vec3 kitPaint(vec3 P,vec3 Nn,int k,float tone,float r){
 float lit=clamp(dot(Nn,uSunDir)*.67+.38,0.,1.);lit*=mix(.55,1.,woodSunAt(P+Nn*.12));
 float strata=sin(P.y*.76+sin(P.x*.10+P.z*.08)*.55);
 vec3 c=paint3(PAL_L[k],PAL_M[k],PAL_S[k],lit,r)*tone;
 if(k<2)c*=.91+.09*smoothstep(-.7,.6,strata);
 c+=vec3(.055,.023,.012)*max(-Nn.y,0.);return c;
}`;
export const kit=(shared,{seed=528954}={})=>createKit(shared,{palettes:PALETTES,seed,haze:true,light:ROCK_LIGHT});
