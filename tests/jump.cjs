"use strict";
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const c=vm.createContext({localStorage:{getItem:()=>null}});
for(const f of ['dust2-layout.js','dust2-scene.js','dust2-architecture.js','annex.js','courtyard-rooms.js','terrain.js','core.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
for(const fps of [30,60,144])for(const level of [0]){
const r=vm.runInContext(`(()=>{WZ.loadLevel(${level});WZ.createObjects();const p={...WZ.level.start};WZ.settle(p,1/60);const base=p.elevation;const started=WZ.jump(p),double=WZ.jump(p);let peak=base;for(let i=0;i<${fps}*2;i++){WZ.move(p,.001,0);WZ.settle(p,1/${fps});peak=Math.max(peak,p.elevation);}p.hidden=true;const hidden=WZ.jump(p);p.hidden=false;p.crouch=true;return {started,double,hidden,crouch:WZ.jump(p),rise:peak-base,landed:Math.abs(p.elevation-base)<.03,clear:WZ.canStand(p.x,p.y,.25,p.elevation)};})()`,c);
assert.ok(r.started&&!r.double&&!r.hidden&&!r.crouch&&r.rise>.5&&r.rise<.95&&r.landed&&r.clear,JSON.stringify({fps,level,...r}));
}
console.log('PASS: jump arc, air movement, ceiling, landing, no double jump at 30/60/144 Hz in the active courtyard');
