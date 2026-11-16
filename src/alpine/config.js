// One world unit is one metre. The reference's landscape and daytime palette are locked.
// Seed drawn during ideation; only vegetation/brush scatter uses it, never anatomy or scale.
export const SEED = 435162;
export const EXTENT = 256;
export const ROAD_WIDTH = 4.8;
export const roadX = z => 11 * Math.sin(z / 34) + z * 0.12;
export const riverX = z => 47 + 5 * Math.sin(z / 35);
export const START = { x: roadX(76), z: 76 };
export const BUS = { x: roadX(61) + 4.4, z: 61 };
export const GATE = { x: -5, z: 43, width: 3.2 };
export const LOOKOUT = { x: 65, z: -16 };
export const COTTAGE = { x:3,z:64,width:7.4,depth:6.4 };
export const COTTAGE_TREES = [
 [-7,75,17],[-15,69,20],[-16,56,16],[-10,49,14],[-3,79,12],
 [8,76,13],[11,51,11],[-21,76,19],[-22,62,15],[-19,48,13],
 // Loose, staggered groups behind the cottage, leaving the porch and road clear.
 [-5,53,10],[-1,42,13],[-9,39,16],[-17,34,11],[-23,40,18],[-13,21,14],
].map(([x,z,h])=>({x,z,h}));
export const COWS = [
  { id: 'hazel', name: '榛子', x: -14, z: 28, yaw: 0.55, coat: 'brown' },
  { id: 'snow', name: '雪花', x: -31, z: 5, yaw: -0.65, coat: 'cream' },
  { id: 'cocoa', name: '可可', x: 14, z: -23, yaw: 1.4, coat: 'brown' },
];
// Grazing companions enrich the meadow without extending the three-animal feeding quest.
export const GRAZERS = [
 {id:'grazer-1',name:'麦穗',x:1,z:32,yaw:1.05,coat:'cream'},
 {id:'grazer-2',name:'栗子',x:5,z:23,yaw:-.8,coat:'brown'},
 {id:'grazer-3',name:'云朵',x:27,z:40,yaw:1.8,coat:'cream'},
 {id:'grazer-4',name:'松果',x:30,z:29,yaw:-.4,coat:'brown'},
 {id:'grazer-5',name:'奶糖',x:-30,z:20,yaw:2.1,coat:'cream'},
 {id:'grazer-6',name:'青禾',x:24,z:4,yaw:-1.1,coat:'brown'},
];
export const BOUNDS = { x: 105, south: 112, north: -96 };
// Channel and floodplain are separate: water occupies threads within a wider gravel bed.
// Monotone downstream head: pools alternate with short, steeper riffles.
export const riverLevel = z => 2 + z*.014 + .18*Math.tanh((z+48)/5) + .23*Math.tanh((z-12)/6) + .14*Math.tanh((z-72)/4);
export const riverHalfWidth = z => 2.6 + .65 * Math.sin(z / 18) + .35 * Math.sin(z / 7);
export const gravelHalfWidth = z => 12.5 + 2.5 * Math.sin(z / 32);
export const sideChannelX = z => riverX(z) + 7.8*Math.sin(Math.PI*Math.max(0,Math.min(1,(z+100)/220)))**2;
export const sideHalfWidth = z => .95+.25*Math.sin(z/19);
export const riverObstacles = [-78,-53,-29,3,28,49,76,99].map((z,i)=>({x:riverX(z)+(i%2?1:-1)*(.5+i%3*.25),z,r:.45+(i%3)*.12}));
