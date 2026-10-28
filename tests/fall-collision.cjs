"use strict";
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({localStorage:{getItem:()=>null}});
for(const file of ['dust2-layout.js','dust2-scene.js','dust2-architecture.js','annex.js','courtyard-rooms.js','terrain.js','core.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
const result=vm.runInContext(`(()=>{
 const objects=WZ.createObjects(),crate=objects.find(o=>o.type==='crate'&&Math.abs(o.x-166*.14)<.01),top=crate.baseY+crate.bodyHeight;
 const actor={x:crate.x,y:crate.y,elevation:top+2,verticalSpeed:0};
 for(let i=0;i<180;i++)WZ.settle(actor,1/60);
 const landed=actor.elevation,clear=WZ.canStand(actor.x,actor.y,.25,actor.elevation);
 for(let i=0;i<180;i++){WZ.move(actor,.05,0);WZ.settle(actor,1/60);}
 return {top,landed,clear,escaped:Math.abs(actor.x-crate.x)>crate.width/2+.5};
})()`,c);
assert.ok(Math.abs(result.landed-result.top)<.02,'falling must land on the crate, not inside it');
assert.ok(result.clear&&result.escaped,'the player must be able to walk off the landing');
console.log('PASS: falling onto a solid prop leaves the player supported and free to move');
