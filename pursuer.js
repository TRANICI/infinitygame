"use strict";
// The Crawler: visible, physical pursuit. Losing sight never reveals a hidden player's new position.
class WardPursuer{
  constructor(state,hooks){this.s=state;this.h=hooks;}
  update(dt){
    if(!Number.isFinite(dt)||dt<=0)return;
    const s=this.s,e=s.enemy,p=s.player;
    if(!s.pursuerEnabled||s.levelElapsed<12){this.h.danger?.(false);return;}
    const dist=WZ.distance(e,p),sameFloor=Math.abs((e.elevation||0)-(p.elevation||0))<1.9,visible=sameFloor&&dist<16&&WZ.lineOfSight(e,p);
    const facing=Math.abs(WZ.angleDiff(Math.atan2(e.y-p.y,e.x-p.x),p.angle))<.55;
    const watched=visible&&!p.hidden&&facing;
    s.stress=WZ.clamp((s.stress||0)+dt*(watched?(.15+.3*Math.max(0,1-dist/13)):-.16),0,1);
    const sees=!p.hidden&&visible&&dist<(p.torch?15:p.crouch?4:8),hears=!p.hidden&&sameFloor&&s.moveAmount>1.1&&dist<11&&WZ.lineOfSight(e,p);
    e.voiceTimer=Math.max(0,(e.voiceTimer||0)-dt);
    if(sees||hears){
      if(e.mode!=='chase'){s.chases++;e.path=[];e.repath=0;if(!e.voiceTimer){this.h.subtitle?.('地上有东西追过来了。先转角，别停在亮处。',5);this.h.audio?.whisper?.(Math.sin(Math.atan2(e.y-p.y,e.x-p.x)-p.angle));e.voiceTimer=18;}}
      e.mode='chase';e.memory=7;e.target={x:p.x,y:p.y,elevation:p.elevation};e.lureTime=0;
    }else if(e.mode==='chase'){
      e.memory-=dt;if(e.memory<=0){e.mode='search';e.searchTime=5;e.path=[];e.repath=0;}
    }
    const zone=s.mission?.entered?(s.mission.door?'archive':'lobby'):'courtyard';
    if(e.collisionVersion!==WZ.collisionVersion){e.path=[];e.repath=0;e.collisionVersion=WZ.collisionVersion;}
    if(e.patrolZone!==zone){e.patrolZone=zone;e.waypoint=zone==='courtyard'?3:0;if(e.mode==='patrol'){e.target=null;e.path=[];e.repath=0;}}
    if(e.mode==='search'){e.searchTime-=dt;if(e.searchTime<=0){e.mode='patrol';e.target=null;e.path=[];e.repath=0;}}
    if(e.lureTime>0&&e.mode!=='chase'){if(e.target!==e.lure){e.path=[];e.repath=0;}e.lureTime=Math.max(0,e.lureTime-dt);e.mode='investigate';e.target=e.lure;}
    else if(e.mode==='investigate'){e.mode='search';e.searchTime=2;e.path=[];}
    const routes=zone==='courtyard'?WZ.level.patrol:(zone==='lobby'?DUST2_ANNEX.patrol.lobby:[...DUST2_ANNEX.patrol.lobby,...DUST2_ANNEX.patrol.archive]).map(([x,y])=>({x,y,elevation:DUST2_ANNEX.base}));
    if(e.mode==='patrol'&&(!e.target||WZ.distance(e,e.target)<.5)){
      const q=routes[e.waypoint++%routes.length];e.target=WZ.canStand(q.x,q.y,.22,q.elevation)?q:null;e.repath=0;
    }
    e.repath-=dt;
    if(e.repath<=0&&e.target){e.path=WZ.findPath(e,e.target);e.repath=e.mode==='chase'?.55:2.5;if(!e.path.length&&e.mode==='patrol')e.target=null;}
    const point=e.path[0]||(e.mode==='chase'&&visible?e.target:null),oldX=e.x,oldY=e.y;
    WZ.settle(e,dt);
    if(point&&e.mode!=='search'){
      const d=WZ.distance(e,point),speed=e.mode==='chase'?5.65:e.mode==='investigate'?3.3:2.25;
      if(d<.15)e.path.shift();else{const step=Math.min(d,speed*dt);WZ.move(e,(point.x-e.x)/d*step,(point.y-e.y)/d*step,.22);}
    }
    const moved=Math.hypot(e.x-oldX,e.y-oldY);e.motion=moved/dt;e.phase=(e.phase||0)+moved*3.2;
    if(moved>.001){const heading=Math.atan2(e.x-oldX,e.y-oldY);e.angle=(e.angle||0)+WZ.angleDiff(heading,e.angle||0)*Math.min(1,dt*7);}
    else if(e.mode==='chase'&&visible)e.angle=Math.atan2(p.x-e.x,p.y-e.y);
    else if(e.mode==='search')e.angle=(e.angle||0)+dt*.65;
    e.stuck=point&&moved<.001?(e.stuck||0)+dt:0;
    if(e.stuck>1){e.path=[];e.repath=0;e.stuck=0;if(e.mode==='patrol')e.target=null;}
    e.stepTimer=(e.stepTimer||0)-dt;
    if(moved>.001&&e.stepTimer<=0){e.stepTimer=e.mode==='chase'?.34:.74;if(dist<22)this.h.audio?.enemyStep?.(Math.sin(Math.atan2(e.y-p.y,e.x-p.x)-p.angle),Math.pow(Math.max(0,1-dist/22),1.25)*(visible?1:.5));}
    this.h.danger?.(visible&&dist<12,e.mode==='chase'?'伏行者发现你了 · 转角断开视线':'它在前面。别一直盯着看。');
    this.h.audio?.tension?.(s.stress,dt);
    if(watched&&s.stress>.8&&!e.stressSpoken){e.stressSpoken=true;this.h.subtitle?.('它贴着地面抬起了头。别盯着那个黑洞。',5);this.h.audio?.whisper?.(0);}
    if(s.stress<.2)e.stressSpoken=false;
    if(visible&&!p.hidden&&dist<.7&&Math.abs((e.elevation||0)-(p.elevation||0))<1)this.h.caught?.();
  }
  static draw(renderer,g,time){WardStalker.draw(renderer,g,time);}
}
