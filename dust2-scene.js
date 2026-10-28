"use strict";
// Pixel coordinates use the user's reference directly; north remains up.
// The screenshot specifies the footprint. Heights below are playtest estimates.
const DUST2_SCENE = {
  start:[351,740], enemy:[469,722], station:[677,136], exit:[713,38], exitAngle:Math.PI/2,
  items:[[198,119],[399,394],[735,295]],
  lockers:[[316,764,-Math.PI/2],[99,203,0],[778,414,Math.PI]],
  notes:[[325,751],[166,362],[632,120]],
  patrol:[[190,188],[117,350],[174,492],[345,738],[469,722],[470,522],[408,393],[403,200],[534,183],[654,190],[738,290],[707,414],[589,521]],
  labels:[['值班入口',350,744],['遗忘花园',217,665],['苔阶',121,660],['旧转运道',174,538],['地下转运道',163,376],['候诊庭院',195,123],['隔离门',238,198],['救护庭院',521,175],['交接双门',398,295],['病历交接廊',402,419],['值班后巷',467,524],['高架连廊',534,310],['广播庭院',679,154],['门诊长街',743,326],['门诊旧门',588,529],['下沉卸货场',730,520]],
  // Optional memories reward exploring the garden, radio corner and street café.
  discoveries:[
    {id:'garden',x:248,y:656,kind:'watering',label:'翻看花盆下的交接单',title:'交接单 · 后花园',text:'纸压在空花盆下面，底下已经长霉了。\n\n“我昨晚下班了。钥匙放门卫那儿了。要是还有人看见我，别叫我回去。\n我真下班了。你们不能天天这样。”\n\n签名：林秋。你不记得写过。'},
    {id:'radio',x:459,y:204,kind:'radio',label:'播放广播台的录音',title:'交接单 · 广播台',text:'录音里是你自己的声音。\n\n“林秋到岗。林秋离岗。林秋到岗。\n等会儿，别放了，我还没走出去。谁又把开头按了一遍？”\n\n录音日期是今天。可你刚到。'},
    {id:'cafe',x:671,y:438,kind:'stamp',label:'查看药房的签收单',title:'交接单 · 停业药房',text:'签收单上有小满的名字，签收人是你。\n\n背面写着：“哥，电话里那句话是以前录的。我早就回家了。\n别替里面那个签字。让它自己值班去。\n要是它说它也是你，你就问它我叫什么。别先告诉它。”'}
  ],
  // World-space metres for furniture sizes; x/y remain reference-image pixels.
  scenery:[
    {id:'garden-shade',type:'pergola',x:217,y:665,width:7.6,depth:4.8,bodyHeight:2.9,angle:Math.PI/2},
    {id:'garden-bench',type:'bench',x:216,y:673,width:2.2,depth:.65,bodyHeight:1.08,angle:-Math.PI/2},
    {id:'garden-planter-west',type:'planter',x:169,y:660,width:1.3,depth:2.3,bodyHeight:.65,angle:Math.PI/2},
    {id:'garden-tree',type:'tree',x:269,y:650,width:1.3,depth:1.3,bodyHeight:.65,angle:0},
    {id:'garden-planter-east',type:'planter',x:278,y:704,width:2.4,depth:1,bodyHeight:.65,angle:Math.PI/2},
    {id:'garden-board',type:'board',x:195,y:705,width:2,depth:.25,bodyHeight:2.1,angle:Math.PI/2,text:'封院后第 217 天',sub:'每天都有人浇水',kind:'inspect',label:'调查 · 花园封院告示',title:'没有落款的封院告示',description:'告示说院区已停用 217 天。花坛的泥却还是湿的。浇水记录里，每一天都签着“林秋”，包括明天。'},
    {id:'b-well',type:'well',x:154,y:213,width:2,depth:2,bodyHeight:.9,angle:Math.PI/2,kind:'inspect',label:'调查 · 封死的井口',title:'井里的候诊号',description:'井盖已经焊死。缝隙里却夹着一张刚打印的候诊号：你的名字，明天的日期。井壁传来的三声敲击，与你方才的脚步间隔完全相同。'},
    {id:'b-planter',type:'planter',x:92,y:119,width:.8,depth:2.6,bodyHeight:.6,angle:Math.PI/2},
    {id:'b-bench',type:'bench',x:211,y:160,width:2.3,depth:.65,bodyHeight:1.08,angle:Math.PI},
    {id:'radio-bench',type:'bench',x:449,y:214,width:2,depth:.65,bodyHeight:1.08,angle:-Math.PI/2},
    {id:'cafe-counter',type:'stall',x:658,y:409,width:4.2,depth:1.5,bodyHeight:1,angle:Math.PI/2},
    {id:'cafe-table',type:'table',x:638,y:433,width:1.15,depth:1.15,bodyHeight:.78,angle:Math.PI/2},
    {id:'cafe-chair-one',type:'chair',x:628,y:433,width:.6,depth:.6,bodyHeight:1,angle:0},
    {id:'cafe-chair-two',type:'chair',x:648,y:433,width:.6,depth:.6,bodyHeight:1,angle:Math.PI},
    {id:'cafe-tree',type:'tree',x:780,y:385,width:1.3,depth:1.3,bodyHeight:.65,angle:0},
    {id:'cafe-board',type:'board',x:680,y:395,width:1.7,depth:.2,bodyHeight:2,angle:Math.PI/2,text:'停药窗口 / 请勿敲窗',sub:'处方人：林秋 / 02:17',kind:'inspect',label:'调查 · 药房停药单',title:'重复开出的处方',description:'窗口里的处方并没有药名，只有一句话：“请在听见第二次呼叫前离开。”纸张背面是六间附属房间的编号 R01–R06。'},
    {id:'spawn-directory',type:'board',x:378,y:752,width:2.5,depth:.25,bodyHeight:2.1,angle:Math.PI/2,text:'← 地下转运道 / 门诊长街 →',sub:'禁止代签 · 门卫室在身后'},
    {id:'tunnel-bench',type:'bench',x:111,y:550,width:2.2,depth:.65,bodyHeight:1.08,angle:0},
    {id:'a-planter',type:'planter',x:747,y:64,width:1.4,depth:2.4,bodyHeight:.65,angle:Math.PI/2},
    {id:'a-bench',type:'bench',x:685,y:53,width:2.4,depth:.65,bodyHeight:1.08,angle:Math.PI/2}
  ],
  // x, y, width, depth, height, heading (local z/front), appearance.
  // Narrow permanent walls visible in the reference, separate from the voids.
  structures:[
    [235,147,3,59,2.6,Math.PI/2,'wall'],
    [429,385,5,137,2.6,Math.PI/2,'wall'],
    [700,128,5,88,2.6,Math.PI/2,'wall'],
    [697,502,4,102,1.5,Math.PI/2,'wall'],
    [151,658,5,94,4.32,Math.PI/2,'retaining'],
    [383,704,169,5,1.4,Math.PI/2,'wall'],
    [168,495,134,5,.035,Math.PI/2,'step'],
    [760,495,5,85,1.4,Math.PI/2,'wall'],
    [585,158,41,6,1.3,Math.PI/2,'wall'],
    // Cover blocks, vehicles and crates at their reference positions.
    [123,32,12,13,1.1,Math.PI/2,'crate'],[119,44,17,6,.6,Math.PI/2,'crate'],
    [102,76,10,11,.7,Math.PI/2,'crate'],[101,145,19,9,.65,Math.PI/2,'crate'],
    [146,162,18,18,1.1,Math.PI/2,'crate'],[188,95,12,13,.85,2.05,'crate'],
    [228,109,23,14,1,Math.PI/2,'crate'],[270,111,8,23,1.1,Math.PI/2,'crate'],
    [264,175,12,12,.75,Math.PI/2,'crate'],[276,215,10,12,.7,Math.PI/2,'crate'],
    [266,213,9,10,.6,Math.PI/2,'crate'],[389,138,47,19,1.3,1.68,'crate'],
    [440,185,15,14,.8,1.4,'crate'],[476,174,20,21,1.2,2.35,'crate'],
    [453,226,12,12,.8,Math.PI/2,'crate'],[186,254,33,15,.9,1.05,'crate'],
    [185,282,13,13,.7,2.3,'crate'],[145,261,14,13,.7,Math.PI/2,'crate'],
    [91,347,24,21,1.1,Math.PI/2,'crate'],[147,360,10,13,.6,2.1,'crate'],
    [244,366,14,15,1.1,1.7,'crate'],[230,367,9,12,.8,1.6,'crate'],
    [261,321,14,12,.8,1.65,'crate'],[276,321,11,13,.8,1.65,'crate'],
    [324,347,12,12,.8,Math.PI/2,'crate'],[417,333,16,18,1,Math.PI/2,'crate'],
    [555,229,14,14,.9,Math.PI/2,'crate'],[557,341,13,14,.8,Math.PI/2,'crate'],
    [584,95,14,13,1,Math.PI/2,'crate'],[600,95,7,13,.8,Math.PI/2,'crate'],
    [578,167,15,18,.9,Math.PI/2,'crate'],[600,162,12,12,.8,Math.PI/2,'crate'],
    [661,137,13,18,1.2,1.8,'crate'],[688,152,11,38,1.25,Math.PI/2,'crate'],
    [775,224,16,35,1.1,1.28,'crate'],[617,382,32,23,1.1,Math.PI/2,'crate'],
    [641,378,12,12,.9,Math.PI/2,'crate'],[602,470,18,17,1.1,Math.PI/2,'crate'],
    [365,468,15,13,.8,Math.PI/2,'crate'],[388,611,10,23,.8,1.7,'crate'],
    [499,602,12,27,.8,1.4,'crate'],[590,600,16,36,1.1,1.25,'crate'],
    [605,658,13,12,.7,Math.PI/2,'crate'],[215,601,10,20,.8,Math.PI/2,'crate'],
    [223,584,11,14,.8,2.3,'crate'],[166,621,27,18,1.1,Math.PI/2,'crate'],
    [162,639,10,13,.7,Math.PI/2,'crate'],[292,690,15,53,1.1,Math.PI/2,'crate'],
    [123,751,31,15,.8,Math.PI/2,'crate']
  ],
  // Open double-door leaves at the visible doorways; never camera-facing sprites.
  doors:[[384,298,18,4,2.3,2.02],[408,296,18,4,2.3,2.02],
         [568,539,17,4,2.3,1.1],[598,535,17,4,2.3,1.1],
         [236,204,18,4,2.3,.4]],
  // Regional floor colours follow the reference without its annotation overlays.
  green:[[[88,20],[135,20],[135,70],[199,70],[231,89],[231,149],[87,150]],
         [[104,268],[128,268],[128,336],[175,336],[175,358],[252,358],[252,354],[287,354],[287,385],[267,405],[188,407],[188,464],[222,464],[237,495],[101,495],[101,479],[126,479],[126,464],[160,464],[160,418],[77,407],[77,335],[103,335]],
         [[515,89],[653,89],[653,35],[760,35],[765,176],[565,176],[565,273],[517,273]],
         [[71,705],[101,676],[151,612],[220,612],[233,635],[265,635],[265,618],[301,618],[301,710],[415,710],[415,768],[412,784],[71,779]],
         [[762,454],[794,454],[794,538],[762,538]]]
};
