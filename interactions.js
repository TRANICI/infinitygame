"use strict";
const WARD_ITEMS={
  crowbar:{name:'撬棍',text:'能拆木板，也能砸后窗。动静大，使用后保留。'},
  'motor-fuse':{name:'备用保险芯',text:'排水泵干燥盒里的备件，用来修消毒连廊大门。'},
  'brass-key':{name:'黄铜钥匙',text:'封存杂物间找到的钥匙，用于病历保管室。开锁后保留。'},
  screwdriver:{name:'绝缘螺丝刀',text:'修广播、换大门保险芯、拆后窗都用得上。使用后保留。'},
  wire:{name:'备用线材',text:'修复广播机需要一卷线材和一把螺丝刀。线材会被消耗。'},
  coin:{name:'旧硬币',text:'夜班茶水间的饮料机仍接受这种硬币。'},
  drink:{name:'瓶装汽水',text:'使用后补满体力，并得到一个空瓶。'},
  bottle:{name:'空瓶',text:'行走时按 Q 向前投掷，落地后发出碎裂声。'}
};
class WardInteractions {
  constructor(state,hooks){this.state=state;this.h=hooks;}
  get s(){return this.state.exploration;}
  reset(saved){
    const s=saved||{},ids=new Set(this.state.objects.filter(o=>o.type==='interactive'||o.type==='field'||o.type==='room-door'||o.kind==='inspect').map(o=>o.id));
    const list=key=>Array.isArray(s[key])?[...new Set(s[key].filter(id=>ids.has(id)))]:[];
    const inventory={};for(const id of Object.keys(WARD_ITEMS))inventory[id]=Number.isFinite(s.inventory?.[id])?Math.max(0,Math.min(99,Math.floor(s.inventory[id]))):0;
    const dials={};for(const o of this.state.objects.filter(o=>o.type==='field')){const max=o.kind==='code'?9:o.kind==='pressure'?1:2;dials[o.id]=[0,1,2].map(i=>Number.isInteger(s.dials?.[o.id]?.[i])?Math.max(0,Math.min(max,s.dials[o.id][i])):0);}
    this.state.exploration={inventory,searched:list('searched'),opened:list('opened'),unlocked:list('unlocked'),repaired:list('repaired'),inspected:list('inspected'),solved:list('solved'),broken:list('broken'),dials};this.sync();
  }
  sync(){
    for(const o of this.state.objects){
      if(o.type==='room-door'){o.activated=this.s.opened.includes(o.id);o.collide=!o.activated;const r=DUST2_ROOMS.rooms.find(r=>r.id===o.room);o.label=(o.activated?'关闭':o.key&&!this.s.unlocked.includes(o.id)?'开锁':'打开')+' · '+r.name;}
      if(o.type==='interactive'){o.activated=this.s.searched.includes(o.id)||this.s.repaired.includes(o.id)||this.s.inspected.includes(o.id);o.label=(o.kind==='search'?(o.activated?'已搜寻':'搜寻'):o.kind==='repair'?(o.activated?'操作':'检修'):'查看')+' · '+o.title;}
      if(o.kind==='inspect')o.activated=this.s.inspected.includes(o.id);
      if(o.type==='field'){
        o.activated=this.s.solved.includes(o.id)||this.s.broken.includes(o.id)||this.s.repaired.includes(o.id)||this.s.inspected.includes(o.id);
        if(['window','barricade','motor'].includes(o.kind))o.collide=!o.activated;
        o.label=(o.activated?'查看完成状态':({clue:'阅读线索',window:'拆窗 / 破窗',barricade:'拆除木板',motor:'修复大门'}[o.kind]||'操作谜题'))+' · '+o.title;
      }
      if(o.label){const locked=o.type==='room-door'&&o.key&&!this.s.unlocked.includes(o.id)&&!this.has(o.key)||o.kind==='barricade'&&!this.has('crowbar')||o.kind==='window'&&!this.has('crowbar')&&!this.has('screwdriver')||o.kind==='motor'&&(!this.has('motor-fuse')||!this.has('screwdriver'));o.cue=o.activated||o.read?'done':locked?'locked':'ready';}
    }
    WZ.refreshCollision();
  }
  commit(){this.sync();this.h.save();this.h.updateHUD();}
  add(id,n=1){this.s.inventory[id]=(this.s.inventory[id]||0)+n;}
  has(id){return(this.s.inventory[id]||0)>0;}
  interact(o){
    if(o.type==='room-door'){
      if(o.key&&!this.s.unlocked.includes(o.id)){
        if(!this.has(o.key)){this.h.subtitle('门锁着。需要'+WARD_ITEMS[o.key].name+'；钥匙在候诊庭院旁的封存杂物间。',6);return true;}
        this.s.unlocked.push(o.id);
      }
      if(o.activated&&[this.state.player,...this.state.pursuerEnabled?[this.state.enemy]:[]].some(p=>Math.abs((p.elevation||0)-o.baseY)<2&&WZ.boundsHit(o,p.x,p.y,.45))){this.h.subtitle('门口有人，请先让开再关门。');return true;}
      this.s.opened=o.activated?this.s.opened.filter(id=>id!==o.id):[...this.s.opened,o.id];this.h.audio.door();this.commit();return true;
    }
    if(o.type!=='interactive'&&o.type!=='field'&&o.kind!=='inspect')return false;
    this.h.open('interaction',o);return true;
  }
  search(o){
    if(this.s.searched.includes(o.id))return'这里已经搜寻过了。';
    this.s.searched.push(o.id);for(const[id,n]of Object.entries(o.loot||{}))this.add(id,n);
    this.h.audio.pickup();this.commit();return'已收进背包：'+Object.entries(o.loot||{}).map(([id,n])=>WARD_ITEMS[id].name+' × '+n).join('、')+'。';
  }
  repair(o){
    if(this.s.repaired.includes(o.id))return'线路已经修好，可以选择呼叫区域。';
    if(!this.has('screwdriver')||!this.has('wire'))return'缺少材料：需要绝缘螺丝刀和备用线材。维修间有工具，病历保管室有线材。';
    this.s.inventory.wire--;this.s.repaired.push(o.id);this.h.audio.power();this.commit();return'线路接通。扬声器里却先传来了你的呼吸声。现在可以选择远端呼叫区域。';
  }
  buy(){if(!this.has('coin'))return'没有旧硬币。值班入口旁的停用门卫室有零钱。';this.s.inventory.coin--;this.add('drink');this.h.audio.pickup();this.commit();return'取出一瓶汽水，已放进背包。标签上的生产日期是明天。';}
  turn(o,index){const max=o.kind==='code'?10:o.kind==='pressure'?2:3;this.s.dials[o.id][index]=(this.s.dials[o.id][index]+1)%max;this.h.audio.click?.();this.h.save();}
  solve(o){
    if(this.s.solved.includes(o.id))return'已经完成，东西都在背包里。';
    const v=this.s.dials[o.id],correct=o.kind==='code'?v.join('')===o.answer:o.kind==='pressure'?v.reduce((sum,n,i)=>sum+n*(i+1),0)===4:v.join('')==='012';
    if(!correct)return o.kind==='pressure'?'压力不对，泵没启动。重新调，保险芯不会丢。':'没对上。可以再试，材料不会扣。线索会记在背包里。';
    this.s.solved.push(o.id);for(const[id,n]of Object.entries(o.reward||{}))this.add(id,n);this.h.audio.power();this.commit();
    return'完成了。拿到：'+Object.entries(o.reward||{}).map(([id,n])=>WARD_ITEMS[id].name+' × '+n).join('、')+'。';
  }
  fieldAction(o,quiet=false){
    if(o.activated)return'这里已经处理好了。';
    if(o.kind==='motor'){
      if(!this.has('motor-fuse')||!this.has('screwdriver'))return'需要备用保险芯和螺丝刀。保险芯在候诊庭院排水泵里，工具在转运维修间。';
      this.s.inventory['motor-fuse']--;this.s.repaired.push(o.id);this.h.audio.power();this.commit();return'大门升起来了。消毒连廊已经通了，回去可以走这边。';
    }
    const tool=quiet?'screwdriver':'crowbar';if(!this.has(tool))return'需要'+WARD_ITEMS[tool].name+'。'+(quiet?'去转运维修间找。':'入口分诊牌旁的工具柜里有。');
    this.s.broken.push(o.id);this.lure({x:o.x,y:o.y,elevation:o.baseY},quiet?'click':'bottle');this.state.enemy.lureTime=quiet?2:12;this.commit();
    return quiet?'窗框拆下来了。后窗可以通行，动静不大。':'障碍拆掉了，通路已打开。响声能传很远。';
  }
  nextTask(){
    if(!this.s.solved.includes('shift-safe'))return'入口分诊牌 → 解开工具柜，拿撬棍';
    if(!this.s.solved.includes('well-pump'))return'候诊庭院 → 把排水泵压力调到 4，拿保险芯';
    if(!this.has('screwdriver'))return'地下转运道旁 → 进维修间找螺丝刀';
    if(!this.s.broken.includes('decon-boards'))return'消毒连廊 → 用撬棍拆掉木板';
    if(!this.s.repaired.includes('decon-gate'))return'消毒连廊 → 换保险芯，修好大门';
    if(!this.s.solved.includes('medicine-cabinet'))return'门诊长街 → 找处方，打开茶水间补给柜';
    return'疏散路线已通；继续收集号码牌和调查旧翼';
  }
  drink(){if(!this.has('drink'))return'背包里没有汽水。';if(this.state.player.stamina>=99)return'体力充足，先把汽水留着。';this.s.inventory.drink--;this.add('bottle');this.state.player.stamina=100;this.state.player.exhausted=false;this.h.audio.pickup();this.commit();return'体力恢复了。空瓶留着，可以往远处扔。';}
  lure(point,sound='door'){this.state.enemy.lure={...point};this.state.enemy.lureTime=8;this.state.enemy.path=[];this.state.enemy.repath=0;this.h.audio[sound]?.();}
  throwBottle(){
    const p=this.state.player;if(this.state.mode!=='playing'||p.hidden)return false;
    if(!this.has('bottle')){this.h.subtitle('没有空瓶。搜寻杂物柜，或喝完一瓶汽水。');return false;}
    let landing=null;
    for(let d=.6;d<=7;d+=.25){const x=p.x+Math.cos(p.angle)*d,y=p.y+Math.sin(p.angle)*d,h=WZ.groundHeight(x,y,p.elevation);if(h===null||WZ.solid(x,y)||!WZ.lineOfSight(p,{x,y,elevation:h}))break;if(WZ.canStand(x,y,.2,h))landing={x,y,elevation:h};}
    if(!landing||WZ.distance(p,landing)<1){this.h.subtitle('前方太近，换一个开阔方向再投掷。');return false;}
    this.s.inventory.bottle--;this.lure(landing,'bottle');this.commit();this.h.subtitle('空瓶在前方碎了。声音传进了走廊。',5);return true;
  }
  inventory(){if(this.state.mode==='playing')this.h.open('inventory');}
  render(body,kind,item){
    const p=text=>{const el=document.createElement('p');el.textContent=text;body.append(el);};
    const actions=document.createElement('div');actions.className='puzzle-actions';
    const button=(text,fn,disabled=false)=>{const b=document.createElement('button');b.className='puzzle-key';b.textContent=text;b.disabled=disabled;b.onclick=()=>{const result=fn();this.h.render();document.getElementById('puzzle-message').textContent=result||'';};actions.append(b);};
    if(kind==='inventory'){
      p('院区探索：'+this.nextTask());
      p('随身物品 · '+Object.values(this.s.inventory).reduce((n,v)=>n+v,0)+' 件');
      for(const[id,meta]of Object.entries(WARD_ITEMS))if(this.has(id)){const card=document.createElement('div');card.className='inventory-item';const title=document.createElement('strong'),text=document.createElement('p');title.textContent=meta.name+' × '+this.s.inventory[id];text.textContent=meta.text;card.append(title,text);body.append(card);}
      if(!Object.values(this.s.inventory).some(Boolean))p('背包还是空的。值班入口旁的停用门卫室可以搜寻；地图 R01–R06 标出院区小房间。');
      button('喝汽水 · 恢复体力',()=>this.drink(),!this.has('drink')||this.state.player.stamina>=99);
      p('钥匙在门前自动使用；维修时选择安装材料。关闭背包后按 Q 投掷空瓶。');
      for(const o of this.state.objects.filter(o=>o.memo&&this.s.searched.includes(o.id)))p(o.memo);
      for(const o of this.state.objects.filter(o=>['inspect','clue'].includes(o.kind)&&this.s.inspected.includes(o.id)))p(o.title+'：'+o.description);
    }else{
      p(item.description);
      if(item.type==='field'){
        if(['code','pressure','dosage'].includes(item.kind)){
          const v=this.s.dials[item.id];if(item.kind==='pressure')p('当前压力：'+v.reduce((sum,n,i)=>sum+n*(i+1),0)+' / 目标 4');
          for(let i=0;i<3;i++){
            const label=item.kind==='code'?'第 '+(i+1)+' 位：'+v[i]:item.kind==='pressure'?['小阀 +1','中阀 +2','大阀 +3'][i]+'：'+(v[i]?'开':'关'):['温度：'+['冷藏','常温','加热'][v[i]],'每次：'+(v[i]+1)+' 片','每天：'+(v[i]+1)+' 次'][i];
            button(label,()=>{this.turn(item,i);return'';},item.activated);
          }
          button(item.kind==='pressure'?'启动排水':'核对并开柜',()=>this.solve(item),item.activated);
          button('看线索提示',()=>item.hint);
        }
        if(['window','barricade','motor'].includes(item.kind)){
          if(item.activated)p('已处理，通路可以走。状态会自动保存。');
          if(item.kind==='window')button('用螺丝刀拆窗 · 小声',()=>this.fieldAction(item,true),item.activated);
          button(item.kind==='motor'?'换保险芯 · 修复大门':item.kind==='window'?'用撬棍砸窗 · 大声':'用撬棍拆木板',()=>this.fieldAction(item),item.activated);
        }
      }
      if(item.kind==='search'){if(this.s.searched.includes(item.id))p(item.memo||'抽屉已经空了。物品和搜寻状态都会保存。');button('搜索并收进背包',()=>this.search(item),this.s.searched.includes(item.id));}
      if(item.kind==='repair'){
        button('安装线材 · 使用螺丝刀',()=>this.repair(item),this.s.repaired.includes(item.id));
        for(const[name,x,y]of[['候诊庭院',26.6,26.32],['门诊长街',103,45]])button('呼叫 · '+name,()=>{this.lure({x,y,elevation:WZ.groundHeight(x,y)});return'呼叫声已传向'+name+'。线路现在通了。';},!this.s.repaired.includes(item.id));
      }
      if(item.kind==='vendor')button('投入 1 枚硬币 · 购买汽水',()=>this.buy(),!this.has('coin'));
      if(item.kind==='inspect'||item.kind==='clue')button('抄录异常记录',()=>{if(!this.s.inspected.includes(item.id))this.s.inspected.push(item.id);this.commit();return'记录已保存。背包里能重新看。';},this.s.inspected.includes(item.id));
    }
    body.append(actions);
  }
}
