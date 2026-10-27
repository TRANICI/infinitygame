"use strict";
const WZ=(()=>{
  const TAU=Math.PI*2,clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const angleDiff=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b)),distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  function random(seed){return()=>{seed|=0;seed=seed+0x6d2b79f5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
  let width=41,height=37,cells=[];
  const terrain=new WardTerrain();
  const levels=[
    {
      name:'黄色候诊厅',en:'THE WAITING ROOMS',chapter:'第一章 · 被遗忘的号码',theme:'yellow',
      start:{x:11.5,y:22.5,angle:-Math.PI/2},enemy:{x:3.5,y:12.5},
      itemName:'号码牌',objective:'找齐三张遗落的号码牌',stationName:'叫号机',stationAction:'放入号码牌，呼叫下一层',exitName:'前往静水档案馆',
      intro:'搬迁前的最后一个夜班，你走进了没有尽头的候诊厅。\n墙上的钟停在 02:17。一只白白软软的团子蹦了过来，递给你一张便签：\n“林秋，别急。找回四段记忆，我们就能回家。”',
      reveal:'叫号机没有呼叫病人。它播放了一段童声：\n“哥哥，等你下班，我们一起回家。”\n你想起了一个名字：小满。电梯门后，传来了很轻的水声。',
      collectText:['001：一张属于你的值班号码。','017：小满在候诊椅上画了一只兔子。','217：那天，你答应带她一起回家。'],
      items:[[4.5,4.5],[16.5,17.5],[22.5,11.5]],station:[22.5,4.5],exit:[23.5,2.7],
      lockers:[[3.5,20.5],[16.5,5.5]],notesPos:[[11.5,20.5],[4.5,6.5],[21.5,5.5]],
      notes:[
        {title:'团子的第一张便签',text:'你好呀，我是团子！\n\n这里不是坏地方，只是走廊忘记了通向哪里。\n找齐三张号码牌，放进东北角的叫号机。\n地图会用金色标出它们。按 TAB，也可以点击右上角的地图按钮。\n\n我有时会追上来找你击掌。被我追上也不会丢东西。'},
        {title:'候诊椅背后的涂鸦',text:'一个大人，一个小女孩，还有一只长耳朵玩偶。\n\n纸上写着：“哥哥下班的时候，我会在门口等。”\n落款：小满，七岁。'},
        {title:'迁馆备忘',text:'旧院区的物件已经搬走。\n但有些记忆还留在号码牌上。\n\n这里的每一道门，都通向同一天的另一个片段。'}
      ],labels:[['候诊区',4.5,3.1],['重复走廊',10,11],['叫号机',22,3.3]],
      patrol:[[3.5,12.5],[4.5,4.5],[10.5,6.5],[16.5,17.5],[22.5,11.5],[11.5,22.5]]
    },
    {
      name:'静水档案馆',en:'THE STILLWATER ARCHIVE',chapter:'第二章 · 雨天的声音',theme:'pool',
      start:{x:13.5,y:22.5,angle:-Math.PI/2},enemy:{x:22.5,y:3.5},
      itemName:'水位阀',objective:'依次打开 ① → ② → ③ 水位阀',stationName:'排水控制台',stationAction:'启动排水，打开展厅门',exitName:'前往云朵游乐室',ordered:true,
      intro:'电梯外是一座铺满浅蓝瓷砖的室内水厅。\n天光从高处落下来，水面安静得像一面镜子。\n三只水位阀，分别刻着 ①、②、③。团子举起小牌子：“按顺序哦！”',
      reveal:'水声退去后，你听见了那天下午的雨。\n你把唯一的雨伞留给了小满，自己留在值班室。\n她没有走远，只是把一张回程车票夹进了你的记录本。',
      collectText:['① 已打开。雨落在院子的梧桐树上。','② 已打开。你把雨伞塞进了小满手里。','③ 已打开。她说：“那我再等你一小会儿。”'],
      items:[[4.5,5.5],[22.5,12.5],[4.5,20.5]],station:[13.5,4.5],exit:[13.5,2.7],
      lockers:[[22.5,20.5],[3.5,12.5]],notesPos:[[12.5,20.5],[4.5,7.5],[14.5,4.5]],
      notes:[
        {title:'水厅维护卡',text:'水位校准：① → ② → ③。\n\n按地图上的数字顺序转动阀门，再到北侧控制台排水。\n如果顺序弄错，阀门会自动复位，重新来一次就好。\n浅水区域可以直接行走，不会淹没或跌落。'},
        {title:'夹在档案里的车票',text:'1997 年 11 月 9 日。\n北站 → 归家路。\n两张票，连在一起。\n\n背面是一行歪歪扭扭的字：“这次要一起走。”'},
        {title:'团子的第二张便签',text:'有些回忆听起来像雨。\n但别担心，雨总会停。\n\n你记得回家的方向了吗？'}
      ],labels:[['水厅 ①',4.5,4],['中央天井',13.5,12],['水厅 ②',22,11],['水厅 ③',5,19],['排水台',13.5,3.3]],
      patrol:[[22.5,3.5],[13.5,12.5],[22.5,20.5],[4.5,20.5],[4.5,5.5]]
    },
    {
      name:'云朵游乐室',en:'THE CLOUD PLAYROOM',chapter:'第三章 · 约定的形状',theme:'play',
      start:{x:13.5,y:22.5,angle:-Math.PI/2},enemy:{x:13.5,y:4.5},
      itemName:'记忆照片',objective:'找回三张童年照片',stationName:'回忆放映机',stationAction:'放映照片，拼回约定',exitName:'前往归家月台',
      intro:'浅粉色的墙上画着云朵，地毯还保留着玩具的轮廓。\n这是小满曾经等你下班的地方。\n团子坐在一张旧照片旁边，和照片里的毛绒兔子长得一模一样。',
      reveal:'三张照片拼成了完整的一天：\n小满没有失踪，也没有被遗忘在医院。\n你们只是长大了，忙碌让你忘了那个“每次都一起回家”的约定。\n团子一直替她保管着它。',
      collectText:['第一张：你把毛绒兔子送给了小满。','第二张：她给玩偶取名叫“团子”。','第三张：车站前，你们约好每次都一起回家。'],
      items:[[5.5,4.5],[22.5,13.5],[5.5,21.5]],station:[22.5,21.5],exit:[24.3,21.5],
      lockers:[[4.5,13.5],[21.5,4.5]],notesPos:[[12.5,20.5],[6.5,5.5],[21.5,20.5]],
      notes:[
        {title:'游乐室的小任务',text:'三张照片散在积木区、云朵角和南侧休息区。\n\n找齐后，去东南角的放映机播放。\n团子会在房间里散步，想找你玩一会儿。它只是一个毛绒伙伴。\n你也可以躲进柜子，和它玩捉迷藏。'},
        {title:'照片背面',text:'“团子负责记住约定。\n如果哥哥哪天忘记回家，\n就让它来找你。”\n\n——小满'},
        {title:'一张新的留言',text:'哥，明早我在北站等你。\n搬迁结束了，就别再加班。\n\n这次换我来接你。\n小满'}
      ],labels:[['积木区',5.5,3.3],['云朵角',22,12],['休息区',5.5,20],['放映机',22,20]],
      patrol:[[13.5,4.5],[5.5,4.5],[13.5,12.5],[22.5,13.5],[13.5,21.5],[5.5,21.5]]
    },
    {
      name:'归家月台',en:'THE PLATFORM HOME',chapter:'终章 · 一起回家',theme:'station',
      start:{x:13.5,y:22.5,angle:-Math.PI/2},enemy:{x:5.5,y:4.5},
      itemName:'归途路标',objective:'点亮「名字」「约定」「方向」三盏路标',stationName:'月台广播',stationAction:'播报目的地：归家路',exitName:'和团子一起回家',
      intro:'最后一道门通向一座天光明亮的月台。\n广播没有报站，时钟仍停在 02:17。\n你终于明白，这座迷宫不是困住你的地方，而是被搁置的回忆。\n点亮路标，把回家的方向告诉它。',
      reveal:'“林秋，前往归家路的列车即将发车。”\n时钟开始转动。团子把最后一张便签交给你：\n“谢谢你还记得。小满在出口等你。”',
      collectText:['名字：你是林秋，今天已经下班。','约定：有人在等你，一起回家。','方向：从有阳光的那扇门出去。'],
      items:[[5.5,5.5],[21.5,12.5],[6.5,21.5]],station:[13.5,5.5],exit:[13.5,3.4],
      lockers:[[4.5,14.5],[22.5,21.5]],notesPos:[[12.5,20.5],[20.5,11.5],[14.5,6.5]],
      notes:[
        {title:'月台引导',text:'点亮三盏路标，再到北侧广播台播报目的地。\n\n你不需要丢下任何东西。\n团子会陪你走到出口。\n\n慢慢走，这一次没有末班车会把你落下。'},
        {title:'失物招领',text:'招领物品：长耳朵毛绒兔子一只。\n名字：团子。\n保管人：小满。\n\n备注：已经找到主人。'},
        {title:'最后一张便签',text:'家不是某一层楼，也不是某一扇门。\n\n是有人知道你的名字，\n也知道你会回来。\n\n今天，辛苦了。'}
      ],labels:[['名字',5.5,4],['约定',21.5,11],['方向',6.5,20],['广播台',13.5,5],['出口',13.5,2.7]],
      patrol:[[5.5,4.5],[13.5,12.5],[21.5,12.5],[21.5,21.5],[6.5,21.5]]
    }
  ];
  // Reference coordinates are shared by the 3D scene, map and collision system.
  const ds=DUST2_LAYOUT.scale,point=([x,y])=>({x:x*ds,y:y*ds});
  Object.assign(levels[0],{
    name:'记忆庭院 · Dust II',en:'DUST II / MEMORY COURTYARD',
    start:{...point(DUST2_SCENE.start),angle:-Math.PI/2},enemy:point(DUST2_SCENE.enemy),
    items:DUST2_SCENE.items.map(p=>p.map(v=>v*ds)),station:DUST2_SCENE.station.map(v=>v*ds),
    exit:DUST2_SCENE.exit.map(v=>v*ds),exitAngle:DUST2_SCENE.exitAngle,
    lockers:DUST2_SCENE.lockers.map(([x,y,a])=>[x*ds,y*ds,a]),
    notesPos:DUST2_SCENE.notes.map(p=>p.map(v=>v*ds)),
    labels:DUST2_SCENE.labels.map(([name,x,y])=>[name,x*ds,y*ds]),
    patrol:DUST2_SCENE.patrol,props:[],reference:DUST2_LAYOUT,
    intro:'这座庭院和你记忆里的 Dust II 一样：南侧出发，左边是 B 洞，右边是 A 大道。\n阳光把墙壁照成温暖的浅黄色。团子在 B 区附近等你。\n找回 B 区、中路和 A 大道的三张号码牌，再去 A 区叫号机，打开下一段记忆。',
    zones:DUST2_SCENE.labels.map(([name,x,y])=>[name,(x-45)*ds,(y-45)*ds,(x+45)*ds,(y+45)*ds])
  });
  levels[0].notes[0].text='你好呀，我是团子！\n\n从 T 出生点出发：左边经过斜坡与上下层隧道到 B 区，中路穿过中门到 CT，右侧长门通往 A 大道。A 小道和中路也能绕到 A 区。\nB 区、中路、A 大道各有一张号码牌；找齐后去 A 区叫号机。按 TAB 可以查看完整平面图。\n柜子朝外的一面可以进入。进去后可以转头，按 E 出来。';
  Object.assign(levels[1],{
    start:{x:20.5,y:33.5,angle:-Math.PI/2},enemy:{x:34.5,y:6.5},
    items:[[6.5,6.5],[34.5,15.5],[12.5,24.5]],station:[20.5,5.5],exit:[20.5,3.12],exitAngle:Math.PI/2,
    lockers:[[7.5,28.5,0],[35.5,28.5,Math.PI]],notesPos:[[18.5,32],[14.5,12.5],[27.5,24.5]],
    labels:[['入口',20,35],['西水廊 / ①',6,4.5],['东水廊 / ②',34,14],['静水展厅',20,19],['雨声档案 / ③',12.5,23],['倒影室',27.5,12],['排水控制台',20.5,4.3]],
    patrol:[[34.5,6.5],[34.5,28.5],[20.5,19.5],[6.5,28.5],[6.5,6.5],[20.5,6.5]],
    props:[[13,15.8,Math.PI/2,'bench'],[27,15.8,Math.PI/2,'bench'],[14,19.5,0,'crate'],[26,19.5,0,'crate'],[18,30.5,Math.PI/2,'bench']]
  });
  Object.assign(levels[2],{
    start:{x:20.5,y:32.5,angle:-Math.PI/2},enemy:{x:20.5,y:5.5},
    items:[[5.5,5.5],[34.5,5.5],[6.5,31.5]],station:[34.5,31.5],exit:[37.88,31.5],exitAngle:Math.PI,
    lockers:[[12.5,11.5,Math.PI],[36.5,12.5,Math.PI],[12.5,30.5,Math.PI]],
    notesPos:[[18.5,31.5],[8.5,11.5],[30.5,28.5]],
    labels:[['积木书房',7,4],['彩虹画室',33,4],['环形云朵厅',20,15.8],['西侧回廊',5.5,19],['东侧回廊',34.5,19],['休息室',7,28],['放映室',33,28],['入口',20.5,34]],
    patrol:[[20.5,5.5],[6.5,5.5],[5.5,19.5],[6.5,31.5],[20.5,21.5],[33.5,31.5],[34.5,5.5]],
    props:[[10,5.5,0,'bench'],[31.5,10.5,Math.PI/2,'bench'],[15.5,20.5,0,'bench'],[25.5,20.5,0,'bench'],[9.5,28.5,0,'crate'],[31,33.5,Math.PI/2,'bench']]
  });
  Object.assign(levels[3],{
    start:{x:20.5,y:32.5,angle:-Math.PI/2},enemy:{x:7.5,y:10.5},
    items:[[6.5,6.5],[34.5,19.5],[12.5,23.5]],station:[20.5,6.5],exit:[20.5,3.12],exitAngle:Math.PI/2,
    lockers:[[27.5,32.5,Math.PI],[14.5,12.5,Math.PI]],notesPos:[[18,31],[28,12.5],[19,10.5]],
    labels:[['南侧候车厅',20,34.7],['西月台 / 名字',6.5,5],['东月台 / 约定',34.5,18],['失物招领 / 方向',12.5,22],['行李室',27.5,11],['中部过街通道',20.5,18],['归家广播',20.5,5],['北侧出口',20.5,2.3]],
    patrol:[[6.5,6.5],[6.5,28.5],[20.5,28.5],[34.5,28.5],[34.5,6.5],[20.5,18.5]],
    props:[[18,33.5,Math.PI/2,'bench'],[25,33.5,Math.PI/2,'bench'],[5.5,12.5,0,'bench'],[35.5,12.5,Math.PI,'bench'],[27.5,13.5,0,'crate'],[20.5,24.5,Math.PI/2,'bench']]
  });
  levels.forEach((level,i)=>{level.patrol=level.patrol.map(([x,y])=>({x:x*(i===0?ds:1),y:y*(i===0?ds:1)}));});
  let active=levels[0],levelIndex=0,worldObjects=[],navigation=null;
  function box(x1,y1,x2,y2,value=0){for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++)cells[y][x]=value;}
  function loadLevel(index){
    levelIndex=clamp(Math.floor(index)||0,0,levels.length-1);active=levels[levelIndex];width=levelIndex===0?Math.ceil(DUST2_LAYOUT.sourceSize[0]*ds):41;height=levelIndex===0?Math.ceil(DUST2_LAYOUT.sourceSize[1]*ds):37;cells=Array.from({length:height},()=>Array(width).fill(1));worldObjects=[];navigation=null;terrain.navigation=null;
    if(levelIndex===0){
      for(let y=0;y<height;y++)for(let x=0;x<width;x++)cells[y][x]=referenceSolid(x+.5,y+.5)?1:0;
      return active;
    }
    const rooms=levelIndex===0?[
      [16,30,26,34],[10,27,18,31],[7,20,12,27],[4,12,9,21],[6,9,8,13],[3,3,12,10],
      [11,5,19,7],[11,10,18,12],[17,3,24,7],[18,7,22,29],[12,21,19,23],
      [22,17,26,19],[24,11,27,17],[26,9,30,12],[27,3,37,9],[24,5,28,7],
      [24,29,34,32],[31,25,35,30],[33,10,37,25],[32,7,37,11]
    ]:levelIndex===1?[
      [17,30,23,34],[18,3,22,32],[5,5,35,8],[4,8,8,30],[32,8,36,30],[5,28,35,31],
      [10,10,16,17],[24,10,30,17],[10,21,16,27],[24,21,30,27],[12,18,28,20],
      [8,13,18,14],[22,13,32,14],[8,24,18,25],[22,24,32,25]
    ]:levelIndex===2?[
      [18,29,23,34],[18,5,23,31],[12,15,29,23],[3,3,13,13],[27,3,37,13],
      [3,25,13,34],[27,25,37,34],[12,5,28,7],[4,13,7,26],[33,13,36,26],
      [7,18,13,20],[28,18,34,20],[12,28,28,30]
    ]:[
      [12,27,28,34],[4,4,9,29],[31,4,36,29],[17,3,23,30],[8,5,32,8],[8,17,32,20],[8,27,32,29],
      [10,10,15,14],[24,10,30,14],[8,11,18,12],[22,11,32,12],[10,21,15,25],[24,21,29,25],[8,23,18,24],[22,23,32,24]
    ];
    rooms.forEach(r=>box(...r));
    if(levelIndex===0){box(5,5,6,6,1);box(18,12,18,13,1);box(22,12,22,13,1);box(33,25,33,25,1);box(36,25,37,25,1);}
    if(levelIndex===1){box(12,11,12,12,1);box(28,15,28,16,1);box(28,24,28,25,1);}
    if(levelIndex===2){box(19,17,22,20,1);box(8,7,9,8,1);box(31,6,32,7,1);}
    if(levelIndex===3){box(19,14,20,15,1);box(20,21,21,22,1);}
    return active;
  }
  function referenceSolid(x,y){
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
  function canStand(x,y,r=.25,elevation){return !solid(x-r,y-r)&&!solid(x+r,y-r)&&!solid(x-r,y+r)&&!solid(x+r,y+r)&&!worldObjects.some(o=>o.collide&&(elevation===undefined||elevation+1.7>(o.baseY||0)+.05&&elevation<(o.baseY||0)+o.bodyHeight-.05)&&boundsHit(o,x,y,r));}
  function move(entity,dx,dy,r=.25){
    if(!Number.isFinite(entity.elevation))entity.elevation=groundHeight(entity.x,entity.y)??0;
    const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.1));
    const attempt=(x,y)=>{
      const ground=groundHeight(x,y,entity.elevation);if(ground===null||!canStand(x,y,r,entity.elevation))return;
      entity.x=x;entity.y=y;
      if(ground>=entity.elevation-.46){entity.elevation=ground;entity.verticalSpeed=0;}
    };
    for(let i=0;i<steps;i++){attempt(entity.x+dx/steps,entity.y);attempt(entity.x,entity.y+dy/steps);}
  }
  function settle(entity,dt){
    const ground=groundHeight(entity.x,entity.y,entity.elevation);
    if(ground===null)return;
    if(!Number.isFinite(entity.elevation))entity.elevation=ground;
    if(entity.elevation>ground+.01){entity.verticalSpeed=(entity.verticalSpeed||0)-18*dt;entity.elevation=Math.max(ground,entity.elevation+entity.verticalSpeed*dt);}
    else{entity.elevation=ground;entity.verticalSpeed=0;}
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
    a.lockers.forEach(([x,y,angle],i)=>objects.push({id:'locker-'+i,type:'locker',x,y,angle,width:.9,depth:.65,bodyHeight:2.15,collide:true,label:'和团子玩捉迷藏',height:1.1,scale:.67}));
    a.notesPos.forEach(([x,y],i)=>objects.push({id:'note-'+i,type:'note',x,y,angle:Math.PI/2,width:.55,depth:.45,bodyHeight:.8,collide:true,label:'阅读：'+a.notes[i].title,note:i,height:.34,scale:.3}));
    a.props.forEach(([x,y,angle,type],i)=>objects.push({id:'prop-'+i,type,x,y,angle,width:type==='bench'?1.9:1.1,depth:type==='bench'?.65:1.1,bodyHeight:type==='bench'?.85:1,collide:true,height:.6,scale:1.1}));
    if(levelIndex===0){
      [...DUST2_SCENE.structures,...DUST2_SCENE.doors.map(p=>[...p,'door'])].forEach(([x,y,w,d,h,angle,type],i)=>{
        objects.push({id:'reference-'+i,type,x:x*ds,y:y*ds,width:w*ds,depth:d*ds,bodyHeight:h,angle,collide:type!=='step'});
      });
    }
    for(const o of objects)o.baseY=levelIndex===0?terrain.base(o):0;
    worldObjects=objects;navigation=null;terrain.navigation=null;return objects;
  }
  function area(x,y){return active.zones?.find(([,x1,y1,x2,y2])=>x>=x1&&x<=x2&&y>=y1&&y<=y2)?.[0]||active.name;}
  const storage={get(key,fallback){try{const s=localStorage.getItem('wardzero.'+key);return s===null?fallback:JSON.parse(s);}catch{return fallback;}},set(key,value){try{localStorage.setItem('wardzero.'+key,JSON.stringify(value));}catch{}}};
  const settings={volume:35,brightness:110,sensitivity:50,grain:false,...storage.get('settings',{})};
  loadLevel(0);
  return{TAU,clamp,angleDiff,distance,random,get width(){return width;},get height(){return height;},get cells(){return cells;},terrain,groundHeight,settle,solid,boundsHit,canStand,move,lineOfSight,findPath,createObjects,area,storage,settings,levels,loadLevel,get level(){return active;},get levelIndex(){return levelIndex;}};
})();
