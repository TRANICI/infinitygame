"use strict";
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const context=vm.createContext({localStorage:{getItem:()=>null}});
for(const file of ['dust2-layout.js','dust2-scene.js','dust2-terrain-data.js','dust2-architecture.js','terrain.js','core.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
const result=vm.runInContext(`(()=>{
 WZ.loadLevel(0);WZ.createObjects();const s=DUST2_LAYOUT.scale,p=([x,y])=>({x:x*s,y:y*s});
 const links=[['B upper to lower tunnel',[177,518],[173,433],14],['lower tunnel to B',[125,370],[119,234],19],['lower tunnel to middle',[283,337],[400,337],14],['middle double doors',[401,320],[393,275],8],['A short stairs',[539,318],[539,242],12],['CT to A',[586,193],[719,196],14],['A long doors',[587,562],[587,510],8],['A long to A',[737,415],[735,285],13]];
 return links.map(([name,a,b,max])=>{a=p(a);b=p(b);const path=WZ.findPath(a,b);let length=0,last=a,blocked=false;const e={...a};
  for(const q of path){length+=WZ.distance(last,q);last=q;for(let n=0;n<40&&WZ.distance(e,q)>.03;n++){const d=WZ.distance(e,q),v=Math.min(d,.08);WZ.move(e,(q.x-e.x)/d*v,(q.y-e.y)/d*v,.19);WZ.settle(e,.08);}if(WZ.distance(e,q)>.04){blocked=true;break;}}
  return {name,startClear:WZ.canStand(a.x,a.y),endClear:WZ.canStand(b.x,b.y),length,max,blocked,arrived:WZ.distance(e,b)<.7};});
})()`,context);
for(const r of result)console.log(JSON.stringify(r));
for(const r of result){assert.ok(r.startClear&&r.endClear&&!r.blocked&&r.arrived&&r.length<r.max*2.154,r.name);}
