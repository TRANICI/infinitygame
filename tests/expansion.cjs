"use strict";
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({localStorage:{getItem:()=>null}});
for(const f of ['dust2-layout.js','dust2-scene.js','dust2-architecture.js','annex.js','courtyard-rooms.js','terrain.js','core.js','investigation.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
const result=vm.runInContext(`(()=>{
 const objects=WZ.createObjects(),state={objects},investigation=new WardInvestigation(state,{save(){},updateHUD(){},subtitle(){},audio:{power(){},door(){}}});
 investigation.reset(null);
 const start={x:126,y:59,elevation:4.68},east={x:183,y:46,elevation:4.68},office={x:157,y:85,elevation:4.68};
 const locked=!WZ.findPath(start,east).length&&!WZ.findPath(start,office).length;
 investigation.m.door=true;investigation.sync();
 const walk=(from,to)=>{const e={...from},path=WZ.findPath(from,to);for(const q of path){for(let i=0;i<30&&WZ.distance(e,q)>.025;i++){const d=WZ.distance(e,q),step=Math.min(d,.08);WZ.move(e,(q.x-e.x)/d*step,(q.y-e.y)/d*step);WZ.settle(e,1/60);}if(WZ.distance(e,q)>.04)return false;}return !!path.length&&WZ.distance(e,to)<1.6;};
 const routes=objects.filter(o=>o.label&&o.x>=120).map(o=>({id:o.id,walked:walk(start,o)}));
 const patrol=[...DUST2_ANNEX.patrol.lobby,...DUST2_ANNEX.patrol.archive].map(([x,y])=>({x,y,elevation:4.68}));
 const patrolWalked=patrol.every((p,i)=>walk(i?patrol[i-1]:start,p));
 const release=objects.find(o=>o.id==='service-release'),gate=objects.find(o=>o.id==='service-gate');
 investigation.interact(release);const blockedWithoutValves=gate.collide;
 investigation.interact(objects.find(o=>o.id==='laundry-valve'));investigation.interact(release);const blockedWithOne=gate.collide;
 const long=WZ.findPath({x:190,y:85,elevation:4.68},office).length;
 investigation.interact(objects.find(o=>o.id==='pump-valve'));investigation.interact(release);
 const short=WZ.findPath({x:190,y:85,elevation:4.68},office).length;
 const saved=JSON.parse(JSON.stringify(state.mission));investigation.reset(saved);
 const savedOpen=!gate.collide&&state.mission.valves.length===2;
 investigation.interact(objects.find(o=>o.id==='pump-valve'));const unique=state.mission.valves.length===2;
 // The loop remains navigable when either side of the pump cross-route is blocked.
 const blocker={id:'test-blocker',x:179,y:62,width:4,depth:.3,angle:Math.PI/2,baseY:4.68,bodyHeight:3,collide:true};
 objects.push(blocker);WZ.refreshCollision();const detour=walk(east,{x:179,y:73,elevation:4.68});objects.pop();WZ.refreshCollision();
 return {locked,routes,patrolWalked,blockedWithoutValves,blockedWithOne,long,short,savedOpen,unique,detour,rooms:DUST2_ANNEX.rooms.length,
   correctedArea:WZ.area(153,47),bounds:DUST2_ANNEX.bounds};
})()`,c);
assert.ok(result.locked,'neither new entrance bypasses the main lock');
for(const r of result.routes)assert.ok(r.walked,'physically walk to '+r.id);
for(const key of ['patrolWalked','blockedWithoutValves','blockedWithOne','savedOpen','unique','detour'])assert.ok(result[key],key);
assert.ok(result.short<result.long-30,'service shortcut substantially reduces the return route');
assert.equal(result.rooms,8);assert.match(result.correctedArea,/回廊/);
console.log('PASS: eight rooms, locked entrances, every interaction and patrol route walked, loop detour, dual valves, shortcut and save compatibility');
console.log(JSON.stringify(result));
