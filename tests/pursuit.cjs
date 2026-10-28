"use strict";
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({assert,localStorage:{getItem:()=>null}});
for(const f of ['dust2-layout.js','dust2-scene.js','dust2-architecture.js','annex.js','courtyard-rooms.js','terrain.js','core.js','pursuer.js','cartography.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
console.log(vm.runInContext(`(()=>{
 const objects=WZ.createObjects(),s={objects,player:{x:126,y:58,elevation:4.68,angle:Math.PI/2,torch:true},enemy:{x:126,y:64,elevation:4.68,path:[],mode:'patrol',repath:0,waypoint:0,lureTime:0},pursuerEnabled:true,levelElapsed:30,mission:{entered:true,door:false},moveAmount:0,chases:0,stress:0};
 let caught=0;const ai=new WardPursuer(s,{caught(){caught++}}),cart=new WardCartography(s);cart.reset();cart.update(true);
 assert.ok(s.charted.length>0&&s.charted.length<35);assert.ok(!WardCartography.known(s,205,85),'unvisited wing is hidden');
 const before=s.enemy.y;for(let n=0;n<30;n++)ai.update(1/60);assert.equal(s.enemy.mode,'chase');assert.ok(s.enemy.y<before-1.5,'chase closes distance faster than walking');assert.ok(s.stress>0,'looking increases fear');
 const lastTarget=JSON.stringify(s.enemy.target);s.player.hidden=true;s.player.x=128;for(let n=0;n<60;n++)ai.update(1/60);assert.equal(JSON.stringify(s.enemy.target),lastTarget,'hiding does not reveal new coordinates');assert.equal(caught,0);
 for(let n=0;n<460;n++)ai.update(1/60);assert.equal(s.enemy.mode,'search','persistent search after last seen memory');
 s.enemy.mode='patrol';s.enemy.lure={x:126,y:60,elevation:4.68};s.enemy.lureTime=8;ai.update(.05);assert.equal(s.enemy.mode,'investigate');
 s.player.hidden=false;Object.assign(s.enemy,{x:s.player.x,y:s.player.y,elevation:4.68,lureTime:0});ai.update(.01);assert.equal(caught,1,'close contact catches');
 const saved=[...s.charted];Object.assign(s.player,{x:204,y:86,elevation:4.68});cart.update(true);assert.ok(s.charted.length>saved.length);const revealed=[...s.charted];cart.reset(revealed);assert.ok(WardCartography.known(s,204,86),'map persists');cart.reset();assert.equal(s.charted.length,0,'new game clears map');
 Object.assign(s.player,{x:11,y:26.5,elevation:4.68});cart.update(true);assert.ok(!WardCartography.known(s,4,25),'closed room not revealed through door');
 return 'PASS: active chase speed, stress, last-seen search, hiding, lure, capture and exploration-only persistent map';
})()`,c));
