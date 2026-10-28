"use strict";
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({localStorage:{getItem:()=>null}});
for(const file of ['dust2-layout.js','dust2-scene.js','dust2-architecture.js','annex.js','courtyard-rooms.js','terrain.js','core.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
const r=vm.runInContext(`(()=>{
 const objects=WZ.createObjects(),entrance={x:105,y:60,elevation:4.68},office={x:157,y:85,elevation:4.68};
 const gate=objects.find(o=>o.id==='annex-gate'),shortcut=objects.find(o=>o.id==='annex-return-gate');
 const closed=!WZ.findPath(entrance,office).length;
 gate.collide=false;gate.activated=true;WZ.refreshCollision();
 const walk=(from,to)=>{const path=WZ.findPath(from,to),e={...from,verticalSpeed:0};let blocked=false;
   for(const q of path){for(let i=0;i<30&&WZ.distance(e,q)>.025;i++){const d=WZ.distance(e,q),v=Math.min(d,.08);WZ.move(e,(q.x-e.x)/d*v,(q.y-e.y)/d*v);WZ.settle(e,1/60);}if(WZ.distance(e,q)>.04){blocked=true;break;}}
   return {id:to.id||'office',nodes:path.length,blocked,arrived:WZ.distance(e,to)<1.5,elevation:e.elevation};};
 const routes=objects.filter(o=>['puzzle','evidence'].includes(o.type)).map(o=>walk(entrance,o));
 const long=WZ.findPath(entrance,office).length;shortcut.collide=false;shortcut.activated=true;WZ.refreshCollision();const short=WZ.findPath(entrance,office).length;
 const seam={x:109,y:60,elevation:4.68};for(let i=0;i<140;i++){WZ.move(seam,.1,0);WZ.settle(seam,1/60);}
 const jump={x:126,y:59,elevation:4.68};WZ.jump(jump);let peak=0;for(let i=0;i<120;i++){WZ.settle(jump,1/60);peak=Math.max(peak,jump.elevation-4.68);}
 return {levels:WZ.levels.length,closed,routes,long,short,seam:seam.x,seamHeight:seam.elevation,jumpPeak:peak,edges:DUST2_ANNEX.edges.length};
})()`,c);
assert.equal(r.levels,1);assert.ok(r.closed,'both doors block the office before solving');
for(const route of r.routes)assert.ok(route.nodes&&route.arrived&&!route.blocked&&Math.abs(route.elevation-4.68)<.01,JSON.stringify(route));
assert.ok(r.short<r.long-20,'office return shortcut shortens the route');
assert.ok(r.seam>122&&Math.abs(r.seamHeight-4.68)<.01,'new/old map seam is level and walkable');
assert.ok(r.jumpPeak>.5&&r.jumpPeak<.9,'annex ceiling allows normal jump arc');
assert.equal(r.edges,25,'maze has a real loop as well as dead ends');
console.log('PASS: one level, locked routes, physically walked routes to every new interaction, shortcut, map seam, jump clearance');
console.log(JSON.stringify(r));
