"use strict";
// One continuous extension of the courtyard. All coordinates are game metres.
// The 3 m maze passages share one footprint for drawing, physics and navigation.
const DUST2_ANNEX=(()=>{
  const base=4.68,rects=[],maze=[],edges=[],seen=new Set(),stack=[10];
  let seed=217;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const centre=id=>({x:141+(id%5)*6,y:47+Math.floor(id/5)*6});
  const rect=(x1,y1,x2,y2)=>rects.push([x1,y1,x2,y2]);
  seen.add(10);
  while(stack.length){
    const a=stack[stack.length-1],x=a%5,y=Math.floor(a/5);
    const choices=[[-1,0],[1,0],[0,-1],[0,1]].map(([dx,dy])=>[x+dx,y+dy]).filter(([x,y])=>x>=0&&x<5&&y>=0&&y<5).map(([x,y])=>y*5+x).filter(b=>!seen.has(b));
    if(!choices.length){stack.pop();continue;}
    const b=choices[Math.floor(rand()*choices.length)];edges.push([a,b]);seen.add(b);stack.push(b);
  }
  // A single loop permits route choices; the other branches still have dead ends.
  const extra=[[6,7],[11,12],[17,18],[2,7]].find(([a,b])=>!edges.some(e=>e.includes(a)&&e.includes(b)));if(extra)edges.push(extra);
  for(let id=0;id<25;id++){const p=centre(id);rect(p.x-1.5,p.y-1.5,p.x+1.5,p.y+1.5);maze.push(p);}
  for(const[a,b]of edges){const p=centre(a),q=centre(b);rect(Math.min(p.x,q.x)-1.5,Math.min(p.y,q.y)-1.5,Math.max(p.x,q.x)+1.5,Math.max(p.y,q.y)+1.5);}
  rect(108,58,122,62);                    // Level connection, no step or ramp.
  rect(120,51,134,69);                    // Reception / clock lobby.
  rect(124,48,128,53);rect(120,39,133,49);// Electrical maintenance room.
  rect(133,57.5,141,60.5);               // Locked maze entrance.
  rect(163.5,71,166.5,84);               // Maze exit to the records office.
  rect(145,81,168,91);                   // Broadcast / archive reading room.
  rect(145,75,149,83);rect(124,75,148,79);// Return route; opens from office side.
  rect(124,68,128,79);
  // Room identities also drive signs, map labels and material accents.
  const rooms=[
    {id:'staff',name:'值班休息室',code:'01',box:[120,24,134,35],color:[.72,.81,.69]},
    {id:'treatment',name:'诊疗室',code:'02',box:[138,24,151,36],color:[.66,.79,.81]},
    {id:'ward',name:'217 病房',code:'03',box:[155,24,168,36],color:[.82,.75,.66]},
    {id:'atrium',name:'黄灯候诊厅',code:'04',box:[176,43,189,57],color:[.86,.78,.48]},
    {id:'laundry',name:'洗衣房',code:'05',box:[194,45,207,57],color:[.62,.77,.82]},
    {id:'pump',name:'循环泵房',code:'06',box:[185,62,197,71],color:[.64,.72,.69]},
    {id:'storage',name:'器材库',code:'07',box:[184,81,197,92],color:[.79,.70,.56]},
    {id:'observation',name:'观察室',code:'08',box:[200,82,209,92],color:[.69,.72,.83]}
  ];
  for(const room of rooms)rect(...room.box);
  // North clinical wing: a readable hub before the locked archive routes.
  rect(124,34,128,40);rect(126,38,207,42);
  rect(143,35,146,40);rect(159,35,162,40);
  // Two entrances to the yellow wing, both behind the time lock.
  rect(178,40,182,45);rect(165,45.5,178,48.5);
  rect(187,49,196,52);rect(200,40,203,47);
  // A large pursuit loop, with a cross-route through the pump room.
  rect(177,56,181,78);rect(201,56,205,84);rect(177,74,205,78);
  rect(180,64,187,67);rect(195,64,203,67);
  rect(188,77,191,83);rect(167,84,185,87);
  const bounds={x1:Math.floor(Math.min(...rects.map(r=>r[0]))),y1:Math.floor(Math.min(...rects.map(r=>r[1]))),
    x2:Math.ceil(Math.max(...rects.map(r=>r[2]))),y2:Math.ceil(Math.max(...rects.map(r=>r[3])))};
  const mw=(bounds.x2-bounds.x1)*2,mh=(bounds.y2-bounds.y1)*2,mask=new Uint8Array(mw*mh);
  for(const[x1,y1,x2,y2]of rects)for(let y=Math.round((y1-bounds.y1)*2);y<(y2-bounds.y1)*2;y++)for(let x=Math.round((x1-bounds.x1)*2);x<(x2-bounds.x1)*2;x++)mask[y*mw+x]=1;
  const contains=(x,y)=>Number.isFinite(x)&&Number.isFinite(y)&&x>=bounds.x1&&x<bounds.x2&&y>=bounds.y1&&y<bounds.y2&&mask[Math.floor((y-bounds.y1)*2)*mw+Math.floor((x-bounds.x1)*2)]===1;
  const roomAt=(x,y)=>rooms.find(r=>x>=r.box[0]&&x<r.box[2]&&y>=r.box[1]&&y<r.box[3]);
  const degree=id=>edges.filter(e=>e.includes(id)).length;
  const leaves=Array.from({length:25},(_,i)=>i).filter(i=>i!==10&&i!==24&&degree(i)===1);
  const sealCells=[...leaves,...[0,4,20,12]].filter((v,i,a)=>a.indexOf(v)===i).slice(0,3);
  const symbols=['日','雨','月'];
  const objects=[
    {id:'annex-relay',type:'puzzle',kind:'relay',x:126,y:41,label:'检修配电柜 · 调整三路电源',text:'三路供电'},
    {id:'annex-keypad',type:'puzzle',kind:'keypad',x:133,y:56,label:'门禁键盘 · 输入四位值班时间',text:'值班门禁'},
    {id:'annex-receiver',type:'puzzle',kind:'receiver',x:157,y:86,label:'离岗广播 · 排列离岗顺序',text:'离岗广播'},
    {id:'annex-shortcut',type:'puzzle',kind:'shortcut',x:147,y:79.5,label:'拉动门闩 · 打开回庭院捷径',text:'应急门闩'},
    {id:'annex-gate',type:'gate',x:136.5,y:59,width:3,depth:.22,bodyHeight:3,angle:0},
    {id:'annex-return-gate',type:'gate',x:142,y:77,width:4,depth:.22,bodyHeight:3,angle:0},
    {id:'annex-note-maintenance',type:'evidence',x:122,y:46,title:'检修员留下的线路图',text:'A 接门禁，C 接档案室，都要打开。B 接那间拆掉的病房，关上。最后按合闸。\n庭院广播台先装齐三张号码牌，才有总电源。\n\nB 那路别开。房间已经拆了，呼叫铃还会响。\n我去看过。没有床。它还在催我换床单。',label:'阅读检修线路图'},
    {id:'annex-note-clock',type:'evidence',x:122,y:65,title:'永远停在 02:17 的钟',text:'每面钟都停在同一时刻。门禁维修单写着：\n\n“去掉冒号，仍是值班开始的时间。”\n\n广播里却有人说：林秋，你早在 02:17 就离开了。\n你抬头时，钟下又多了一行今天的签到。',label:'查看门禁维修单'},
    {id:'annex-note-order',type:'evidence',x:130,y:65,title:'小满画的一天',text:'三个格子：早上太阳出来，中午下雨，晚上出了月亮。\n背面写着：广播台就按日、雨、月这个顺序放印章。印章在档案回廊的岔路里。\n\n“哥，我只住过一天。护士说我住了好几年。\n她是不是把每天都算成这一天了？我想回家。昨天就想。”',label:'阅读小满的三格画'},
    {id:'annex-note-office',type:'evidence',x:151,y:88,title:'自动续上的交接单',text:'电脑设置：没有接班人，自动沿用上一班签名。\n林秋，到岗。林秋，到岗。林秋，到岗。\n\n最后一页写着：\n“我替你上班，你替我签字。不行吗？我都替你这么久了。\n你的手拿笔就行。名字我会写。”\n\n旁边的操作单：按日、雨、月装入印章后，广播台会结束本班并解锁院区出口。不需要再签交接单。',label:'翻阅异常交接记录'},
    {id:'annex-wait-bench',type:'bench',x:121,y:57,width:3.5,depth:.65,bodyHeight:1.08,angle:0},
    {id:'annex-bench',type:'bench',x:128,y:67,width:2,depth:.65,bodyHeight:1.08,angle:-Math.PI/2},
    {id:'annex-shelf-1',type:'shelf',x:146,y:86,width:3.6,depth:.6,bodyHeight:2.5,angle:0},
    {id:'annex-shelf-2',type:'shelf',x:167,y:86,width:3.6,depth:.6,bodyHeight:2.5,angle:Math.PI},
    {id:'annex-locker',type:'locker',x:132,y:53,width:.9,depth:.65,bodyHeight:2.15,angle:Math.PI,label:'躲入储物柜'}
  ];
  sealCells.forEach((cell,i)=>objects.push({id:'annex-seal-'+i,type:'puzzle',kind:'seal',order:i,symbol:symbols[i],...centre(cell),label:'取走「'+symbols[i]+'」交班印章',text:'交班印章 / '+symbols[i]}));
  objects.push(
    {id:'clinical-gate',type:'gate',lock:'door',x:172,y:40,width:4,depth:.22,bodyHeight:3,angle:0},
    {id:'clinical-keypad',type:'puzzle',kind:'keypad',x:169,y:39,label:'北翼门禁 · 输入四位值班时间',text:'北翼门禁'},
    {id:'service-gate',type:'gate',lock:'service',x:179,y:85.5,width:3,depth:.22,bodyHeight:3,angle:0},
    {id:'service-release',type:'puzzle',kind:'service',x:185.5,y:83,label:'器材库门闩 · 开启广播室捷径',text:'后勤捷径'},
    {id:'laundry-valve',type:'puzzle',kind:'valve',order:0,x:204,y:54,label:'关闭洗衣房回水阀',text:'回水阀 / 1'},
    {id:'pump-valve',type:'puzzle',kind:'valve',order:1,x:194,y:69,label:'关闭泵房泄压阀',text:'泄压阀 / 2'},
    {id:'annex-call',type:'device',kind:3,x:187,y:54,label:'候诊呼叫铃 · 按铃试音'},
    {id:'staff-note',type:'evidence',x:122,y:27,title:'夜班巡查路线',label:'阅读夜班巡查路线',text:'北侧是值班室、诊疗室和 217 病房。北翼门禁和接待厅共用密码。\n黄灯候诊厅和洗衣房有两条路相通。南边绕过泵房，也能回来。蓝色洗衣机是认路标记。\n\n有人在背面写：我绕一圈就下班。\n这句话写了整整一页。最后一行是：我绕到第几圈了？'},
    {id:'ward-note',type:'evidence',x:166,y:27,title:'217 号床的空白病历',label:'阅读 217 号床病历',text:'床头卡写着小满的名字，入院日期却是明天。\n\n她在背面画了三间一模一样的候诊室，只在其中一间画了蓝色的洗衣机。\n“哥哥，记住蓝色的那间。不要一直追着黄色的灯走。”'},
    {id:'pump-note',type:'evidence',x:187,y:69,title:'后勤门泄压说明',label:'阅读后勤门检修单',text:'关闭洗衣房回水阀与泵房泄压阀后，器材库内的手动门闩才能打开。\n\n这是一条通往广播室的近路。开启后永久保留，不会影响印章收集。广播任务仍需三枚印章。'},
    {id:'observation-note',type:'evidence',x:207,y:89,title:'玻璃另一边的值班人',label:'阅读观察记录',text:'02:17：值班人通过候诊厅。\n02:17：值班人通过洗衣房。\n02:17：值班人正在阅读这份记录。\n\n最后一行字迹很新：“如果你能看见这句话，就不要再替我值班。”'}
  );
  const prop=(id,type,x,y,width,depth,bodyHeight,angle=Math.PI/2)=>objects.push({id,type,x,y,width,depth,bodyHeight,angle});
  prop('staff-table','bench',127,29,3,1.2,1.08);
  prop('treatment-bed','bed',145,29,2,3.4,1.05);
  prop('ward-bed-a','bed',158,28,1.8,3.2,1.05);prop('ward-bed-b','bed',164,32,1.8,3.2,1.05);
  prop('atrium-island','shelf',182,50,3,2,2.5);
  prop('laundry-a','washer',197,48,1.5,1.2,1.35);prop('laundry-b','washer',197,54,1.5,1.2,1.35);
  prop('pump-tank','tank',191,66,2,2,2.5);
  prop('storage-rack-a','shelf',186,88,4,.65,2.5,0);prop('storage-rack-b','shelf',195,88,4,.65,2.5,0);
  prop('observation-desk','bench',204,86,2.5,1,1.08);
  for(const[id,x,y,angle]of[['staff',132,26,Math.PI],['treatment',140,26,Math.PI/2],['laundry',205,47,Math.PI],['storage',195,83,Math.PI],['atrium',178,54,0]])
    objects.push({id:id+'-locker',type:'locker',x,y,angle,width:.9,depth:.65,bodyHeight:2.15,label:'躲入储物柜'});
  const signs=[
    {x:115,y:59.8,angle:Math.PI,text:'旧档案翼 →',sub:'02:17 / 请完成总电源授权'},
    {x:126,y:52,angle:Math.PI/2,text:'值班接待厅',sub:'← 配电室   档案回廊 →'},
    {x:126,y:40,angle:Math.PI/2,text:'检修配电室',sub:'A 门禁 / B 空置病房 / C 档案'},
    {x:137,y:59,angle:Math.PI,text:'重复档案回廊',sub:'收集 日 / 雨 / 月 三枚印章'},
    {x:158,y:82,angle:Math.PI/2,text:'离岗广播室',sub:'未完成交接，请勿独自离开'}
  ];
  for(const room of rooms){const[x1,y1,x2]=room.box;signs.push({x:(x1+x2)/2,y:y1+1,angle:Math.PI/2,text:room.code+' / '+room.name,sub:'WARD ZERO / '+room.id.toUpperCase()});}
  signs.push({x:171,y:40,angle:Math.PI,text:'北翼时间门禁',sub:'与接待厅共用密码 / 黄灯候诊厅 →'},
    {x:179,y:73,angle:Math.PI/2,text:'后勤环廊',sub:'泵房 ↗ / 器材库与观察室 →'},
    {x:188,y:84,angle:Math.PI/2,text:'广播室捷径 ←',sub:'先关闭洗衣房、泵房两处水阀'});
  const patrol={lobby:[[126,59],[126,44],[130,40],[144,32],[161,34]],
    archive:[[141,59],[153,47],[165,47],[182,45],[201,50],[203,76],[179,76],[189,65],[190,85]]};
  return{base,rects,bounds,rooms,roomAt,contains,maze,edges,sealCells,symbols,objects,signs,patrol,width:bounds.x2+2,height:114,
    labels:[['接待厅',126,55],['配电室',126,43],['档案迷宫',153,44],['离岗广播室',156,89],['应急回廊',133,77],...rooms.map(r=>[r.code,(r.box[0]+r.box[2])/2,r.box[1]+2.5])],
    area(x,y){const room=roomAt(x,y);if(room)return'旧翼 · '+room.name;if(x<119)return'档案翼连接廊';if(y<43&&x>=134)return'旧翼 · 北翼诊疗走廊';if(x>=176)return'旧翼 · 后勤环廊';if(x>=138&&y<75)return'旧翼 · 重复档案回廊';if(y<50)return'旧翼 · 配电室';if(y>=80)return'旧翼 · 离岗广播室';if(y>=74)return'旧翼 · 应急回廊';return'旧翼 · 值班接待厅';}};
})();
