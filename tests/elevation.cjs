"use strict";
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({localStorage:{getItem:()=>null}});
for(const file of ['dust2-layout.js','dust2-scene.js','dust2-architecture.js','annex.js','courtyard-rooms.js','terrain.js','core.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
const r=vm.runInContext(`(()=>{
 WZ.createObjects();const s=DUST2_LAYOUT.scale,start={x:539*s,y:318*s};
 const e={...start,elevation:WZ.groundHeight(start.x,start.y),verticalSpeed:0};e.eyeElevation=e.elevation;
 const initial=e.elevation;let last=e.elevation,maxStep=0,maxEye=0;
 for(let i=0;i<220;i++){const oldEye=e.eyeElevation;WZ.move(e,0,-3.5/60);WZ.settle(e,1/60);maxStep=Math.max(maxStep,Math.abs(e.elevation-last));maxEye=Math.max(maxEye,Math.abs(e.eyeElevation-oldEye));last=e.elevation;}
 const stacked=WZ.terrain.surfaces(535*s,165*s),hints=stacked.map(h=>WZ.groundHeight(535*s,165*s,h.height));
 const a=WZ.terrain.architecture;
 return {scale:s,rise:e.elevation-initial,travel:start.y-e.y,maxStep,maxEye,stacked,hints,
   furniture:WZ.createObjects().filter(o=>o.label).every(o=>Math.abs(o.baseY-WZ.groundHeight(o.x,o.y))<.01),
   flatTread:Array.from(a.lower).filter(h=>h>=0).every(Number.isInteger)};
})()`,c);
assert.ok(r.scale>=.14,'map retains the enlarged scale');
assert.ok(r.rise>2.3&&r.travel>10,'player walks all the way up A-short stairs');
assert.ok(r.maxStep<=.37&&r.maxEye<.15,'stair movement and camera remain smooth');
assert.ok(r.stacked.length===2&&r.stacked[1].height-r.stacked[0].height>4,'CT passage retains separate floors');
assert.deepEqual(r.hints,r.stacked.map(h=>h.height),'height hints do not teleport between storeys');
assert.ok(r.furniture,'interactive furniture rests on its actual floor');
assert.ok(r.flatTread,'all architectural floors use horizontal stair treads');
console.log('PASS: scale, stairs, camera smoothing, stacked floors, furniture foundations');
console.log(JSON.stringify(r));
