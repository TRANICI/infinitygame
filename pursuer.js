"use strict";
// The Relief: visible, physical pursuit. Losing sight never reveals a hidden player's new position.
class WardPursuer{
  constructor(state,hooks){this.s=state;this.h=hooks;}
  update(dt){
    const s=this.s,e=s.enemy,p=s.player;
    if(!s.pursuerEnabled||s.levelElapsed<12){this.h.danger?.(false);return;}
    const dist=WZ.distance(e,p),sameFloor=Math.abs((e.elevation||0)-(p.elevation||0))<1.9,visible=sameFloor&&dist<16&&WZ.lineOfSight(e,p);
    const facing=Math.abs(WZ.angleDiff(Math.atan2(e.y-p.y,e.x-p.x),p.angle))<.55;
    const watched=visible&&!p.hidden&&facing;
    s.stress=WZ.clamp((s.stress||0)+dt*(watched?(.15+.3*Math.max(0,1-dist/13)):-.16),0,1);
    const sees=!p.hidden&&visible&&dist<(p.torch?15:p.crouch?4:8),hears=!p.hidden&&sameFloor&&s.moveAmount>1.1&&dist<11&&WZ.lineOfSight(e,p);
    e.voiceTimer=Math.max(0,(e.voiceTimer||0)-dt);
    if(sees||hears){
      if(e.mode!=='chase'){s.chases++;e.path=[];e.repath=0;if(!e.voiceTimer){this.h.subtitle?.('代班者：“你先别走。签个字，就一个。”',5);this.h.audio?.whisper?.(Math.sin(Math.atan2(e.y-p.y,e.x-p.x)-p.angle));e.voiceTimer=18;}}
      e.mode='chase';e.memory=7;e.target={x:p.x,y:p.y,elevation:p.elevation};e.lureTime=0;
    }else if(e.mode==='chase'){
      e.memory-=dt;if(e.memory<=0){e.mode='search';e.searchTime=5;e.path=[];e.repath=0;}
    }
    const zone=s.mission?.entered?(s.mission.door?'archive':'lobby'):'courtyard';
    if(e.collisionVersion!==WZ.collisionVersion){e.path=[];e.repath=0;e.collisionVersion=WZ.collisionVersion;}
    if(e.patrolZone!==zone){e.patrolZone=zone;e.waypoint=zone==='courtyard'?3:0;if(e.mode==='patrol'){e.target=null;e.path=[];e.repath=0;}}
    if(e.mode==='search'){e.searchTime-=dt;if(e.searchTime<=0){e.mode='patrol';e.target=null;e.path=[];e.repath=0;}}
    if(e.lureTime>0&&e.mode!=='chase'){e.lureTime=Math.max(0,e.lureTime-dt);e.mode='investigate';e.target=e.lure;}
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
    e.stuck=point&&moved<.001?(e.stuck||0)+dt:0;
    if(e.stuck>1){e.path=[];e.repath=0;e.stuck=0;if(e.mode==='patrol')e.target=null;}
    e.stepTimer=(e.stepTimer||0)-dt;
    if(moved>.001&&e.stepTimer<=0){e.stepTimer=e.mode==='chase'?.34:.74;if(dist<18)this.h.audio?.enemyStep?.(Math.sin(Math.atan2(e.y-p.y,e.x-p.x)-p.angle),Math.max(0,1-dist/18)*(visible?1:.28));}
    this.h.danger?.(visible&&dist<12,e.mode==='chase'?'代班者看见你了 · 转角断开视线':'它在前面。别一直盯着看。');
    this.h.audio?.tension?.(s.stress,dt);
    if(watched&&s.stress>.8&&!e.stressSpoken){e.stressSpoken=true;this.h.subtitle?.('“别看脸。看工牌。工牌上不是写着呢吗？”',5);this.h.audio?.whisper?.(0);}
    if(s.stress<.2)e.stressSpoken=false;
    if(visible&&!p.hidden&&dist<.7&&Math.abs((e.elevation||0)-(p.elevation||0))<1)this.h.caught?.();
  }
  static meshes(renderer){
    const parts={},o={x:0,y:0,angle:Math.PI/2},coat=[.21,.26,.24],skin=[.72,.72,.61];
    const mesh=()=>new WardMesh(renderer.tiles);
    const body=mesh();
    body.box(o,0,.92,0,.52,.7,.28,'curtain',coat);body.box(o,0,1.53,-.055,.58,.39,.31,'curtain',coat);
    body.box(o,0,.61,-.015,.65,.34,.32,'curtain',[.17,.22,.2]);
    for(const side of[-1,1])body.box(o,side*.12,1.43,.17,.15,.41,.035,'metal',[.22,.24,.2]);
    body.sphere(0,1.98,.08,.095,.22,.095,skin,7,10);
    body.sphere(0,2.22,.18,.16,.275,.145,skin,5,8);
    body.sphere(0,2.15,.307,.11,.18,.025,[.49,.52,.44],8,12);
    body.sphere(0,2.23,.322,.115,.18,.025,[.8,.79,.68],4,8);
    body.box(o,-.055,2.27,.349,.07,.018,.008,'white',[.02,.03,.025]);body.box(o,.05,2.31,.349,.055,.025,.008,'white',[.02,.03,.025]);
    body.box(o,0,2.115,.349,.14,.013,.009,'white',[.07,.075,.06]);
    body.box(o,.015,2.06,.349,.018,.06,.009,'white',[.07,.075,.06]);
    for(let n=0;n<5;n++){const badge={...o,x:(n%2)*.04-.13};body.panel(badge,1.48-n*.11,.16,.22,.19+n*.007,'staff-badge',[.85-n*.08,.79-n*.06,.65-n*.04]);}
    body.box(o,0,1.76,.18,.02,.09,.015,'metal',[.8,.78,.6]);parts.body=renderer.upload(body);
    for(const side of[-1,1]){
      const arm=mesh();arm.box(o,0,-.48,0,.13,.5,.16,'curtain',coat);arm.box(o,side*.045,-1.08,.055,.095,.64,.11,'curtain',[.23,.28,.25]);
      arm.sphere(side*.06,-1.13,.07,.066,.14,.07,skin,7,8);
      for(let f=0;f<4;f++)arm.box(o,side*.06+(f-1.5)*.025,-1.39,.09,.018,.23-f*.018,.025,'white',skin);
      parts['arm'+side]=renderer.upload(arm);
      const leg=mesh();leg.box(o,0,-.65,0,.13,.67,.16,'curtain',[.15,.19,.18]);leg.box(o,0,-.88,-.035,.11,.25,.13,'curtain',[.13,.16,.15]);leg.box(o,0,-.94,.045,.15,.09,.29,'metal',[.12,.14,.12]);parts['leg'+side]=renderer.upload(leg);
    }
    return parts;
  }
  static draw(renderer,g,time){
    if(!g.pursuerEnabled||g.mode==='home'||g.mode==='chapter'||g.levelElapsed<12)return;
    const e=g.enemy;if(WZ.distance(e,g.player)>60)return;
    if(!renderer.pursuerMeshes)renderer.pursuerMeshes=this.meshes(renderer);
    const a=e.angle||0,c=Math.cos(a),s=Math.sin(a),bob=e.motion>.1?Math.sin((e.phase||0)*2)*.018:0;
    const root=[c,0,-s,0,0,1,0,0,s,0,c,0,e.x,(e.elevation||0)+bob,e.y,1];
    renderer.draw(renderer.pursuerMeshes.body,root);
    for(const side of[-1,1]){
      const moving=e.motion>.1,phase=(e.phase||0)+(side===1?Math.PI:0),swing=moving?Math.sin(phase)*.29:Math.sin(time*.55)*.025;
      for(const part of['arm','leg']){const tilt=part==='arm'?-swing*.7:swing,co=Math.cos(tilt),si=Math.sin(tilt),x=side*(part==='arm'?.34:.17),y=part==='arm'?1.8:.94;
        const local=[1,0,0,0,0,co,si,0,0,-si,co,0,x,y,0,1];renderer.draw(renderer.pursuerMeshes[part+side],renderer.multiply(root,local));}
    }
  }
}
