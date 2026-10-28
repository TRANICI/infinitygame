"use strict";
const WZ=(()=>{
  const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function random(seed){return()=>{seed|=0;seed=seed+0x6d2b79f5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  let width=41,height=37,cells=[];
  const terrain=new WardTerrain();
  // Reference coordinates are shared by the 3D scene, map and collision system.
  const ds=DUST2_LAYOUT.scale,point=([x,y])=>({x:x*ds,y:y*ds});
  const levels=[{
    theme:'yellow',itemName:'号码牌',objective:'找齐三张遗落的号码牌',stationName:'庭院广播台',
    collectText:['001：背面是你的名字。你记得自己没领过这张牌。','017：小满写着：哥，别签字。签过就出不去了。','217：有张转院单。小满三年前就离开这里了。'],
      notes:[
        {title:'门卫路线卡',text:'三个地方各有一张号码牌：候诊庭院、病历交接廊、门诊长街。找齐后装进广播庭院的广播台，旧翼才有电。'},
        {title:'椅背上的字',text:'哥，我转院了。手续都办完了，你别再往这儿跑。\n\n下面又挤了一行：\n这句也是我写的。上面也是。说让我等你的那个不是我。\n\n落款：小满。'},
        {title:'封院通知',text:'院区已关闭，所有病人完成转院。夜班岗位取消。\n\n有人把“取消”划了七遍，又写：\n那谁接我的班？总得有人接吧。没有人我怎么走？'}
      ],
    name:'零号院区 · 未完夜班',en:'WARD ZERO / THE NIGHT SHIFT',chapter:'第一章 · 未完成的交接',
    stationAction:'庭院广播台 · 装入号码牌',exitName:'打开院区出口',
    start:{...point(DUST2_SCENE.start),angle:2.07},enemy:point(DUST2_SCENE.enemy),
    items:DUST2_SCENE.items.map(p=>p.map(v=>v*ds)),station:DUST2_SCENE.station.map(v=>v*ds),
    exit:DUST2_SCENE.exit.map(v=>v*ds),exitAngle:DUST2_SCENE.exitAngle,
    lockers:DUST2_SCENE.lockers.map(([x,y,a])=>[x*ds,y*ds,a]),
    notesPos:DUST2_SCENE.notes.map(p=>p.map(v=>v*ds)),
    labels:DUST2_SCENE.labels.map(([name,x,y])=>[name,x*ds,y*ds]),
    patrol:DUST2_SCENE.patrol,props:[],reference:DUST2_LAYOUT,
    intro:'晚上 02:17，你收到妹妹小满的语音：“哥，我还在医院。来接我。”\n这家医院三年前就关了。你还是来了。大门在背后锁上，广播喊你的名字，让你去接夜班。\n门卫桌上有本签到簿。昨天、前天、上个月，签的全是林秋。你的名字。\n先找三张号码牌给旧翼通电。转院记录在里面，得查清楚小满到底在哪。',
    reveal:'转院单上写得很清楚：三年前，小满已经被家人接走。刚才那段求救语音，是剪出来的旧录音。\n你在广播里念完自己的名字，按下“结束值班”。每天自动续上的那条交接记录，终于停了。\n打印机吐出最后一张纸：林秋已离岗。代班人——还是林秋。',
    zones:DUST2_SCENE.labels.map(([name,x,y])=>[name,(x-45)*ds,(y-45)*ds,(x+45)*ds,(y+45)*ds])
  }];
  levels[0].notes[0].title='上一位门卫的路线卡';
  levels[0].notes[0].text='不要替缺席的人签到。\n\n值班入口旁的小门通往停用门卫室。先检查抽屉，再沿地下转运道前往候诊庭院；病历交接廊穿过双门通向救护庭院，东侧门诊旧门连接门诊长街。\n候诊庭院、病历交接廊、门诊长街各遗落了一张号码牌。交给广播庭院的广播台，才能恢复旧档案翼总电源。\n地图 R01–R06 是沿途可进入的小房间。I 打开背包；Q 投掷空瓶；J 回看线索。关门可以遮断视线，柜子可躲藏。整理物品时游戏暂停。';
  levels[0].patrol=levels[0].patrol.map(([x,y])=>({x:x*ds,y:y*ds}));
  let active=levels[0],levelIndex=0,worldObjects=[],navigation=null,collisionVersion=0;
  function loadLevel(index){
    levelIndex=0;active=levels[0];width=DUST2_ANNEX.width;height=Math.max(DUST2_ANNEX.height,DUST2_ROOMS.height);
    cells=Array.from({length:height},(_,y)=>Array.from({length:width},(_,x)=>referenceSolid(x+.5,y+.5)?1:0));
    worldObjects=[];navigation=null;terrain.navigation=null;return active;
  }
  function referenceSolid(x,y){
    if(DUST2_ANNEX.contains(x,y)||DUST2_ROOMS.contains(x,y))return false;
    const row=DUST2_LAYOUT.rows[Math.floor(y/ds)],px=Math.floor(x/ds);
    if(!row||px<0)return true;
    for(let i=0;i<row.length;i+=2)if(px>=row[i]&&px<row[i+1])return false;
    return true;
  }
  const solid=(x,y)=>!Number.isFinite(x)||!Number.isFinite(y)||(levelIndex===0?referenceSolid(x,y):cells[Math.floor(y)]?.[Math.floor(x)]!==0);
  function boundsHit(o,x,y,r=0){
    const dx=x-o.x,dy=y-o.y,a=o.angle||0,side=dx*Math.sin(a)-dy*Math.cos(a),front=dx*Math.cos(a)+dy*Math.sin(a);
    const sx=Math.max(0,Math.abs(side)-(o.width||.5)/2),sy=Math.max(0,Math.abs(front)-(o.depth||.5)/2);
    return sx*sx+sy*sy<r*r || (Math.abs(side)<(o.width||.5)/2&&Math.abs(front)<(o.depth||.5)/2);
  }
  function groundHeight(x,y,hint){return levelIndex===0?terrain.height(x,y,hint):0;}
  const collisionBins=new Map();
  function nearObjects(x,y,r=0){
    const out=new Set();for(let gy=Math.floor((y-r)/4);gy<=Math.floor((y+r)/4);gy++)for(let gx=Math.floor((x-r)/4);gx<=Math.floor((x+r)/4);gx++)for(const o of collisionBins.get(gx+','+gy)||[])out.add(o);return out;
  }
  function indexObjects(){
    collisionBins.clear();for(const o of worldObjects){if(!o.collide)continue;const radius=Math.hypot(o.width,o.depth)/2;
      for(let y=Math.floor((o.y-radius)/4);y<=Math.floor((o.y+radius)/4);y++)for(let x=Math.floor((o.x-radius)/4);x<=Math.floor((o.x+radius)/4);x++){const key=x+','+y;if(!collisionBins.has(key))collisionBins.set(key,[]);collisionBins.get(key).push(o);}}
  }
  function jump(entity){
    const ground=supportHeight(entity.x,entity.y,entity.elevation);
    if(entity.hidden||entity.crouch||ground===null||Math.abs(entity.elevation-ground)>.06||entity.verticalSpeed>0)return false;
    entity.verticalSpeed=5.4;entity.elevation+=.02;return true;
  }
  function supportHeight(x,y,hint,r=.25){
    let support=groundHeight(x,y,hint);
    for(const o of nearObjects(x,y,r+.02)){
      const top=o.baseY+o.bodyHeight;
      if(o.collide&&top<=hint+.46&&boundsHit(o,x,y,r+.015)&&(support===null||top>support))support=top;
    }
    return support;
  }
  function canStand(x,y,r=.25,elevation){return !solid(x-r,y-r)&&!solid(x+r,y-r)&&!solid(x-r,y+r)&&!solid(x+r,y+r)&&!Array.from(nearObjects(x,y,r)).some(o=>o.collide&&(elevation===undefined||elevation+1.7>(o.baseY||0)+.05&&elevation<(o.baseY||0)+o.bodyHeight-.05)&&boundsHit(o,x,y,r));}
  function move(entity,dx,dy,r=.25){
    if(!Number.isFinite(entity.elevation))entity.elevation=groundHeight(entity.x,entity.y)??0;
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.1));
    const attempt=(x,y)=>{
      const ground=supportHeight(x,y,entity.elevation,r);if(ground===null||!canStand(x,y,r,Math.max(ground,entity.elevation)))return;
      entity.x=x;entity.y=y;
      if(!(entity.verticalSpeed>0)&&ground>=entity.elevation-.46){entity.elevation=ground;entity.verticalSpeed=0;}
    };
    for(let i=0;i<steps;i++){attempt(entity.x+dx/steps,entity.y);attempt(entity.x,entity.y+dy/steps);}
  }
  function settle(entity,dt){
    const ground=supportHeight(entity.x,entity.y,entity.elevation);
    if(ground===null)return;
    if(!Number.isFinite(entity.elevation))entity.elevation=ground;
    if(entity.elevation>ground+.01||entity.verticalSpeed>0){entity.verticalSpeed=(entity.verticalSpeed||0)-18*dt;entity.elevation=Math.max(ground,entity.elevation+entity.verticalSpeed*dt);}
    else{entity.elevation=ground;entity.verticalSpeed=0;}
    const head=entity.crouch?1.1:1.7;
    const room=DUST2_ROOMS.at(entity.x,entity.y);
    const ceiling=room?room.base+3.2:levelIndex===0&&DUST2_ANNEX.contains(entity.x,entity.y)?DUST2_ANNEX.base+3.8:levelIndex===0?terrain.surfaces(entity.x,entity.y).filter(s=>s.height-.4>ground+head).reduce((v,s)=>Math.min(v,s.height-.4),Infinity):2.6;
    if(entity.elevation+head>ceiling){entity.elevation=Math.max(ground,ceiling-head);entity.verticalSpeed=Math.min(0,entity.verticalSpeed);}

    if(!Number.isFinite(entity.eyeElevation)||Math.abs(entity.eyeElevation-entity.elevation)>2)entity.eyeElevation=entity.elevation;
    entity.eyeElevation+=(entity.elevation-entity.eyeElevation)*(1-Math.exp(-14*dt));
  }
  function lineOfSight(a,b){
    const ah=(a.elevation??a.baseY??groundHeight(a.x,a.y)??0)+1.25,bh=(b.elevation??b.baseY??groundHeight(b.x,b.y)??0)+1.25;
    const steps=Math.ceil(distance(a,b)*8),obstacles=worldObjects.filter(o=>o!==a&&o!==b&&o.collide);
    for(let i=1;i<steps;i++){const x=a.x+(b.x-a.x)*i/steps,y=a.y+(b.y-a.y)*i/steps;
      const h=ah+(bh-ah)*i/steps;
      if(solid(x,y)||(levelIndex===0&&terrain.surfaces(x,y).some((s,i)=>i===0?h<s.height-.02:h>s.height-.4&&h<s.height))||obstacles.some(o=>h>(o.baseY||0)&&h<(o.baseY||0)+o.bodyHeight&&boundsHit(o,x,y)))return false;}
    return true;
  }
  function interactionPoint(p,o){
    const a=o.angle??Math.PI/2,dx=p.x-o.x,dy=p.y-o.y,side=clamp(dx*Math.sin(a)-dy*Math.cos(a),-(o.width||.5)/2,(o.width||.5)/2),front=clamp(dx*Math.cos(a)+dy*Math.sin(a),-(o.depth||.5)/2,(o.depth||.5)/2);
    return{x:o.x+side*Math.sin(a)+front*Math.cos(a),y:o.y-side*Math.cos(a)+front*Math.sin(a)};
  }
  function interactionDistance(p,o){return distance(p,interactionPoint(p,o));}
  function nearbyInteractions(p,objects=worldObjects){
    if(p.hidden)return[];
    return objects.filter(o=>o.label&&!o.taken&&Math.abs((p.elevation||0)-(o.baseY||0))<2&&distance(p,o)<7&&interactionDistance(p,o)<4.5&&Math.abs(angleDiff(Math.atan2(o.y-p.y,o.x-p.x),p.angle))<1.2&&lineOfSight(p,o))
      .map(o=>({object:o,distance:interactionDistance(p,o),point:interactionPoint(p,o)})).sort((a,b)=>a.distance-b.distance).slice(0,6);
  }
  function findPath(a,b){
    if(!Number.isFinite(b?.x)||!Number.isFinite(b?.y))return[];
    if(levelIndex===0)return terrain.path(a,b,{width,height,solid,canStand});
    const step=levelIndex===0?ds*5:.5,nw=Math.ceil(width/step),nh=Math.ceil(height/step);
    if(!navigation){navigation=new Uint8Array(nw*nh);for(let y=0;y<nh;y++)for(let x=0;x<nw;x++)navigation[y*nw+x]=canStand((x+.5)*step,(y+.5)*step,.22)?1:0;}
    const nearest=p=>{let best=-1,dist=Infinity;const px=Math.floor(p.x/step),py=Math.floor(p.y/step);
      for(let y=Math.max(0,py-4);y<=Math.min(nh-1,py+4);y++)for(let x=Math.max(0,px-4);x<=Math.min(nw-1,px+4);x++){
        const id=y*nw+x,d=Math.hypot((x+.5)*step-p.x,(y+.5)*step-p.y);
        if(navigation[id]&&d<dist&&lineOfSight(p,{x:(x+.5)*step,y:(y+.5)*step})){best=id;dist=d;}}
      return best;};
    const start=nearest(a),end=nearest(b);if(start<0||end<0)return[];
    const queue=[start],from=new Int32Array(nw*nh).fill(-1);from[start]=start;let head=0;
    while(head<queue.length){const id=queue[head++];if(id===end)break;const x=id%nw,y=Math.floor(id/nw);
      for(const[nx,ny]of[[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){const n=ny*nw+nx;if(nx<0||ny<0||nx>=nw||ny>=nh||!navigation[n]||from[n]!==-1)continue;from[n]=id;queue.push(n);}}
    if(from[end]===-1)return[];const path=[];let id=end;while(id!==start){path.push({x:(id%nw+.5)*step,y:(Math.floor(id/nw)+.5)*step});id=from[id];}
    // Include the last clear centre even when start and goal occupy one nav cell.
    if(!path.length)path.push({x:(end%nw+.5)*step,y:(Math.floor(end/nw)+.5)*step});return path.reverse();
  }
  function createObjects(){
    const a=active;
    const objects=a.items.map(([x,y],i)=>({id:'item-'+(i+1),type:'fuse',x,y,order:i,angle:Math.PI/2,width:.48,depth:.48,bodyHeight:.65,collide:true,label:(a.ordered?'转动水位阀 ':'拾取 / 点亮 ')+(i+1)+' · '+a.itemName,height:.6,scale:.42}));
    objects.push({id:'station',type:'generator',x:a.station[0],y:a.station[1],angle:Math.PI/2,width:1.0,depth:.6,bodyHeight:1.45,collide:true,label:a.stationAction,height:1,scale:.8},
      {id:'exit',type:'exit',x:a.exit[0],y:a.exit[1],angle:a.exitAngle,width:1.8,depth:.16,bodyHeight:2.3,collide:true,label:a.exitName,height:1.3,scale:1.5});
    a.lockers.forEach(([x,y,angle],i)=>objects.push({id:'locker-'+i,type:'locker',x,y,angle,width:.9,depth:.65,bodyHeight:2.15,collide:true,label:'躲入储物柜',height:1.1,scale:.67}));
    a.notesPos.forEach(([x,y],i)=>objects.push({id:'note-'+i,type:'note',x,y,angle:Math.PI/2,width:.55,depth:.45,bodyHeight:.8,collide:true,label:'阅读：'+a.notes[i].title,note:i,height:.34,scale:.3}));
    a.props.forEach(([x,y,angle,type],i)=>objects.push({id:'prop-'+i,type,x,y,angle,width:type==='bench'?1.9:1.1,depth:type==='bench'?.65:1.1,bodyHeight:type==='bench'?.85:1,collide:true,height:.6,scale:1.1}));
    if(levelIndex===0){
      for(const detail of DUST2_SCENE.scenery){
        const o={...detail,id:'scene-'+detail.id,x:detail.x*ds,y:detail.y*ds,collide:detail.type!=='pergola',height:1,scale:1};objects.push(o);
        if(o.type==='pergola')for(const x of[-o.width/2,o.width/2])for(const y of[-o.depth/2,o.depth/2])objects.push({id:o.id+'-post-'+x+'-'+y,type:'column',x:o.x+x,y:o.y+y,angle:Math.PI/2,width:.16,depth:.16,bodyHeight:2.9,collide:true});
      }
      for(const detail of DUST2_SCENE.discoveries)objects.push({...detail,id:'memory-'+detail.id,type:'memory',x:detail.x*ds,y:detail.y*ds,angle:Math.PI/2,width:.8,depth:.6,bodyHeight:.95,collide:true,activated:false,height:.8,scale:.5});
      [...DUST2_SCENE.structures,...DUST2_SCENE.doors.map(p=>[...p,'door'])].forEach(([x,y,w,d,h,angle,type],i)=>{
        objects.push({id:'reference-'+i,type,x:x*ds,y:y*ds,width:w*ds,depth:d*ds,bodyHeight:h,angle,collide:type!=='step'});
      });
    }
    for(const o of objects)o.baseY=o.type==='retaining'?4.68:levelIndex===0?terrain.base(o):0;
    worldObjects=objects;indexObjects();
    const names=['录音机 · 收听值班口令','配电箱 · 切换支路电源','档案抽屉 · 输入口令','呼叫铃 · 按铃试音'];
    for(let i=0;i<4;i++){
      const anchor=a.notesPos[i%a.notesPos.length];let point=null;
      for(const [dx,dy] of [[1.6,0],[-1.6,0],[0,1.6],[0,-1.6],[2.5,0],[0,2.5],[-2.5,0]]){const x=anchor[0]+dx,y=anchor[1]+dy;if(canStand(x,y,.65)){point={x,y};break;}}
      if(!point)continue;
      const o={...point,id:'device-'+i,type:'device',kind:i,angle:Math.PI/2,width:.65,depth:.5,bodyHeight:1,collide:true,label:names[i],activated:false,baseY:levelIndex===0?terrain.height(point.x,point.y):0};objects.push(o);indexObjects();
    }
    for(const detail of DUST2_ANNEX.objects)objects.push({angle:Math.PI/2,width:.7,depth:.55,bodyHeight:detail.type==='evidence'?.8:detail.kind==='seal'?.82:1.4,collide:true,activated:false,height:1,scale:.6,...detail,baseY:DUST2_ANNEX.base});
    for(const detail of DUST2_ROOMS.objects)objects.push({collide:true,activated:false,height:1,scale:.7,baseY:terrain.height(detail.x,detail.y)??0,...detail});
    refreshCollision();return objects;
  }
  function refreshCollision(){indexObjects();navigation=null;terrain.navigation=null;collisionVersion++;}
  function area(x,y){const room=DUST2_ROOMS.at(x,y);if(room)return room.name;if(DUST2_ANNEX.contains(x,y)&&x>111.5)return DUST2_ANNEX.area(x,y);if(levelIndex===0&&x>151*ds&&x<302*ds&&y>610*ds&&y<711*ds)return '遗忘花园';return active.zones?.find(([,x1,y1,x2,y2])=>x>=x1&&x<=x2&&y>=y1&&y<=y2)?.[0]||active.name;}
  const storage={get(key,fallback){try{const s=localStorage.getItem('wardzero.'+key);return s===null?fallback:JSON.parse(s);}catch{return fallback;}},set(key,value){try{localStorage.setItem('wardzero.'+key,JSON.stringify(value));}catch{}}};
  const settings={reducedMotion:typeof matchMedia==='function'&&matchMedia('(prefers-reduced-motion: reduce)').matches,shocks:true,grisly:true,volume:55,brightness:110,sensitivity:50,grain:false,...storage.get('settings',{})};
  loadLevel(0);
  return{TAU,clamp,angleDiff,distance,random,interactionPoint,interactionDistance,nearbyInteractions,get width(){return width;},get height(){return height;},get cells(){return cells;},get collisionVersion(){return collisionVersion;},terrain,groundHeight,supportHeight,jump,settle,solid,boundsHit,canStand,move,lineOfSight,findPath,createObjects,refreshCollision,area,storage,settings,levels,loadLevel,get level(){return active;},get levelIndex(){return levelIndex;}};
})();
