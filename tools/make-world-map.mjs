import fs from 'node:fs';
import {REGIONS} from '../src/travel/regions.js';
// Exploration seed 583232: a folded valley with a river through its centre.
let seed=583232;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
const s=[];const add=x=>s.push(x);
add(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800" role="img" aria-labelledby="title desc"><title id="title">四境漫游 · 世界地图平面图</title><desc id="desc">北部极光雪岭，东部雪山牧场，南部柏树麦田，西部秋日森林；四条游览路线连成环，每区各设一处传送驿站。</desc><defs><filter id="paper"><feTurbulence type="fractalNoise" baseFrequency=".08" numOctaves="3" seed="23"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncA type="linear" slope=".12"/></feComponentTransfer><feBlend in="SourceGraphic" mode="multiply"/></filter><filter id="edge"><feTurbulence type="fractalNoise" baseFrequency=".014" numOctaves="2" seed="58" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="7"/></filter><clipPath id="land"><path d="M84 147Q207 71 384 129T711 133Q950 96 1092 199L1132 533Q1109 708 912 713L268 722Q92 711 68 567Z"/></clipPath></defs><rect width="1200" height="800" fill="#eee1bd"/><g font-family="Microsoft YaHei, Noto Sans CJK SC, sans-serif" fill="#263d3c"><text x="54" y="52" font-size="14" letter-spacing="5">THE PAINTED WORLDS</text><text x="54" y="91" font-size="30" font-weight="700" letter-spacing="4">四境漫游</text><text x="273" y="88" font-size="15" fill="#6f7565">山野相连，循色而行</text></g><g clip-path="url(#land)"><rect x="50" y="110" width="1100" height="620" fill="#71988a"/><path d="M53 124H746L798 315 601 407 90 366Z" fill="#44687a"/><path d="M608 124H1150V525L753 536 587 375Z" fill="#8ca882"/><path d="M57 330L575 359 694 552 545 750H50Z" fill="#bc8649"/><path d="M659 406L1150 452V750H496Z" fill="#d2ad52"/>`);
// Wide broken colour strokes follow the four landforms, rather than micro-noise.
for(let i=0;i<210;i++){
 const x=75+random()*1050,y=130+random()*580,w=28+random()*100;
 const c=y<340?(x<650?['#7f9da9','#65858c','#344d65']:['#a2b383','#c1c89b','#657f6a']):x<580?['#dfb15b','#9a6944','#cd9952']:['#e8c76c','#b59440','#f0d583'];
 add(`<path d="M${x|0} ${y|0}q${w*.4|0} -12 ${w|0} -5" fill="none" stroke="${c[i%3]}" stroke-width="${8+random()*10|0}" opacity=".52" filter="url(#edge)"/>`);
}
const mountain=(x,y,w,h)=>add(`<path d="M${x-w} ${y}L${x-w*.15} ${y-h} ${x+w} ${y}Z" fill="#789ba8" stroke="#335369" stroke-width="3"/><path d="M${x-w*.15} ${y-h}L${x+w*.33} ${y-h*.54} ${x+w*.05} ${y-h*.62} ${x-w*.05} ${y-h*.48} ${x-w*.3} ${y-h*.60}Z" fill="#ecedd5"/>`);
for(const a of [[200,253,83,110],[329,203,82,98],[449,261,89,124],[586,226,79,100],[754,242,82,94],[905,235,91,91],[1031,283,80,111]])mountain(...a);
// River connects the northern meltwater with the lower valley.
add(`<path d="M652 187Q608 285 670 339T647 472Q614 547 683 623T662 751" fill="none" stroke="#c9d1b1" stroke-width="27"/><path d="M652 187Q608 285 670 339T647 472Q614 547 683 623T662 751" fill="none" stroke="#6aa9aa" stroke-width="15"/><path d="M651 209Q621 284 675 342M658 393Q625 450 642 483M651 541Q637 576 680 619" fill="none" stroke="#cce1cc" stroke-width="4"/>`);
const pine=(x,y,h,c)=>add(`<path d="M${x} ${y}v${-h}" stroke="#514c3b" stroke-width="4"/><path d="M${x} ${y-h}l${-h*.28} ${h*.64}h${h*.12}l${-h*.18} ${h*.22}h${h*.7}l${-h*.18} ${-h*.22}h${h*.1}Z" fill="${c}"/>`);
for(let i=0;i<21;i++){pine(165+random()*410,240+random()*105,27+random()*25,i%2?'#99c5c5':'#254b5a');pine(772+random()*280,300+random()*126,25+random()*24,i%2?'#41664f':'#2c5148');}
for(let i=0;i<35;i++){
 const x=128+random()*388,y=397+random()*251;
 add(`<path d="M${x|0} ${y|0}v-30" stroke="#66503e" stroke-width="4"/><path d="M${x-20|0} ${y-24|0}q-12 -28 18 -39q38 -6 28 29l-20 17Z" fill="${['#e4b858','#c06c39','#8c6446','#deb966'][i%4]}"/>`);
}
for(let i=0;i<13;i++){
 const x=770+(i%4)*55+random()*12,y=470+Math.floor(i/4)*43;
 add(`<path d="M${x|0} ${y|0}v32h39v-32" fill="${i%2?'#d9d5b1':'#eee2bb'}" stroke="#74765b" stroke-width="2"/><path d="M${x-5|0} ${y|0}l24 -17l26 17Z" fill="#ac6943"/><path d="M${x+15|0} ${y+32|0}v-16h8v16" fill="#5d6a58"/>`);
}
for(const [x,y] of [[749,524],[838,456],[942,530],[1009,579],[719,576]])add(`<path d="M${x} ${y}q-17 -20 0 -65q17 47 0 65" fill="#244f45"/>`);
// Physical-looking ring routes on the plan; region loads occur at waystations.
add(`<path d="M350 225C498 245 603 344 865 305C969 371 1013 470 850 590C709 666 487 647 300 555C231 450 219 321 350 225" fill="none" stroke="#3e5650" stroke-width="16" opacity=".65"/><path d="M350 225C498 245 603 344 865 305C969 371 1013 470 850 590C709 666 487 647 300 555C231 450 219 321 350 225" fill="none" stroke="#eee2bd" stroke-width="7" stroke-dasharray="15 11"/>`);
add('</g>');
add(`<path d="M84 147Q207 71 384 129T711 133Q950 96 1092 199L1132 533Q1109 708 912 713L268 722Q92 711 68 567Z" fill="none" stroke="#556c5d" stroke-width="3" opacity=".8"/>`);
for(const r of REGIONS)add(`<g font-family="Microsoft YaHei, Noto Sans CJK SC, sans-serif" text-anchor="middle"><circle cx="${r.x}" cy="${r.y}" r="18" fill="#eee4c6" stroke="#263f3f" stroke-width="3"/><path d="M${r.x-8} ${r.y+7}v-14h16v14M${r.x-10} ${r.y-7}h20" fill="none" stroke="#315754" stroke-width="3"/><rect x="${r.x-83}" y="${r.y+26}" width="166" height="51" rx="5" fill="#243f3d" opacity=".93"/><text x="${r.x}" y="${r.y+48}" fill="#f8eac4" font-size="20" font-weight="700">${r.name}</text><text x="${r.x}" y="${r.y+66}" fill="#c8d3b6" font-size="11">${r.station}</text></g>`);
add(`<g font-family="Microsoft YaHei, sans-serif" fill="#344f48"><path d="M1100 49v53m-10 -25l10 -28l10 28" fill="none" stroke="#344f48" stroke-width="2"/><text x="1100" y="37" text-anchor="middle" font-size="13">北 N</text><text x="56" y="767" font-size="14">◎ 传送驿站</text><path d="M197 762h64" stroke="#6d795f" stroke-width="4" stroke-dasharray="9 7"/><text x="277" y="767" font-size="14">区域连接路线</text><text x="1143" y="767" text-anchor="end" font-size="13">区域导览示意 · 非等比例地形测绘</text></g><rect width="1200" height="800" fill="#eee1bd" opacity=".18" filter="url(#paper)" pointer-events="none"/></svg>`);
fs.writeFileSync('public/world-map.svg',s.join('\n'));
console.log('public/world-map.svg');
