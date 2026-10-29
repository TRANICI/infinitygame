"use strict";
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const ctx=vm.createContext({console,assert});
for(const file of['dust2-layout.js','dust2-architecture.js','dust2-objects.js','terrain.js','fps-map.js','fps-match.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});
vm.runInContext(`
const map=new ArenaMap();
const routes=[['T to B tunnels',[240,696],[175,540]],['B upper/lower',[177,518],[173,433]],['B entrance',[125,370],[119,234]],['lower tunnel/mid',[283,337],[400,337]],['mid doors',[401,320],[393,275]],['short stairs',[539,318],[539,242]],['CT/A',[586,193],[719,196]],['long doors',[587,562],[587,510]],['long/A',[737,415],[735,285]]];
for(const[name,start,end]of routes){const a=map.point(start[0]*.14,start[1]*.14),b=map.point(end[0]*.14,end[1]*.14),path=map.path(a,b);assert.ok(path.length,name+' route exists');const p={...a,eyeElevation:a.elevation,vy:0};for(const q of path){for(let n=0;n<50&&FP.dist(p,q)>.04;n++){const d=FP.dist(p,q),step=Math.min(d,.075);map.move(p,(q.x-p.x)/d*step,(q.y-p.y)/d*step);map.settle(p,1/60);}assert.ok(FP.dist(p,q)<.08,name+' physically walkable');}assert.ok(FP.dist(p,b)<.1,name+' arrives');}
console.log('PASS: 9 Dust2 routes, stairs, doors, and stacked floors are physically traversable');
// Flat test arena isolates ballistics from navigation and renderer timing.
const flat={point:(x,y)=>({x,y,elevation:0}),ray:(o,d,r)=>r,settle:()=>{},visible:()=>true,move:(p,x,y)=>{p.x+=x;p.y+=y;},path:()=>[]};
const m=new ArenaMatch(flat,{},9);m.start();assert.equal(m.actors.length,10);assert.equal(m.actors.filter(a=>a.team===0).length,5);assert.equal(m.actors.filter(a=>a.team===1).length,5);
m.bot=()=>{};m.mode='live';m.time=120;const p=m.player,enemy=m.actors[5],friend=m.actors[1];for(const a of m.actors){a.x=40+a.id*3;a.y=50;}Object.assign(p,{x:0,y:0,angle:0,pitch:-.05});Object.assign(enemy,{x:5,y:0});
assert.equal(m.fire(p),true);assert.equal(p.ammo.rifle,29);assert.ok(enemy.hp<100);assert.equal(m.fire(p),false);assert.equal(p.ammo.rifle,29);
p.cooldown=0;enemy.hp=100;Object.assign(friend,{x:2,y:0});m.fire(p);assert.equal(friend.hp,100,'teammate damage disabled');assert.equal(enemy.hp,100,'teammate blocks shot');friend.y=20;
p.cooldown=0;flat.ray=()=>2;m.fire(p);assert.equal(enemy.hp,100,'wall blocks shot');flat.ray=(o,d,r)=>r;
p.cooldown=0;p.recoil=0;p.pitch=0;m.fire(p);assert.equal(enemy.hp,16,'headshot damage');
p.ammo.rifle=7;p.reserve.rifle=9;m.reload(p);for(let i=0;i<45;i++)m.update(.05);assert.equal(p.ammo.rifle,16);assert.equal(p.reserve.rifle,0);assert.ok(p.reloading<=0);
p.ammo.rifle=2;p.reserve.rifle=20;m.reload(p);m.switchWeapon(p,'pistol');for(let i=0;i<50;i++)m.update(.05);assert.equal(p.ammo.rifle,2,'switch cancels reload');assert.equal(p.reserve.rifle,20);
m.switchWeapon(p,'knife');p.cooldown=0;enemy.hp=100;enemy.x=3;p.pitch=0;m.fire(p);assert.equal(enemy.hp,100,'knife cannot hit outside range');p.cooldown=0;enemy.x=1.5;m.fire(p);assert.equal(enemy.hp,35,'knife hits in reach');
const seen=new Set();for(let i=0;i<3;i++){m.inspect();seen.add(m.inspection.index);}assert.equal(seen.size,3);m.fire(friend);assert.ok(m.inspection,'AI shots preserve player inspection');m.reload(friend);assert.ok(m.inspection,'AI reload preserves player inspection');m.switchWeapon(friend,'pistol');assert.ok(m.inspection,'AI equip preserves player inspection');p.cooldown=0;m.fire(p);assert.equal(m.inspection,null,'attack interrupts inspection');m.inspect();m.switchWeapon(p,'rifle');assert.equal(m.inspection,null,'switch interrupts inspection');
m.mode='live';for(const a of m.actors.filter(a=>a.team===1))if(a.alive)m.damage(a,100,p);assert.equal(m.mode,'roundEnd');assert.equal(m.score[0],1);const kills=p.kills;for(let i=0;i<85;i++)m.update(.05);assert.equal(m.round,2);assert.equal(p.hp,100);assert.equal(p.ammo.rifle,30);assert.equal(p.kills,kills);
m.score=[4,0];m.mode='live';m.endRound(0,'test');assert.equal(m.mode,'finished');assert.equal(m.score[0],5);
console.log('PASS: 5v5 roster, fire rate, ammo, wall/friendly occlusion, headshots, reload cancellation, knife range/three inspections, death and rounds');
const jump=map.point(49,103);Object.assign(jump,{vy:0,eyeElevation:jump.elevation});const ground=jump.elevation;map.jump(jump);for(let i=0;i<10;i++)map.settle(jump,1/60);assert.ok(jump.elevation>ground+.4);for(let i=0;i<100;i++)map.settle(jump,1/60);assert.ok(Math.abs(jump.elevation-ground)<.01);
const ai=new ArenaMatch(map,{},42);ai.start();for(let i=0;i<20000&&ai.mode!=='finished';i++)ai.update(.05);assert.equal(ai.mode,'finished','full AI match resolves');assert.equal(Math.max(...ai.score),5);assert.ok(ai.actors.reduce((n,a)=>n+a.kills,0)>10,'AI fights across multiple rounds');console.log('PASS: jumping/landing and full seeded AI match',ai.score,'rounds',ai.round);
`,ctx);
