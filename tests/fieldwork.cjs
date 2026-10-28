"use strict";
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const c=vm.createContext({assert,localStorage:{getItem:()=>null}});
for(const f of ['dust2-layout.js','dust2-scene.js','dust2-architecture.js','annex.js','courtyard-rooms.js','terrain.js','core.js','interactions.js'])vm.runInContext(fs.readFileSync(f,'utf8'),c);
const result=vm.runInContext(`(()=>{
  const objects=WZ.createObjects(),player={...WZ.level.start,elevation:7.92,stamina:100},s={objects,player,enemy:{...WZ.level.enemy},mode:'playing',pursuerEnabled:false};
  const i=new WardInteractions(s,{save(){},updateHUD(){},subtitle(){},audio:{door(){},pickup(){},power(){}}});i.reset();
  const obj=id=>objects.find(o=>o.id===id),walked=[];
  function walkTo(q){
    const path=WZ.findPath(player,q);if(!path.length)return false;
    const p={...player,verticalSpeed:0};
    for(const n of path){for(let t=0;t<60&&WZ.distance(p,n)>.03;t++){const d=WZ.distance(p,n),step=Math.min(.07,d);WZ.move(p,(n.x-p.x)/d*step,(n.y-p.y)/d*step);WZ.settle(p,1/60);}if(WZ.distance(p,n)>.1)return false;}
    if(WZ.distance(p,q)>.7)return false;Object.assign(player,p);return true;
  }
  function approach(id){
    const o=obj(id);
    for(const d of[1,1.5,2])for(const[dx,dy]of[[d,0],[-d,0],[0,d],[0,-d]]){
      const q={x:o.x+dx,y:o.y+dy,elevation:o.baseY};
      if(!WZ.canStand(q.x,q.y,.25,q.elevation)||WZ.interactionDistance(q,o)>=1.5||!WZ.lineOfSight(q,o))continue;
      if(walkTo(q)&&Math.abs(player.elevation-o.baseY)<.3&&WZ.lineOfSight(player,o)){player.angle=Math.atan2(o.y-player.y,o.x-player.x);walked.push(id);return o;}
    }
    assert.fail('No physically reachable interaction point: '+id+' from '+JSON.stringify(player));
  }
  approach('arrival-route');approach('triage-clue');const safe=approach('shift-safe');
  i.solve(safe);assert.equal(i.has('crowbar'),false,'wrong code grants nothing');
  for(const[index,n]of[3,1,7].entries())for(let j=0;j<n;j++)i.turn(safe,index);
  i.solve(safe);i.solve(safe);assert.equal(i.s.inventory.crowbar,1,'one reward per puzzle');
  approach('pump-clue');const pump=approach('well-pump');i.turn(pump,0);i.turn(pump,1);i.turn(pump,2);i.solve(pump);assert.equal(i.has('motor-fuse'),false,'overpressure rejected');
  i.turn(pump,1);i.solve(pump);assert.equal(i.s.inventory['motor-fuse'],1);
  const door=approach('room-door-workshop');i.interact(door);i.search(approach('workshop-tools'));
  const boards=approach('decon-boards');assert.equal(boards.collide,true);i.fieldAction(boards);assert.equal(boards.collide,false);
  const gate=approach('decon-gate');assert.equal(gate.collide,true);i.fieldAction(gate);i.fieldAction(gate);assert.equal(gate.collide,false);assert.equal(i.s.inventory['motor-fuse'],0);assert.equal(i.has('screwdriver'),true);
  assert.ok(walkTo({x:81,y:61.5,elevation:4.68}),'walk through repaired corridor');
  approach('pharmacy-clue');const win=approach('pharmacy-window');assert.equal(win.collide,true);i.fieldAction(win,true);assert.equal(win.collide,false);
  const meds=approach('medicine-cabinet');i.solve(meds);assert.equal(i.has('drink'),false);i.turn(meds,1);i.turn(meds,2);i.turn(meds,2);i.solve(meds);i.solve(meds);assert.equal(i.s.inventory.drink,2);
  const saved=JSON.parse(JSON.stringify(i.s));i.reset(saved);assert.ok(!gate.collide&&!win.collide&&!boards.collide&&meds.activated,'geometry survives reload');
  i.reset({inventory:{crowbar:-2,drink:'NaN'},dials:{'shift-safe':[99,-1,'bad']}});assert.equal(i.s.inventory.crowbar,0);assert.equal(i.s.inventory.drink,0);assert.equal(i.s.dials['shift-safe'].join(''),'900');
  assert.ok(gate.collide&&win.collide&&boards.collide,'reset restores barriers');
  const drawer=obj('supply-drawer'),viewer={x:6,y:25,elevation:4.68,angle:Math.PI};
  assert.ok(WZ.nearbyInteractions(viewer).some(v=>v.object===drawer),'visible object has cue');
  assert.equal(WZ.nearbyInteractions({...viewer,hidden:true}).length,0,'hiding has no cues');
  assert.ok(!WZ.nearbyInteractions({...viewer,elevation:10}).some(v=>v.object===drawer),'other floor has no cue');
  assert.ok(!WZ.nearbyInteractions({x:10,y:25,elevation:4.68,angle:Math.PI}).some(v=>v.object===drawer),'closed door blocks cue');
  const wide=obj('room-door-supply'),edge={x:9.7,y:27.7,elevation:4.68};assert.ok(WZ.interactionDistance(edge,wide)<1,'wide door uses surface distance');
  return {walked,restored:true,cues:true};
})()`,c);
console.log(JSON.stringify(result));console.log('PASS: physical puzzle route, wrong answers, resource use, barrier traversal, persistence, visibility cues and wide-door reach');
