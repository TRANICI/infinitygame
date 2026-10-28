"use strict";
// Small rooms cut into the perimeter of the original Dust II routes (metres).
const DUST2_ROOMS=(()=>{
  const rooms=[
    {id:'supply',code:'R01',name:'封存杂物间',box:[2,23,8,30],entry:[7,25,12,28],base:4.68,door:[9,26.5,0],color:[.73,.76,.62]},
    {id:'workshop',code:'R02',name:'转运维修间',box:[2,48,9,55],entry:[8,50,13,53],base:5.58,door:[10,51.5,0],color:[.65,.73,.71]},
    {id:'booth',code:'R03',name:'病历保管室',box:[65,33,72,40],entry:[56,35,66,38],base:1.62,door:[63,36.5,0],key:'brass-key',color:[.76,.70,.60]},
    {id:'dispatch',code:'R04',name:'失联通讯室',box:[49,8,57,14],entry:[49,13,51,20],base:2.52,door:[50,15,Math.PI/2],color:[.60,.73,.78]},
    {id:'cafe',code:'R05',name:'夜班茶水间',box:[112,42,119,49],entry:[104,44,113,47],base:4.68,door:[110,45.5,0],color:[.80,.72,.57]},
    {id:'gatehouse',code:'R06',name:'停用门卫室',box:[42,111,50,118],entry:[44,106,47,112],base:7.92,door:[45.5,110,Math.PI/2],color:[.69,.78,.63]}
  ];
  rooms.find(r=>r.id==='cafe').links=[[104,48,116,50.5]];
  const passages=[{id:'decon',name:'消毒连廊',box:[62,60,82,63],entry:[62,60,82,63],base:4.68,color:[.49,.58,.55]}];
  const inBox=(x,y,b)=>x>=b[0]&&x<b[2]&&y>=b[1]&&y<b[3];
  const at=(x,y)=>[...rooms,...passages].find(r=>[r.box,r.entry,...r.links||[]].some(b=>inBox(x,y,b)));
  const objects=[];
  const add=(room,id,kind,x,y,title,description,extra={})=>objects.push({id,type:'interactive',kind,x,y,title,description,label:'查看 · '+title,room:room.id,baseY:room.base,angle:Math.PI/2,width:.8,depth:.55,bodyHeight:1.1,...extra});
  for(const r of rooms){
    const[x,y,angle]=r.door;
    objects.push({id:'room-door-'+r.id,type:'room-door',room:r.id,x,y,angle,width:angle===0?r.entry[3]-r.entry[1]:r.entry[2]-r.entry[0],depth:.18,bodyHeight:2.8,baseY:r.base,key:r.key,label:'打开 · '+r.name});
    const[x1,y1,x2,y2]=r.box;
    objects.push({id:'room-locker-'+r.id,type:'locker',x:x2-1,y:y2-1,angle:Math.PI,width:.9,depth:.65,bodyHeight:2.15,baseY:r.base,label:'躲入 · '+r.name+'储物柜'});
    objects.push({id:'room-seat-'+r.id,type:'bench',x:x1+1,y:y2-1.5,angle:0,width:2,depth:.6,bodyHeight:1.08,baseY:r.base});
  }
  const byId=id=>rooms.find(r=>r.id===id);
  add(byId('gatehouse'),'gatehouse-drawer','search',48,113,'门卫抽屉','抽屉里有两枚旧硬币和一张值班路线卡。硬币可以在门诊长街的夜班茶水间买饮料。',{loot:{coin:2},memo:'封存杂物间有病历保管室钥匙；地下转运道旁的维修间有工具。病历保管室的线材可以修复失联通讯室。路线卡背面写着：听见自己的名字，也不要答应。'});
  add(byId('supply'),'supply-drawer','search',4,25,'杂物柜','钥匙牌写着“病历保管室”。一旁还有两个能发出响声的空瓶。',{loot:{'brass-key':1,bottle:2},memo:'空瓶按 Q 能扔出去。柜门后面写着：别冲着玻璃喊。那头要是也喊，你分不清谁先喊的。'});
  add(byId('workshop'),'workshop-tools','search',4,50,'维修工具箱','一把绝缘螺丝刀，刀柄上刻着通讯室的编号。工具使用后保留。',{loot:{screwdriver:1}});
  add(byId('booth'),'booth-wire','search',69,35,'病历备件抽屉','备用线材仍然完好，能修复失联通讯室的广播线路。值班簿上每一个签名都是你的笔迹。',{loot:{wire:1}});
  add(byId('dispatch'),'dispatch-radio','repair',55,10,'分区广播机','线路脱落。需要一把螺丝刀和一卷线材；修好后可向候诊庭院或门诊长街播放呼叫声。上次试机时，喇叭先念了还没按下去的号码。');
  add(byId('cafe'),'cafe-vendor','vendor',117,44,'旧饮料机','投一枚硬币换一瓶汽水。喝下可立即补满体力，并留下一个能投掷的空瓶。',{bodyHeight:1.8,width:1.1,depth:.7});
  const field=(id,kind,x,y,title,description,extra={})=>objects.push({id,type:'field',kind,x,y,title,description,label:'查看 · '+title,angle:Math.PI/2,width:.8,depth:.6,bodyHeight:1.2,...extra});
  field('shift-safe','code',42,104,'值班工具柜','柜门上三个数字可以转。柜里有撬棍。旁边的分诊牌说了开柜顺序，别瞎试。',{answer:'317',reward:{crowbar:1},hint:'先急诊，再儿童，最后留观。分诊牌上的编号分别是 3、1、7。'});
  field('triage-clue','clue',38,103,'分诊顺序牌','急诊先走，儿童接着走，留观最后走。门牌号：儿童 1，留观 7，急诊 3。\n工具柜也按这个顺序开。\n\n我把顺序写这儿了。别再问门外那个人。他每次都故意说反。');
  field('well-pump','pressure',18,29,'排水泵控制箱','把压力调到 4，再按排水。三个阀门分别加 1、2、3 格压力，开着就加，关了不加。\n排干后能取出备用保险芯。井里有人喊停，别理他，井早封上了。',{reward:{'motor-fuse':1},hint:'需要 4 格。1 加 3 正好，2 那路要关掉。'});
  field('pump-clue','clue',25,32,'泵房检修单','保险芯留在排水泵的干燥盒里。先把压力调到 4。别超过，超过就会自动断。\n保险芯拿去修消毒连廊的大门。螺丝刀在转运维修间。\n\n盒子里不能有人。上次我听见了，可盒子就这么大。');
  field('pharmacy-clue','clue',97,55,'药房交班条','那瓶蓝标签的药要冷藏。每次两片，一天三次。药柜的三个旋钮照这个调。\n\n我没给你开药。如果瓶子上写着你的名字，别喝。柜里的汽水没事，我先喝过了。');
  field('medicine-cabinet','dosage',117,47,'药房补给柜','旋钮分别管保存温度、每次片数、每天次数。正确处方在门诊长街药房旁的交班条上。柜里放的是撤离用的补给。',{reward:{drink:2,bottle:2},hint:'交班条写着：冷藏 / 每次两片 / 每天三次。'});
  field('decon-boards','barricade',67,61.5,'连廊木板封堵','木板从里面钉的。用撬棍能拆掉，会有响声。拆完这段路以后一直能走。',{width:3,depth:.22,bodyHeight:2.9,angle:0,baseY:4.68});
  field('decon-gate','motor',75,61.5,'消毒连廊大门','门机的保险芯烧了。需要备用保险芯和螺丝刀。修好后能直接穿到门诊长街，回程不用绕旧门。',{width:3,depth:.3,bodyHeight:3,angle:0,baseY:4.68});
  field('pharmacy-window','window',110,49.25,'茶水间后窗','窗后通着茶水间。能用螺丝刀慢慢拆，也能用撬棍砸开。拆窗动静小，砸窗动静大。打开后是另一条出路。',{width:2.5,depth:.18,bodyHeight:2.8,angle:0,baseY:4.68});
  field('arrival-route','clue',48,108,'院区撤离便条','先去入口左边的分诊牌和工具柜，拿撬棍。\n再去候诊庭院排水，拿保险芯；地下转运道的维修间有螺丝刀。\n最后拆掉消毒连廊的木板，修大门。这条路能省一大圈。\n\n这张是我写的。要是下一张说别开门，你先看字迹。那张不是我。');
  // Sightline breaks create small investigation pockets, with broad lanes between them.
  for(const[id,x,y,w,a]of[['arrival-a',30,104,4,Math.PI/2],['arrival-b',36,101,3.5,0],['waiting-a',20,24,3.5,Math.PI/2],['waiting-b',29,31,3,0],['clinic-a',96,11,3.5,Math.PI/2],['clinic-b',101,17,3,0],['transfer-a',60,70,2.8,0],['street-a',87,57,3,Math.PI/2]])
    objects.push({id:'screen-'+id,type:'privacy-screen',x,y,width:w,depth:.18,bodyHeight:2.25,angle:a});
  for(const[id,x,y,a]of[['arrival',32,106,0],['waiting',20,32,Math.PI/2],['clinic',99,11,Math.PI/2]])
    objects.push({id:'gurney-'+id,type:'bed',x,y,width:1,depth:2.3,bodyHeight:1.05,angle:a});
  return {rooms,passages,objects,at,contains:(x,y)=>!!at(x,y),inBox,height:120,
    labels:[...rooms.map(r=>[r.code,(r.box[0]+r.box[2])/2,r.box[1]+1.5]),['消毒连廊',72,62]]};
})();
