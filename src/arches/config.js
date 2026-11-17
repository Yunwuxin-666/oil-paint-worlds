export const SEED=528954;
export const EXTENT=256;
export const roadX=z=>-6+6*Math.sin(z/34);
export const START={x:roadX(64),z:64};
export const BOUNDS={x:150,south:180,north:-160};
export const STATIONS=[
 {id:'strata',name:'岩层的年轮',x:roadX(26)-2,z:26,text:'砂岩一层层沉积，再被风和水雕刻成今天的岩壁。'},
 {id:'great-arch',name:'巨拱之下',x:roadX(-28),z:-28,text:'你走进了石拱腹地。抬头看，整块岩桥仍与两侧山体相连。'},
 {id:'rear-arch',name:'双拱回望',x:roadX(-110)-2,z:-110,text:'回头望去，大小两座石拱在蓝天下重叠成框。'},
];
