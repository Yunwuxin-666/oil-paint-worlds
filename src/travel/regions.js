// One shared atlas: the printed plan, live minimap and waystations use these IDs.
export const REGIONS = [
 {id:'aurora',name:'极光雪岭',station:'雪岭驿站',x:350,y:225,color:'#80cbd1',tag:'北境 · 雪松与极光',description:'沿覆雪山脊走向木屋，仰望流动的极光。',neighbors:['alpine','autumn']},
 {id:'alpine',name:'雪山牧场',station:'牧场驿站',x:865,y:305,color:'#a5bf74',tag:'东境 · 溪流与牧场',description:'穿过草甸和溪流，探访山脚的牧屋与牛群。',neighbors:['aurora','village']},
 {id:'autumn',name:'秋日森林',station:'林间驿站',x:300,y:555,color:'#df9e50',tag:'西境 · 林径与落叶',description:'循着金色落叶，在透光的树林中漫步。',neighbors:['aurora','village']},
 {id:'village',name:'柏树麦田',station:'麦田驿站',x:850,y:590,color:'#e8c665',tag:'南境 · 村落与麦田',description:'穿过起伏麦田和柏树村落，采集颜色并作画。',neighbors:['autumn','alpine']},
];
export const regionById=id=>REGIONS.find(r=>r.id===id);
export const ROUTES=[['aurora','alpine'],['alpine','village'],['village','autumn'],['autumn','aurora']];
