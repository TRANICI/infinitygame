"use strict";
const WEAPONS={rifle:{name:'AR-30 步枪',mag:30,reserve:90,damage:28,head:84,interval:.105,reload:2.1,spread:.006},pistol:{name:'P-12 手枪',mag:12,reserve:48,damage:34,head:92,interval:.25,reload:1.4,spread:.003},knife:{name:'蝴蝶刀',mag:0,reserve:0,damage:65,head:65,interval:.55,reload:0,spread:0}};
class ArenaMatch{
  constructor(map,hooks={},seed=42){this.map=map;this.h=hooks;this.random=FP.rng(seed);this.score=[0,0];this.round=0;this.mode='menu';this.actors=[];this.effects=[];this.impacts=[];this.feed=[];this.inspectIndex=-1;this.inspection=null;this.spectate=1;}
  start(){this.score=[0,0];this.round=0;this.inspectIndex=-1;this.spectate=0;this.actors=Array.from({length:10},(_,id)=>({id,team:id<5?0:1,name:id===0?'你':id<5?'蓝队 '+id:'橙队 '+(id-4),kills:0,deaths:0}));this.nextRound();}
  nextRound(){this.round++;this.mode='prep';this.time=3;this.inspection=null;this.effects=[];this.impacts=[];this.feed=[];const centres=[[49,103],[73,25]];
    for(const a of this.actors){const [x,y]=centres[a.team],slot=a.id%5,p=this.map.point(x+(slot-2)*1.2,y+(slot%2)*1.8);Object.assign(a,p,{eyeElevation:p.elevation,angle:a.team===0?-2.8:2.9,pitch:0,hp:100,alive:true,vy:0,weapon:'rifle',ammo:{rifle:30,pistol:12},reserve:{rifle:90,pistol:48},cooldown:0,reloading:0,flash:0,recoil:0,moving:0,path:[],think:a.id*.12,target:null,lastSeen:null,memory:0,step:0,repath:0,reaction:.4,routeIndex:0});}
    this.player=this.actors[0];this.h.round?.();
  }
  switchWeapon(a,key){if(!a.alive||!WEAPONS[key]||a.weapon===key)return;a.weapon=key;a.reloading=0;a.cooldown=.2;if(a.id===0)this.inspection=null;this.h.sound?.('equip',a);}
  reload(a){if(!a.alive||a.weapon==='knife'||a.reloading||a.ammo[a.weapon]>=WEAPONS[a.weapon].mag||a.reserve[a.weapon]<=0)return false;a.reloading=WEAPONS[a.weapon].reload;if(a.id===0)this.inspection=null;this.h.sound?.('reload',a);return true;}
  inspect(){if(!this.player?.alive||!['live','prep'].includes(this.mode)||this.player.weapon!=='knife')return;this.inspectIndex=(this.inspectIndex+1)%3;this.inspection={index:this.inspectIndex,time:0,duration:[2.2,2.6,2.8][this.inspectIndex]};this.h.sound?.('flip',this.player);}
  hitActor(origin,dir,a,max){let lo=0,hi=max;const min=[a.x-.29,a.elevation,a.y-.29],upper=[a.x+.29,a.elevation+1.8,a.y+.29];for(let i=0;i<3;i++){if(Math.abs(dir[i])<1e-7){if(origin[i]<min[i]||origin[i]>upper[i])return null;continue;}let p=(min[i]-origin[i])/dir[i],q=(upper[i]-origin[i])/dir[i];if(p>q)[p,q]=[q,p];lo=Math.max(lo,p);hi=Math.min(hi,q);if(lo>hi)return null;}return lo;}
  fire(a,aim=null){if(this.mode!=='live'||!a.alive||a.cooldown>0||a.reloading)return false;const w=WEAPONS[a.weapon],recoil=a.recoil||0;if(a.id===0)this.inspection=null;if(a.weapon!=='knife'&&a.ammo[a.weapon]<=0){this.reload(a);return false;}if(a.weapon!=='knife')a.ammo[a.weapon]--;a.cooldown=w.interval;a.flash=.055;a.recoil=a.weapon==='knife'?0:Math.min(.12,a.recoil+.024);this.h.sound?.(a.weapon==='knife'?'slash':a.weapon,a);
    let angle=aim?.angle??a.angle,pitch=aim?.pitch??(a.pitch+recoil);const spread=w.spread*(a.moving>0?3:1)*(a.aiming?.45:1);angle+=(this.random()-.5)*spread;pitch+=(this.random()-.5)*spread;
    const origin=[a.x,a.elevation+1.58,a.y],dir=[Math.cos(angle)*Math.cos(pitch),Math.sin(pitch),Math.sin(angle)*Math.cos(pitch)],range=a.weapon==='knife'?2.15:100,wall=this.map.ray(origin,dir,range);let best=null,d=wall;
    for(const b of this.actors){if(b===a||!b.alive)continue;const hit=this.hitActor(origin,dir,b,d);if(hit!==null&&hit<d){d=hit;best=b;}}
    const end=origin.map((v,i)=>v+dir[i]*d);if(a.weapon!=='knife')this.effects.push({from:origin,to:end,time:.09,team:a.team});if(!best&&wall<range){this.impacts.push({point:end.map((v,i)=>v-dir[i]*.07),time:3});if(this.impacts.length>40)this.impacts.shift();}
    if(best&&best.team!==a.team){const head=end[1]>best.elevation+1.42;this.damage(best,head?w.head:w.damage,a,head);if(a.id===0)this.h.hit?.(head);}return true;
  }
  damage(v,amount,killer,head=false){if(!v.alive)return;v.hp=Math.max(0,v.hp-amount);if(v.id===0)this.h.hurt?.();if(!v.hp){v.alive=false;v.deaths++;killer.kills++;this.feed.unshift({text:killer.name+'  →  '+v.name+(head?' · 爆头':''),team:killer.team,time:5});this.feed=this.feed.slice(0,4);if(v.id===0){this.inspection=null;this.h.death?.();}this.checkRound();}}
  checkRound(){if(this.mode!=='live')return;const n=[0,1].map(t=>this.actors.filter(a=>a.team===t&&a.alive).length);if(!n[0]||!n[1])this.endRound(!n[0]&&!n[1]?-1:n[0]?0:1,'歼灭对手');}
  endRound(team,reason){if(this.mode!=='live')return;if(team>=0)this.score[team]++;this.winner=team;this.reason=reason;this.mode=this.score.some(v=>v>=5)?'finished':'roundEnd';this.time=4;this.inspection=null;this.h.result?.();}
  timeout(){const rank=[0,1].map(t=>this.actors.filter(a=>a.alive&&a.team===t).reduce((n,a)=>n+1000+a.hp,0));this.endRound(rank[0]===rank[1]?-1:rank[0]>rank[1]?0:1,'时间结束 · 按存活人数 / 生命值判定');}
  view(){if(this.player?.alive)return this.player;const alive=this.actors.filter(a=>a.alive&&a.team===0);return alive[this.spectate%Math.max(1,alive.length)]||this.player;}
  update(dt){if(!['prep','live','roundEnd'].includes(this.mode))return;dt=Math.min(dt,.05);this.time-=dt;if(this.inspection){this.inspection.time+=dt;if(this.inspection.time>this.inspection.duration)this.inspection=null;}if(this.mode==='prep'){for(const a of this.actors)a.cooldown=Math.max(0,a.cooldown-dt);if(this.time<=0){this.mode='live';this.time=120;}return;}if(this.mode==='roundEnd'){if(this.time<=0)this.nextRound();return;}
    if(this.time<=0){this.timeout();return;}
    this.effects=this.effects.filter(e=>(e.time-=dt)>0);this.impacts=this.impacts.filter(e=>(e.time-=dt)>0);this.feed=this.feed.filter(e=>(e.time-=dt)>0);
    for(const a of this.actors){a.cooldown=Math.max(0,a.cooldown-dt);a.flash=Math.max(0,a.flash-dt);a.recoil*=Math.exp(-14*dt);if(!a.alive)continue;
      if(a.reloading>0){a.reloading-=dt;if(a.reloading<=0){const key=a.weapon,n=Math.min(WEAPONS[key].mag-a.ammo[key],a.reserve[key]);a.ammo[key]+=n;a.reserve[key]-=n;}}
      this.map.settle(a,dt);if(a.id)this.bot(a,dt);
    }this.separate();this.checkRound();
  }
  separate(){for(let i=0;i<this.actors.length;i++)for(let j=i+1;j<this.actors.length;j++){const a=this.actors[i],b=this.actors[j];if(!a.alive||!b.alive||Math.abs(a.elevation-b.elevation)>1.2)continue;const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>=.68)continue;const s=(.68-d)*.5,nx=d>.001?dx/d:1,ny=d>.001?dy/d:0;if(a.id)this.map.move(a,-nx*s,-ny*s);this.map.move(b,nx*s*(a.id?1:2),ny*s*(a.id?1:2));}}
  patrol(a){if(!this.routes){const routes=[[[24,85],[23,62],[24,38],[27,22],[55,25],[73,25]],[[55,84],[56,55],[55,36],[73,25]],[[81,89],[82,74],[103,65],[103,34],[99,22],[73,25]],[[56,68],[64,46],[75,40],[99,22],[73,25]]];this.routes=routes.map(r=>r.map(([x,y])=>this.map.point(x,y)));this.reverseRoutes=this.routes.map(r=>[...r].reverse().concat([this.map.point(49,103)]));}const points=(a.team===0?this.routes:this.reverseRoutes)[(a.id+(this.round-1))%4];let goal=points[a.routeIndex%points.length];if(FP.dist(a,goal)<1.8){a.routeIndex++;a.repath=0;goal=points[a.routeIndex%points.length];}return goal;}
  bot(a,dt){a.think-=dt;a.repath-=dt;a.memory=Math.max(0,a.memory-dt);
    if(a.think<=0){a.think=.17+this.random()*.12;const opponents=this.actors.filter(b=>b.alive&&b.team!==a.team&&FP.dist(a,b)<44).sort((b,c)=>FP.dist(a,b)-FP.dist(a,c));const seen=opponents.find(b=>this.map.visible(a,b));if(seen){if(a.target!==seen)a.reaction=.3+this.random()*.35;a.target=seen;a.lastSeen={x:seen.x,y:seen.y,elevation:seen.elevation};a.memory=5;}else a.target=null;}
    let goal=a.memory>0?a.lastSeen:null;
    if(a.target?.alive){const t=a.target,d=FP.dist(a,t);a.angle=Math.atan2(t.y-a.y,t.x-a.x);a.pitch=Math.atan2(t.elevation+1.35-a.elevation-1.58,d);a.reaction-=dt;
      const ally=this.actors.some(b=>b!==a&&b.alive&&b.team===a.team&&FP.dist(a,b)<d&&Math.abs(FP.angle(Math.atan2(b.y-a.y,b.x-a.x),a.angle))<.1);
      if(a.weapon!=='knife'&&!a.ammo[a.weapon]&&!a.reloading){if(!this.reload(a))this.switchWeapon(a,a.weapon==='rifle'?'pistol':'knife');}
      if(a.reaction<=0&&!ally&&this.map.visible(a,t)){const error=.025+(d/1000);this.fire(a,{angle:a.angle+(this.random()-.5)*error,pitch:a.pitch+(this.random()-.5)*error});}
      if(d<(a.weapon==='knife'?1.6:18)){a.moving=0;if(ally||a.reloading){const side=a.id%2?1:-1,x=a.x,y=a.y;this.map.move(a,-Math.sin(a.angle)*side*dt*1.6,Math.cos(a.angle)*side*dt*1.6);a.moving=Math.hypot(a.x-x,a.y-y)/dt;}return;}
    }
    if(!goal)goal=this.patrol(a);
    if(a.repath<=0||!a.path.length){a.path=this.map.path(a,goal);if(a.path.length>1)a.path.shift();a.repath=1.6+this.random();if(!a.path.length&&!a.memory)a.routeIndex++;}
    while(a.path.length&&FP.dist(a,a.path[0])<.18)a.path.shift();const q=a.path[0];a.moving=0;
    if(q){const d=FP.dist(a,q),x=a.x,y=a.y,step=Math.min(d,3.8*dt);let vx=(q.x-a.x)/d,vy=(q.y-a.y)/d;for(const b of this.actors){if(b===a||!b.alive||Math.abs(a.elevation-b.elevation)>1)continue;const dx=b.x-a.x,dy=b.y-a.y,near=Math.hypot(dx,dy);if(near>1.35||near<.001||dx*vx+dy*vy<0)continue;const turn=(dx*vy-dy*vx)>0?1:-1,weight=(1.35-near)*1.8;vx+=-dy/near*turn*weight;vy+=dx/near*turn*weight;}const length=Math.hypot(vx,vy);this.map.move(a,vx/length*step,vy/length*step);a.moving=Math.hypot(a.x-x,a.y-y)/dt;if(!a.target)a.angle=Math.atan2(q.y-a.y,q.x-a.x);if(a.moving<.01)a.repath=Math.min(a.repath,.2);a.step-=dt;if(a.step<=0&&a.moving>.1){a.step=.4;this.h.sound?.('step',a);}}
    if(!a.ammo[a.weapon]){if(!this.reload(a)&&a.weapon==='rifle')this.switchWeapon(a,'pistol');}
  }
}
