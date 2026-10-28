"use strict";
const game=(()=>{
  const $=id=>document.getElementById(id),audio=new WardAudio(),renderer=new WardRenderer($('world')),viewInput=new WardLookInput();
  const state={mode:'home',level:0,pursuerEnabled:true,nearby:[],player:{...WZ.level.start,pitch:0,torch:true,crouch:false,hidden:false,stamina:100,exhausted:false},objects:WZ.createObjects(),enemy:{...WZ.level.enemy,mode:'patrol',path:[],target:null,memory:0,repath:0,waypoint:0,knownHiding:false},fuses:0,power:false,elapsed:0,levelElapsed:0,stress:0,walkPhase:0,moveAmount:0,chases:0,notes:0,cleared:[],started:false};
  const interactions=new WardInteractions(state,{audio,subtitle,save,updateHUD,open:(kind,item)=>investigation.open(kind,item),render:()=>investigation.render()});
  const investigation=new WardInvestigation(state,{setMode,unlock,lock,audio,subtitle,save,updateHUD,interactions});
  const pursuer=new WardPursuer(state,{audio,subtitle,caught,danger:(visible,text)=>{$('danger-label').classList.toggle('visible',visible);if(text)$('danger-label').lastElementChild.textContent=text;}});
  const cartography=new WardCartography(state);cartography.reset();
  const scare=new WardScare($('scare'));
  const keys=new Set(),touch={forward:0,strafe:0,sprint:false,crouch:false},isTouch=matchMedia('(pointer:coarse)').matches;
  const show=(id,visible=true)=>{$(id).hidden=!visible;};
  let last=performance.now(),subtitleTimer=0,stepTimer=0,enemyStepTimer=0,pointerAttempt=0,drag=null,settingsOrigin='home',nextLevel=null,hudTimer=0,lastTorch=null;
  function subtitle(text,duration=5){$('subtitle').textContent=text;$('subtitle').classList.add('visible');subtitleTimer=duration;}
  function unlock(){viewInput.reset();keys.clear();touch.forward=touch.strafe=0;touch.sprint=false;drag=null;if(document.pointerLockElement)document.exitPointerLock();}
  function lock(){
    if(isTouch||state.mode!=='playing'||document.pointerLockElement===$('world'))return;
    pointerAttempt=performance.now();viewInput.reset(true);
    const fallback=()=>{if(state.mode!=='playing')return;try{const result=$('world').requestPointerLock?.();if(result?.catch)result.catch(()=>{});}catch{}};
    try{const result=$('world').requestPointerLock?.({unadjustedMovement:true});if(result?.catch)result.catch(e=>{if(e.name==='NotSupportedError')fallback();});}
    catch(e){if(e.name==='NotSupportedError'||e instanceof TypeError)fallback();}
  }
  function setMode(mode){viewInput.reset();state.mode=mode;document.body.dataset.mode=mode;audio.suspend(mode!=='playing');}
  function checkpoint(){
    const value=WZ.storage.get('progress.v2',null);
    return value&&value.version===2&&Number.isInteger(value.level)&&value.level>=0&&value.level<WZ.levels.length&&Array.isArray(value.items)?value:null;
  }
  function save(){
    if(!state.started||state.mode==='won')return;
    const jumping=nextLevel!==null;
    WZ.storage.set('progress.v2',{version:2,charted:jumping?[]:state.charted,exploration:jumping?null:state.exploration,mission:jumping?null:state.mission,level:jumping?nextLevel:state.level,devices:jumping?[]:state.objects.filter(o=>o.type==='device'&&o.activated).map(o=>o.id),memories:jumping?[]:state.objects.filter(o=>o.type==='memory'&&o.activated).map(o=>o.id),items:jumping?[]:state.objects.filter(o=>o.type==='fuse'&&o.taken).map(o=>o.id),power:jumping?false:state.power,elapsed:state.elapsed,notes:state.notes,chases:state.chases,cleared:state.cleared,read:jumping?[]:state.objects.filter(o=>o.read).map(o=>o.id)});
  }
  function resetPlayer(){
    scare.cancel();document.documentElement.style.setProperty('--fear','0');
    Object.assign(state.player,WZ.level.start,{pitch:0,torch:true,crouch:false,hidden:false,stamina:100,exhausted:false,hideAngle:null,hideReturn:null});
    state.player.elevation=WZ.groundHeight(state.player.x,state.player.y)??0;state.player.eyeElevation=state.player.elevation;state.player.verticalSpeed=0;
    Object.assign(state.enemy,WZ.level.enemy,{mode:'patrol',target:null,path:[],memory:0,repath:0,waypoint:0,knownHiding:false,lureTime:0,lure:null,patrolZone:null,collisionVersion:-1,stuck:0,phase:0,motion:0,angle:0,voiceTimer:0,stepTimer:0,stressSpoken:false});
    state.enemy.elevation=WZ.groundHeight(state.enemy.x,state.enemy.y)??0;state.enemy.verticalSpeed=0;
    state.levelElapsed=0;state.stress=0;state.moveAmount=0;state.walkPhase=0;state.nearby=[];viewInput.reset();keys.clear();touch.crouch=false;show('hiding-mask',false);
    document.querySelector('[data-action="crouch"]').classList.remove('active');
  }
  function loadLevel(index,restored=null){
    WZ.loadLevel(index);state.level=WZ.levelIndex;state.objects=WZ.createObjects();state.fuses=0;state.power=!!restored?.power;nextLevel=null;
    for(const o of state.objects){if(o.type==='device'&&restored?.devices?.includes(o.id))o.activated=true;if(o.type==='memory'&&restored?.memories?.includes(o.id))o.activated=true;if(o.type==='fuse'&&restored?.items?.includes(o.id)){o.taken=true;state.fuses++;}if(restored?.read?.includes(o.id))o.read=true;}
    investigation.reset(restored?.mission);interactions.reset(restored?.exploration);cartography.reset(restored?.charted);renderer.makeTextures();resetPlayer();cartography.update(true);updateHUD();
  }
  function hidePanels(){['home','pause','ending','map-screen','note-screen','settings','help','chapter-screen','chapter-select','intro','puzzle-screen'].forEach(id=>show(id,false));}
  function chapterIntro(){
    $('chapter-kicker').textContent='CHAPTER 0'+(state.level+1)+' / '+WZ.level.en;
    $('chapter-title').textContent=WZ.level.chapter;
    $('chapter-story').textContent=WZ.level.intro;
    $('chapter-next').firstElementChild.textContent='进入'+WZ.level.name;
    document.querySelectorAll('.chapter-progress i').forEach((el,i)=>{el.classList.toggle('complete',state.cleared.includes(i));el.classList.toggle('current',i===state.level);});
    show('chapter-screen');setMode('chapter');unlock();
  }
  function start(index=0,restored=null){
    audio.init();hidePanels();Object.assign(state,{elapsed:restored?.elapsed||0,notes:restored?.notes||0,chases:restored?.chases||0,cleared:Array.isArray(restored?.cleared)?restored.cleared.slice():[],started:true});
    loadLevel(index,restored);show('hud',false);chapterIntro();save();
  }
  function enterChapter(){
    show('chapter-screen',false);if(nextLevel!==null){const index=nextLevel;loadLevel(index);}
    show('hud');show('touch-controls',isTouch);setMode('playing');save();lock();subtitle(state.power?investigation.objective():WZ.level.objective+'。TAB 查看地图，J 整理线索。',6);
  }
  function completeLevel(){
    if(!state.cleared.includes(state.level))state.cleared.push(state.level);
    audio.power();
    finish();
  }

  function home(){
    save();unlock();hidePanels();show('home');show('hud',false);setMode('home');state.started=false;WZ.loadLevel(0);state.level=0;state.objects=WZ.createObjects();Object.assign(state.player,{torch:true,hidden:false});investigation.reset(null);interactions.reset(null);renderer.makeTextures();nextLevel=null;updateHome();
  }
  function pause(){if(state.mode!=='playing')return;save();setMode('paused');show('pause');unlock();}
  function resume(){show('pause',false);setMode('playing');lock();}
  function restart(){loadLevel(state.level);hidePanels();show('hud');show('touch-controls',isTouch);setMode('playing');save();lock();subtitle('回到值班入口了。先看路线卡，别急着签任何东西。');}
  function recover(){show('ending',false);resetPlayer();show('hud');setMode('playing');save();lock();subtitle('回到入口了。背包和调查记录都还在。');}
  function openSettings(){settingsOrigin=state.mode;if(state.mode==='playing')pause();show('settings');setMode('settings');unlock();}
  function closeSettings(){show('settings',false);if(settingsOrigin==='playing'){show('pause',false);setMode('playing');lock();}else setMode(settingsOrigin);}
  function toggleMap(){if(state.mode==='map'){show('map-screen',false);setMode('playing');lock();return;}if(state.mode!=='playing')return;cartography.update(true);save();$('map-screen').querySelector('h2').textContent='探索记录 / '+WZ.area(state.player.x,state.player.y);for(const el of $('map-rooms').children){const r=[...DUST2_ROOMS.rooms,...DUST2_ANNEX.rooms].find(r=>r.id===el.dataset.room);el.hidden=!WardCartography.roomKnown(state,r);}renderer.drawMap(state);show('map-screen');setMode('map');unlock();}
  function closeNote(){show('note-screen',false);setMode('playing');lock();}
  function formatTime(t){return String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');}
  function stats(){
    $('ending-stats').replaceChildren();
    for(const[value,label]of[[formatTime(state.elapsed),'探索时间'],[state.cleared.length+' / '+WZ.levels.length,'完成章节'],[String(state.notes),'已读便签']]){const d=document.createElement('div');d.textContent=value;const small=document.createElement('small');small.textContent=label;d.append(small);$('ending-stats').append(d);}
  }
  function caught(){
    if(state.mode!=='playing')return;
    setMode('scare');unlock();show('hud',false);audio.suspend(false);audio.hug();
    scare.show(()=>{if(state.mode==='scare')caughtScreen();});
  }
  function caughtScreen(){
    setMode('caught');show('ending');
    $('ending-kicker').textContent='02:17 / 又一次交接';$('ending-title').textContent='你被带回了入口。';
    $('ending-description').textContent='走廊里的广播突然停了。再睁开眼，你又站在值班入口。\n回到本层入口继续探索；收集到的东西都会保留。';
    $('ending-restart').firstElementChild.textContent='回到本层入口';stats();save();
  }
  function finish(){
    save();setMode('won');unlock();show('hud',false);show('ending');WZ.storage.set('progress.v2',null);
    const best=WZ.storage.get('best.courtyard.v1',null);if(state.cleared.length===WZ.levels.length&&(best===null||state.elapsed<best))WZ.storage.set('best.courtyard.v1',state.elapsed);
    $('ending-kicker').textContent='02:18 / 第一章结束';$('ending-title').textContent='先出去。别签。';
    $('ending-description').textContent=WZ.level.reveal+'\n\n你没有签字。门开了。手机上的时间终于跳到 02:18。\n身后的广播又响起来：“人已经走了。没走，我还在。下一位呢？”';$('ending-restart').firstElementChild.textContent='重新调查院区';stats();
  }
  function updateHome(){const value=checkpoint();show('continue-game',!!value);if(value)$('continue-game').textContent='继续第 '+(value.level+1)+' 章 · '+WZ.levels[value.level].name+' ↗';const best=WZ.storage.get('best.courtyard.v1',null);$('best-record').textContent=best===null?'第一关扩展版 / 庭院 + 旧档案翼':'最短归途 / '+formatTime(best);}
  function updateHUD(){
    const memories=state.objects.filter(o=>o.type==='memory'),done=memories.filter(o=>o.activated).length;
    $('explore-progress').hidden=!memories.length;$('explore-progress').textContent=done===3?'✉ 三份异常交接单已收齐':'异常交接单 '+done+' / 3 · 花园 / 广播 / 药房';
    $('fuse-count').textContent=state.fuses+' / 3';$('fuse-progress').querySelectorAll('i').forEach((el,i)=>el.classList.toggle('found',i<state.fuses));
    $('objective-text').textContent=state.power?investigation.objective():state.fuses===3?'前往'+WZ.level.stationName:WZ.level.objective;
    if(state.mission)$('case-progress').textContent='旧翼调查 '+[state.mission.relay,state.mission.door,state.mission.seals.length===3,state.mission.broadcast].filter(Boolean).length+' / 4 · J 线索笔记';
    if(state.exploration){$('inventory-button').textContent='背包 '+Object.values(state.exploration.inventory).reduce((a,b)=>a+b,0);$('throw-button').textContent='投瓶 '+(state.exploration.inventory.bottle||0);$('field-progress').textContent='院区探索 · '+interactions.nextTask();}
    $('stamina-fill').style.width=state.player.stamina+'%';$('posture').textContent=state.player.hidden?'躲藏':state.player.crouch?'蹲行':state.moveAmount>1.1?'小跑':'漫步';
    if(lastTorch!==state.player.torch){lastTorch=state.player.torch;$('torch-state').innerHTML=(lastTorch?'◉ 手电开启':'○ 环境照明')+' <kbd>F</kbd>';}
    $('area-name').textContent='0'+(state.level+1)+' / '+WZ.area(state.player.x,state.player.y);
  }
  function target(){
    const p=state.player;if(p.hidden)return{type:'unhide',label:'离开储物柜'};let best=1.6,found=null;
    for(const obj of state.objects){if(obj.taken||!obj.label||Math.abs(p.elevation-obj.baseY)>2)continue;const d=WZ.interactionDistance(p,obj),angle=Math.abs(WZ.angleDiff(Math.atan2(obj.y-p.y,obj.x-p.x),p.angle));if(d<best&&angle<.85&&WZ.lineOfSight(p,obj)){best=d;found=obj;}}return found;
  }
  function interact(){
    if(state.mode==='note'){closeNote();return;}if(state.mode!=='playing')return;const item=target();if(!item)return;
    if(interactions.interact(item)||investigation.interact(item))return;
    if(item.type==='device'){
      const devices=state.objects.filter(o=>o.type==='device');
      if(item.kind===0){investigation.record('recording');item.activated=true;subtitle('录音：值班口令是 02:17。先接通支路电源，再回档案抽屉输入。录音末尾，有人重复了你的名字。',9);audio.pickup();}
      if(item.kind===1){item.activated=!item.activated;audio.power();subtitle(item.activated?'支路电源接通。远处的档案锁响了一声。':'支路电源关闭。档案锁重新锁定。',6);}
      if(item.kind===2){
        if(!devices.find(o=>o.kind===0)?.activated||!devices.find(o=>o.kind===1)?.activated){subtitle('抽屉锁着：需要录音里的口令，以及支路电源。',6);audio.click();return;}
        item.activated=true;audio.door();$('note-title').textContent='庭院 · 多出来的值班记录';
        $('note-text').textContent='登记簿写着你已经离开，时间是 02:17。下一行却是你刚刚按下配电开关的时间。\n\n背面的小字：别追着广播里的自己走。'+'\n\n隐藏档案已记录。你把这份异常记录放回原处。旧档案翼里，或许有那位交接人的答案。';show('note-screen');setMode('note');unlock();
      }
      if(item.kind===3){audio.door();item.activated=true;state.enemy.lure={x:item.x,y:item.y,elevation:item.baseY};state.enemy.lureTime=8;state.enemy.repath=0;subtitle('呼叫铃响了。空走廊里，声音拖得很长。',6);}
      save();updateHUD();
    }else if(item.type==='memory'){
      const fresh=!item.activated;item.activated=true;if(fresh)audio.pickup();
      const complete=state.objects.filter(o=>o.type==='memory').every(o=>o.activated);
      $('note-title').textContent=item.title;$('note-text').textContent=item.text+(complete?'\n\n三张纸的日期一样，签名一样。只有下班时间不同：每一张都比你进门的时间晚一分钟。\n有人一直在替你签字。':'\n\n这张已收好。还有两份交接单散在院区里，不影响主线通行。');
      show('note-screen');setMode('note');unlock();save();updateHUD();
    }else if(item.type==='fuse'){
      if(WZ.level.ordered&&item.order!==state.fuses){state.objects.filter(o=>o.type==='fuse').forEach(o=>o.taken=false);state.fuses=0;audio.click();subtitle('顺序要从 ① 开始：① → ② → ③。阀门已复位，可以再试一次。',6);}
      else{item.taken=true;state.fuses++;audio.pickup();subtitle(WZ.level.collectText[item.order]+(state.fuses===3?' 去'+WZ.level.stationName+'吧。':''),6);}save();updateHUD();
    }else if(item.type==='generator'){
      if(state.power){subtitle(investigation.objective()+'。',6);return;}
      if(state.fuses<3){subtitle('还需要 '+(3-state.fuses)+' 个'+WZ.level.itemName+'。查看地图可以找到它们。');audio.click();return;}
      state.power=true;audio.power();subtitle('庭院总电源已授权。沿 门诊长街进入东侧旧档案翼，检修门禁与档案供电。',8);save();updateHUD();
    }else if(item.type==='exit'){
      if(state.power&&state.mission.broadcast)completeLevel();else if(state.power)subtitle('出口仍在等一份交接记录。'+investigation.objective()+'。',7);else subtitle('先完成本层任务，再启动'+WZ.level.stationName+'。出口和广播台共用门禁。',5);
    }else if(item.type==='locker'){
      const p=state.player,normal={x:Math.cos(item.angle),y:Math.sin(item.angle)};
      const front=[.58,.75,1].map(d=>({x:item.x+normal.x*d,y:item.y+normal.y*d})).find(q=>WZ.canStand(q.x,q.y));
      p.hideReturn={x:p.x,y:p.y};if(front){p.x=front.x;p.y=front.y;p.hideReturn=front;}
      p.elevation=WZ.groundHeight(p.x,p.y,p.elevation)??p.elevation;p.eyeElevation=p.elevation;p.hideAngle=item.angle;p.angle=item.angle;p.pitch=0;p.hidden=true;p.torch=false;viewInput.reset();show('hiding-mask');keys.clear();audio.door();subtitle('现在面向柜外。可以转头观察；按 E 离开储物柜。');
    }else if(item.type==='unhide'){state.player.hidden=false;state.player.hideAngle=null;viewInput.reset();show('hiding-mask',false);audio.door();}
    else if(item.type==='note'){
      const note=WZ.level.notes[item.note];$('note-title').textContent=note.title;$('note-text').textContent=note.text;show('note-screen');setMode('note');unlock();if(!item.read){item.read=true;state.notes++;}save();
    }
  }
  function torch(){if(state.mode!=='playing'||state.player.hidden)return;state.player.torch=!state.player.torch;audio.click();updateHUD();}
  function updateEnemy(dt){pursuer.update(dt);}
  function update(dt){
    if(state.mode!=='playing')return;state.elapsed+=dt;state.levelElapsed+=dt;
    if(subtitleTimer>0){subtitleTimer-=dt;if(subtitleTimer<=0)$('subtitle').classList.remove('visible');}
    const p=state.player;WZ.settle(p,dt);viewInput.apply(p,dt,WZ.settings.sensitivity);if(keys.has('ArrowLeft'))p.angle-=dt*1.9;if(keys.has('ArrowRight'))p.angle+=dt*1.9;if(p.hidden){p.angle=p.hideAngle+WZ.clamp(WZ.angleDiff(p.angle,p.hideAngle),-1.1,1.1);p.pitch=WZ.clamp(p.pitch,-.4,.4);}
    let forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+touch.forward,strafe=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+touch.strafe;
    const len=Math.hypot(forward,strafe);if(len>1){forward/=len;strafe/=len;}p.crouch=touch.crouch||keys.has('KeyC')||keys.has('ControlLeft')||keys.has('ControlRight');
    if(p.stamina<2)p.exhausted=true;else if(p.stamina>25)p.exhausted=false;
    const sprint=(touch.sprint||keys.has('ShiftLeft')||keys.has('ShiftRight'))&&!p.crouch&&!p.exhausted&&!p.hidden&&len>.05,speed=(sprint?5.8:p.crouch?1.7:3.5)*1.2,oldX=p.x,oldY=p.y;
    if(!p.hidden)WZ.move(p,(Math.cos(p.angle)*forward-Math.sin(p.angle)*strafe)*speed*dt,(Math.sin(p.angle)*forward+Math.cos(p.angle)*strafe)*speed*dt);
    const moved=Math.hypot(p.x-oldX,p.y-oldY)>dt*.1;state.moveAmount=moved?(sprint?1.5:p.crouch?.35:1):0;p.stamina=WZ.clamp(p.stamina+(sprint&&moved?-24:22)*dt,0,100);
    if(moved){state.walkPhase+=dt*(sprint?12:p.crouch?5:8);stepTimer-=dt;if(stepTimer<=0){audio.step(sprint,p.crouch);stepTimer=sprint?.32:p.crouch?.8:.5;}}else stepTimer=0;
    const item=target();show('interaction',!!item);$('crosshair').classList.toggle('active',!!item);if(item)$('interaction-text').textContent=item.label;
    investigation.enter();updateEnemy(dt);audio.environment(p,dt);hudTimer-=dt;if(hudTimer<=0){if(cartography.update())save();state.nearby=WZ.nearbyInteractions(p,state.objects);document.documentElement.style.setProperty('--fear',String(state.stress));updateHUD();hudTimer=.1;}
  }
  const frameTimes=[];let performanceTick=0;
  function frame(now){if(document.hidden){last=now;requestAnimationFrame(frame);return;}const elapsed=now-last,dt=Math.min(.045,elapsed/1000);last=now;
    frameTimes.push(elapsed);if(frameTimes.length>120)frameTimes.shift();
    if(now-performanceTick>500&&!$('performance').hidden){performanceTick=now;const sorted=frameTimes.slice().sort((a,b)=>a-b);$('performance').textContent=Math.round(1000/(frameTimes.reduce((a,b)=>a+b)/frameTimes.length))+' FPS · P95 '+sorted[Math.floor(sorted.length*.95)].toFixed(1)+' ms';}
update(dt);renderer.render(state,now/1000);requestAnimationFrame(frame);}
  $('journal-button').onclick=()=>investigation.journal();$('puzzle-close').onclick=$('puzzle-done').onclick=()=>investigation.close();
  $('inventory-button').onclick=()=>{if(state.mode==='puzzle'&&investigation.active?.kind==='inventory')investigation.close();else interactions.inventory();};
  $('throw-button').onclick=()=>interactions.throwBottle();
  for(const button of document.querySelectorAll('[data-map-focus]'))button.onclick=()=>{
    renderer.drawMap(state,button.dataset.mapFocus);
    for(const b of document.querySelectorAll('[data-map-focus]'))b.setAttribute('aria-pressed',String(b===button));
  };
  for(const room of [...DUST2_ROOMS.rooms,...DUST2_ANNEX.rooms]){const label=document.createElement('span');label.dataset.room=room.id;label.textContent=room.code+' '+room.name;$('map-rooms').append(label);}
  $('start').onclick=()=>start(0);$('help-start').onclick=()=>start(0);$('continue-game').onclick=()=>{const value=checkpoint();if(value)start(value.level,value);};
  $('chapter-next').onclick=enterChapter;$('chapter-home').onclick=home;$('chapters-open').onclick=()=>show('chapter-select');$('chapter-select-close').onclick=()=>show('chapter-select',false);
  WZ.levels.forEach((level,i)=>{const b=document.createElement('button');b.className='chapter-card';const a=document.createElement('small');a.textContent='CHAPTER 0'+(i+1);const title=document.createElement('strong');title.textContent=level.name;const sub=document.createElement('span');sub.textContent=level.chapter;b.append(a,title,sub);b.onclick=()=>start(i);$('chapter-list').append(b);});
  $('resume').onclick=resume;$('restart').onclick=restart;$('return-home').onclick=home;$('ending-home').onclick=home;$('ending-restart').onclick=()=>state.mode==='won'?start(0):recover();$('pause-button').onclick=pause;
  $('help-open').onclick=()=>show('help');$('settings-open').onclick=openSettings;$('pause-settings').onclick=openSettings;$('settings-done').onclick=closeSettings;$('map-close').onclick=toggleMap;$('map-button').onclick=toggleMap;$('note-close').onclick=closeNote;$('note-done').onclick=closeNote;
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.dataset.close==='settings'?closeSettings():show(b.dataset.close,false));
  function applySettings(){const s=WZ.settings;document.documentElement.style.setProperty('--brightness',s.brightness/100);document.querySelector('.grain').style.display=s.grain?'':'none';audio.volume(s.volume);WZ.storage.set('settings',s);}
  for(const name of['volume','brightness','sensitivity']){const el=$(name);el.value=WZ.settings[name];$(name+'-value').textContent=el.value+'%';el.oninput=()=>{WZ.settings[name]=Number(el.value);$(name+'-value').textContent=el.value+'%';applySettings();};}
  $('grain-toggle').checked=WZ.settings.grain;$('grain-toggle').onchange=e=>{WZ.settings.grain=e.target.checked;applySettings();};
  for(const name of ['shocks','grisly']){$(name+'-toggle').checked=WZ.settings[name];$(name+'-toggle').onchange=e=>{WZ.settings[name]=e.target.checked;applySettings();};}
  window.addEventListener('keydown',e=>{
    if(e.target instanceof HTMLInputElement){if(e.code==='Escape'&&state.mode==='puzzle'){e.preventDefault();investigation.close();}return;}
    if(['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)||(state.mode==='playing'&&['KeyW','KeyA','KeyS','KeyD','ControlLeft','ControlRight'].includes(e.code)))e.preventDefault();
    if(e.repeat)return;
    if(e.code==='Escape'){
      if(!$('help').hidden){show('help',false);return;}if(!$('chapter-select').hidden){show('chapter-select',false);return;}
      if(state.mode==='puzzle')investigation.close();else if(state.mode==='settings')closeSettings();else if(state.mode==='map')toggleMap();else if(state.mode==='note')closeNote();else if(state.mode==='paused')resume();else if(state.mode==='playing')pause();return;
    }
    if(e.code==='KeyJ'){investigation.journal();return;}
    if(e.code==='KeyI'){$('inventory-button').click();return;}
    if(e.code==='KeyQ'){interactions.throwBottle();return;}
    if(e.code==='F3'){e.preventDefault();$('performance').hidden=!$('performance').hidden;return;}if(e.code==='Tab'||e.code==='KeyM'){toggleMap();return;}if(e.code==='KeyE'){interact();return;}if(e.code==='KeyF'){torch();return;}if(e.code==='Space'){if(state.mode==='playing')WZ.jump(state.player);return;}if(state.mode==='playing')keys.add(e.code);
  });
  window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();if(state.mode==='playing')pause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&state.mode==='playing')pause();});
  document.addEventListener('pointerlockchange',()=>{const locked=document.pointerLockElement===$('world');viewInput.reset(locked);if(locked){if(state.mode!=='playing')document.exitPointerLock();}else if(state.mode==='playing'&&performance.now()-pointerAttempt>300)pause();});
  document.addEventListener('mousemove',e=>{if(state.mode==='playing'&&document.pointerLockElement===$('world'))viewInput.mouse(e.movementX,e.movementY,e.timeStamp);});
  $('world').style.touchAction='none';
  $('world').onpointerdown=e=>{if(state.mode!=='playing')return;if(e.pointerType==='touch'){drag={id:e.pointerId,x:e.clientX,y:e.clientY};$('world').setPointerCapture(e.pointerId);}else lock();};
  $('world').onpointermove=e=>{if(drag&&drag.id===e.pointerId&&state.mode==='playing'){viewInput.add((e.clientX-drag.x)*1.5,(e.clientY-drag.y)*1.5);drag.x=e.clientX;drag.y=e.clientY;}};
  $('world').onpointerup=$('world').onpointercancel=()=>drag=null;
  const stick=$('touch-move');let stickId=null;
  function stickMove(e){const r=stick.getBoundingClientRect(),x=WZ.clamp((e.clientX-r.left-r.width/2)/40,-1,1),y=WZ.clamp((e.clientY-r.top-r.height/2)/40,-1,1);touch.strafe=x;touch.forward=-y;stick.firstElementChild.style.transform='translate('+(x*28)+'px,'+(y*28)+'px)';}
  stick.onpointerdown=e=>{stickId=e.pointerId;stick.setPointerCapture(e.pointerId);stickMove(e);};stick.onpointermove=e=>{if(stickId===e.pointerId)stickMove(e);};stick.onpointerup=stick.onpointercancel=()=>{stickId=null;touch.forward=touch.strafe=0;stick.firstElementChild.style.transform='';};
  document.querySelectorAll('[data-action]').forEach(b=>{const action=b.dataset.action;b.onpointerdown=e=>{e.preventDefault();if(action==='sprint'){touch.sprint=true;b.setPointerCapture(e.pointerId);}else if(action==='interact')interact();else if(action==='torch')torch();else if(action==='jump')WZ.jump(state.player);else if(action==='map')toggleMap();else if(action==='crouch'){touch.crouch=!touch.crouch;b.classList.toggle('active',touch.crouch);}};if(action==='sprint')b.onpointerup=b.onpointercancel=()=>touch.sprint=false;});
  window.addEventListener('pagehide',save);document.addEventListener('contextmenu',e=>e.preventDefault());investigation.reset(null);interactions.reset(null);applySettings();updateHome();requestAnimationFrame(frame);
  return{state,renderer,audio,pursuer,cartography,investigation,interactions,input:viewInput,start,pause,resume,home,interact,toggleMap,formatTime,save};
})();
