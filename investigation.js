"use strict";
// Persistent first-level investigation; puzzle dialogs pause the simulation.
class WardInvestigation {
  constructor(state,hooks){this.state=state;this.h=hooks;this.active=null;this.sequence=[];}
  reset(saved){
    const s=saved||{};
    this.state.mission={switches:[0,1,2].map(i=>!!s.switches?.[i]),relay:!!s.relay,door:!!s.door,
      seals:[0,1,2].filter(i=>s.seals?.includes(i)),broadcast:!!s.broadcast,shortcut:!!s.shortcut,
      valves:[0,1].filter(i=>s.valves?.includes(i)),service:!!s.service,
      entered:!!s.entered,clues:Array.isArray(s.clues)?s.clues.filter(id=>typeof id==='string'):[]};
    this.active=null;this.sequence=[];this.sync();
  }
  get m(){return this.state.mission;}
  sync(){
    const m=this.m;if(!m)return;
    for(const o of this.state.objects){
      if(o.id==='annex-gate'){o.activated=m.door;o.collide=!m.door;}
      if(o.id==='annex-return-gate'){o.activated=m.shortcut;o.collide=!m.shortcut;}
      if(o.lock){o.activated=!!m[o.lock];o.collide=!o.activated;}
      if(o.id==='annex-relay')o.activated=m.relay;
      if(o.kind==='keypad')o.activated=m.door;
      if(o.id==='annex-receiver')o.activated=m.broadcast;
      if(o.id==='annex-shortcut')o.activated=m.shortcut;
      if(o.kind==='seal')o.activated=m.seals.includes(o.order);
      if(o.kind==='valve')o.activated=m.valves.includes(o.order);
      if(o.kind==='service')o.activated=m.service;
    }
    WZ.refreshCollision();
  }
  commit(){this.sync();this.h.save();this.h.updateHUD();}
  record(id){if(!this.m.clues.includes(id))this.m.clues.push(id);}
  objective(){
    if(!this.m.relay)return'前往 门诊长街旁的旧档案翼，检修配电柜';
    if(!this.m.door)return'查看接待厅线索，打开四位时间密码门';
    if(this.m.seals.length<3)return'探索档案回廊，找齐日 / 雨 / 月印章（'+this.m.seals.length+' / 3）';
    if(!this.m.broadcast)return'前往迷宫南侧广播室，排列离岗顺序';
    return'离岗广播已完成，返回庭院北侧出口';
  }
  enter(){if(!this.m.entered&&DUST2_ANNEX.contains(this.state.player.x,this.state.player.y)&&this.state.player.x>118){this.m.entered=true;this.h.subtitle('旧翼广播：“林秋，你已经在 02:17 下班。”可签到簿上，今天的你仍未离开。按 J 整理线索。',9);this.h.save();}}
  interact(item){
    if(item.type==='evidence'){
      if(!item.read){item.read=true;this.state.notes++;}this.record(item.id);this.open('evidence',item);this.h.save();return true;
    }
    if(item.type!=='puzzle')return false;
    if(item.kind==='valve'){
      if(!this.m.valves.includes(item.order)){this.m.valves.push(item.order);this.h.audio.power();this.commit();}
      this.h.subtitle('后勤泄压：'+this.m.valves.length+' / 2。'+(this.m.valves.length===2?'现在可拉动器材库门闩，开启广播室近路。':'另一处水阀在'+(item.order===0?'循环泵房':'洗衣房')+'。'),7);return true;
    }
    if(item.kind==='service'){
      if(this.m.valves.length<2){this.h.subtitle('门闩被水压卡住。先关闭洗衣房与泵房的两处水阀；检修单在泵房。',7);return true;}
      this.m.service=true;this.h.audio.door();this.h.subtitle('后勤捷径已打开。向西直达广播室，也可以从另一端返回后勤环廊。',7);this.commit();return true;
    }
    if(item.kind==='seal'){
      if(!this.m.seals.includes(item.order)){this.m.seals.push(item.order);this.h.audio.pickup();this.h.subtitle('已找到「'+item.symbol+'」交班印章。'+(this.m.seals.length===3?'三枚齐了。沿回廊去南侧离岗广播室。':'还有 '+(3-this.m.seals.length)+' 枚藏在回廊分支。'),7);this.commit();}
      else this.h.subtitle('这枚印章已经收好。按 J 查看随身线索。');return true;
    }
    if(item.kind==='shortcut'){this.m.shortcut=true;this.h.audio.door();this.h.subtitle('应急回廊已打开。从西侧捷径可直接返回接待厅，无需再穿迷宫。',7);this.commit();return true;}
    this.open(item.kind,item);return true;
  }
  open(kind,item=null){
    this.active={kind,item};this.sequence=[];this.message='';this.h.setMode('puzzle');this.h.unlock();
    document.getElementById('puzzle-screen').hidden=false;this.render();
    if(kind==='keypad')document.getElementById('puzzle-code')?.focus();
  }
  close(){document.getElementById('puzzle-screen').hidden=true;this.active=null;this.h.setMode('playing');this.h.lock();}
  journal(){if(this.state.mode==='puzzle'&&this.active?.kind==='journal'){this.close();return;}if(this.state.mode==='playing')this.open('journal');}
  render(){
    const $=id=>document.getElementById(id),{kind,item}=this.active,m=this.m,body=$('puzzle-body');body.replaceChildren();
    $('puzzle-kicker').textContent=kind==='journal'?'FIELD NOTES / 随身线索':kind==='inventory'||kind==='interaction'?'FIELD KIT / 夜班物品':'OLD WING / 02:17';
    const titles={relay:'接通门禁和档案室电源',keypad:'值班时间门禁',receiver:'结束这趟夜班',journal:'这一班，还缺什么？',evidence:item?.title,inventory:'随身背包',interaction:item?.title};
    $('puzzle-title').textContent=titles[kind];
    const paragraph=text=>{const el=document.createElement('p');el.textContent=text;body.append(el);return el;};
    const row=document.createElement('div');row.className='puzzle-actions';
    const button=(label,fn,active=false)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.className='puzzle-key';b.classList.toggle('selected',active);b.onclick=fn;row.append(b);return b;};
    if(kind==='evidence')paragraph(item.text);
    if(kind==='inventory'||kind==='interaction')this.h.interactions.render(body,kind,item);
    if(kind==='journal'){
      paragraph('当前：'+(this.state.power?this.objective():this.state.fuses===3?'去 广播庭院广播台放入号码牌，恢复总电源。':'在 候诊庭院、病历交接廊、门诊长街找三张号码牌（'+this.state.fuses+' / 3）。'));
      const list=document.createElement('ol');list.className='case-checklist';
      for(const [done,text]of[[this.state.power,'庭院 · 三张号码牌 / 总电源'],[m.relay,'配电室 · 恢复门禁与档案线路'],[m.door,'接待厅 · 打开时间密码门'],[m.seals.length===3,'回廊迷宫 · 三枚印章（'+m.seals.length+' / 3）'],[m.broadcast,'广播室 · 确认离岗，解锁出口']]){const li=document.createElement('li');li.textContent=(done?'✓  ':'○  ')+text;li.classList.toggle('done',done);list.append(li);}body.append(list);
      paragraph('随身印章：'+(m.seals.length?m.seals.map(i=>DUST2_ANNEX.symbols[i]).join(' / '):'尚未找到'));
      paragraph('可选探索：北翼 8 间房。后勤水阀 '+m.valves.length+' / 2；广播室后勤捷径'+(m.service?'已开启':'尚未开启')+'。黄灯候诊厅有试音铃，洗衣房与器材库有储物柜。');
      const clues=this.state.objects.filter(o=>o.type==='evidence'&&m.clues.includes(o.id)||o.type==='memory'&&o.activated||this.state.exploration?.inspected.includes(o.id)||o.type==='note'&&o.read);
      for(const clue of clues){const record=clue.type==='note'?WZ.level.notes[clue.note]:clue,details=document.createElement('details'),summary=document.createElement('summary'),text=document.createElement('p');summary.textContent=record.title;text.textContent=record.text||record.description;details.append(summary,text);body.append(details);}
      if(m.clues.includes('recording'))paragraph('录音摘记：值班口令 02:17。支路供电后，旧档案锁才会响应。');
      if(!clues.length)paragraph('还没有抄录纸面线索。接待厅和配电室有维修单；阅读后会存到这里。TAB 可查看包含迷宫的已探索地图。');
    }
    if(kind==='relay'){
      paragraph(m.relay?'门禁与档案线路已稳定供电。':'维修铭牌：A 门禁 / B 空置病房 / C 档案。调整开关后合闸检验。');
      for(let i=0;i<3;i++){const b=button(String.fromCharCode(65+i)+' · '+(m.switches[i]?'接通':'断开'),()=>{if(m.relay)return;m.switches[i]=!m.switches[i];this.h.audio.click();this.h.save();this.render();},m.switches[i]);b.disabled=m.relay;}
      body.append(row);const submit=document.createElement('button');submit.className='primary';submit.textContent=m.relay?'检修完成':'合闸检验';submit.disabled=m.relay;
      submit.onclick=()=>{if(!this.state.power)this.message='总电源尚未授权：先把三张号码牌送到 广播庭院广播台。';else if(m.switches[0]&&!m.switches[1]&&m.switches[2]){m.relay=true;this.message='两端线路已稳定。现在去接待厅操作时间门禁。';this.h.audio.power();this.commit();}else{this.message='线路不匹配，保护装置已阻止合闸。检修图在配电室内，可重新查看。';this.h.audio.click();}this.render();};body.append(submit);
    }
    if(kind==='keypad'){
      paragraph(m.door?'门禁已打开。向东进入重复档案回廊。':'这扇门只认得值班开始的时间。输入四位数字。');
      const form=document.createElement('form');form.className='code-form';const input=document.createElement('input');Object.assign(input,{id:'puzzle-code',type:'text',inputMode:'numeric',maxLength:4,placeholder:'— — — —',autocomplete:'off'});input.setAttribute('aria-label','四位时间密码');input.pattern='[0-9]{4}';input.required=true;input.disabled=m.door;
      const submit=document.createElement('button');submit.className='primary';submit.textContent='确认门禁';submit.disabled=m.door;form.append(input,submit);
      form.onsubmit=e=>{e.preventDefault();if(!m.relay)this.message='键盘亮起，但门锁没有供电。先完成配电柜检修。';else if(input.value==='0217'){m.door=true;this.message='时间核对通过。门后传来一阵翻页声，走廊里却没有人。';this.h.audio.door();this.commit();}else{this.message='时间不符。接待厅的钟和维修单或许记得。可以继续尝试。';this.h.audio.click();}this.render();if(!m.door)$('puzzle-code').focus();};body.append(form);
    }
    if(kind==='receiver'){
      paragraph(m.broadcast?'离岗确认。院区出口已解锁，从庭院北侧出去。':'按小满画里的顺序放入三枚印章，就能结束值班并解锁出口。不用再签交接单。顺序错了可以重来，印章会保留。');
      paragraph('当前频段：'+(this.sequence.length?this.sequence.map(i=>DUST2_ANNEX.symbols[i]).join(' → '):'等待第一枚印章'));
      for(let i=0;i<3;i++){const b=button(DUST2_ANNEX.symbols[i]+(m.seals.includes(i)?'':' · 缺失'),()=>{
        this.sequence.push(i);this.h.audio.click();this.message='';
        if(this.sequence.length===3){if(this.sequence.every((v,i)=>v===i)){m.broadcast=true;this.message='“林秋已离岗。别签下一张。直接走，听见没有？”\n返回庭院北侧出口。广播室西侧门闩可打开捷径。';this.h.audio.power();this.commit();}else{this.sequence=[];this.message='广播只发出一声轻响。顺序不对。去看接待厅的三格画，也可以按下方的提示按钮。';}}
        this.render();},this.sequence.includes(i));b.disabled=m.broadcast||m.seals.length<3;
      }body.append(row);if(m.seals.length<3)paragraph('还缺 '+(3-m.seals.length)+' 枚印章。它们分散在回廊的岔路里。');
      if(!m.broadcast)button('清空频段',()=>{this.sequence=[];this.message='';this.render();});
    }
    $('puzzle-message').textContent=this.message||'';
    const hints={relay:'A 接通、B 断开、C 接通，再合闸。庭院总电源要先打开。',keypad:'钟停在 02:17，维修单让你去掉冒号。确认配电检修已经完成。',receiver:'小满画里的一天：日出 → 下雨 → 月亮。先去迷宫找齐三枚印章。'};
    $('puzzle-hint').hidden=!hints[kind];$('puzzle-hint').onclick=()=>{this.message=hints[kind];this.render();};
  }
}
