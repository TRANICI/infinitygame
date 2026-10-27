"use strict";
// Accumulate relative motion until the next frame. There is deliberately no
// inertia: consumed motion never leaks into later frames.
class WardLookInput {
  constructor(){this.reset();}
  reset(locked=false){
    this.x=0;this.y=0;this.primed=!locked;this.lastEvent=0;
  }
  add(x,y){
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    this.x+=x;this.y+=y;
  }
  mouse(x,y,time){
    if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(time))return;
    if(x===0&&y===0)return;
    // Pointer capture can report the distance from the menu cursor to the
    // recentered cursor as its first relative event. It is not camera motion.
    if(!this.primed){this.primed=true;this.lastEvent=time;return;}
    const elapsed=this.lastEvent?Math.max(0,time-this.lastEvent):16;
    this.lastEvent=time;
    // Reject impossible single-event warps while retaining fast intentional
    // turns and accumulated high-polling-rate input.
    const maxEvent=Math.max(100,Math.min(600,elapsed*24));
    if(Math.abs(x)>maxEvent||Math.abs(y)>maxEvent)return;
    this.add(x,y);
  }
  apply(player,dt,sensitivity){
    const x=this.x,y=this.y;this.x=this.y=0;
    if(!Number.isFinite(dt)||dt<=0)return;
    const gain=WZ.clamp(Number(sensitivity)||50,10,100)/50;
    const maxTurn=Math.PI*4*Math.min(dt,1/30);
    player.angle+=WZ.clamp(x*.0018*gain,-maxTurn,maxTurn);
    player.pitch=WZ.clamp(player.pitch-WZ.clamp(y*.0016*gain,-maxTurn,maxTurn),-.85,.85);
  }
}
