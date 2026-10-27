"use strict";
const game=(()=>{
  const $=id=>document.getElementById(id),audio=new WardAudio(),renderer=new WardRenderer($('world')),viewInput=new WardLookInput();
  const state={mode:'home',level:0,player:{...WZ.level.start,pitch:0,torch:true,crouch:false,hidden:false,stamina:100,exhausted:false},objects:WZ.createObjects(),enemy:{...WZ.level.enemy,mode:'patrol',path:[],target:null,memory:0,repath:0,waypoint:0,knownHiding:false},fuses:0,power:false,elapsed:0,levelElapsed:0,stress:0,walkPhase:0,moveAmount:0,chases:0,notes:0,cleared:[],started:false};
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
    WZ.storage.set('progress.v2',{version:2,level:jumping?nextLevel:state.level,items:jumping?[]:state.objects.filter(o=>o.type==='fuse'&&o.taken).map(o=>o.id),power:jumping?false:state.power,elapsed:state.elapsed,notes:state.notes,chases:state.chases,cleared:state.cleared,read:jumping?[]:state.objects.filter(o=>o.read).map(o=>o.id)});
  }
  function resetPlayer(){
    Object.assign(state.player,WZ.level.start,{pitch:0,torch:true,crouch:false,hidden:false,stamina:100,exhausted:false,hideAngle:null,hideReturn:null});
    state.player.elevation=WZ.groundHeight(state.player.x,state.player.y)??0;state.player.eyeElevation=state.player.elevation;state.player.verticalSpeed=0;
    Object.assign(state.enemy,WZ.level.enemy,{mode:'patrol',target:null,path:[],memory:0,repath:0,waypoint:0,knownHiding:false});
    state.enemy.elevation=WZ.groundHeight(state.enemy.x,state.enemy.y)??0;state.enemy.verticalSpeed=0;
    state.levelElapsed=0;state.stress=0;state.moveAmount=0;state.walkPhase=0;viewInput.reset();keys.clear();touch.crouch=false;show('hiding-mask',false);
    document.querySelector('[data-action="crouch"]').classList.remove('active');
  }
  function loadLevel(index,restored=null){
    WZ.loadLevel(index);state.level=index;state.objects=WZ.createObjects();state.fuses=0;state.power=!!restored?.power;nextLevel=null;
    for(const o of state.objects){if(o.type==='fuse'&&restored?.items?.includes(o.id)){o.taken=true;state.fuses++;}if(restored?.read?.includes(o.id))o.read=true;}
    renderer.makeTextures();resetPlayer();updateHUD();
  }
  function hidePanels(){['home','pause','ending','map-screen','note-screen','settings','help','chapter-screen','chapter-select','intro'].forEach(id=>show(id,false));}
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
    show('hud');show('touch-controls',isTouch);setMode('playing');save();lock();subtitle(WZ.level.objective+'。地图已标出任务位置。',6);
  }
  function completeLevel(){
    if(!state.cleared.includes(state.level))state.cleared.push(state.level);
    audio.power();
    if(state.level===WZ.levels.length-1){finish();return;}
    nextLevel=state.level+1;save();show('hud',false);
    $('chapter-kicker').textContent='MEMORY 0'+(state.level+1)+' / 已找回';
    $('chapter-title').textContent=WZ.level.name+' · 完成';
    $('chapter-story').textContent=WZ.level.reveal+'\n\n下一层 · '+WZ.levels[nextLevel].name+'\n'+WZ.levels[nextLevel].intro;
    $('chapter-next').firstElementChild.textContent='进入'+WZ.levels[nextLevel].name;
    document.querySelectorAll('.chapter-progress i').forEach((el,i)=>{el.classList.toggle('complete',state.cleared.includes(i));el.classList.toggle('current',i===nextLevel);});
    show('chapter-screen');setMode('chapter');unlock();
  }
  function home(){
    save();unlock();hidePanels();show('home');show('hud',false);setMode('home');state.started=false;WZ.loadLevel(0);state.level=0;state.objects=WZ.createObjects();Object.assign(state.player,{torch:true,hidden:false});renderer.makeTextures();nextLevel=null;updateHome();
  }
  function pause(){if(state.mode!=='playing')return;save();setMode('paused');show('pause');unlock();}
  function resume(){show('pause',false);setMode('playing');lock();}
  function restart(){loadLevel(state.level);hidePanels();show('hud');show('touch-controls',isTouch);setMode('playing');save();lock();subtitle('从这一层重新出发。团子也准备好了。');}
  function recover(){show('ending',false);resetPlayer();show('hud');setMode('playing');save();lock();subtitle('已回到入口。收集进度都还在，继续慢慢探索吧。');}
  function openSettings(){settingsOrigin=state.mode;if(state.mode==='playing')pause();show('settings');setMode('settings');unlock();}
  function closeSettings(){show('settings',false);if(settingsOrigin==='playing'){show('pause',false);setMode('playing');lock();}else setMode(settingsOrigin);}
  function toggleMap(){if(state.mode==='map'){show('map-screen',false);setMode('playing');lock();return;}if(state.mode!=='playing')return;$('map-screen').querySelector('h2').textContent='0'+(state.level+1)+' / '+WZ.area(state.player.x,state.player.y);renderer.drawMap(state);show('map-screen');setMode('map');unlock();}
  function closeNote(){show('note-screen',false);setMode('playing');lock();}
  function formatTime(t){return String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');}
  function stats(){
    $('ending-stats').replaceChildren();
    for(const[value,label]of[[formatTime(state.elapsed),'探索时间'],[state.cleared.length+' / 4','完成章节'],[String(state.notes),'已读便签']]){const d=document.createElement('div');d.textContent=value;const small=document.createElement('small');small.textContent=label;d.append(small);$('ending-stats').append(d);}
  }
  function caught(){
    setMode('caught');unlock();show('hud',false);show('ending');audio.suspend(false);audio.hug();
    $('ending-kicker').textContent='HIGH FIVE / 团子的小游戏';$('ending-title').textContent='团子找到你啦。';
    $('ending-description').textContent='它伸出软软的爪子，和你击了个掌。\n回到本层入口继续探索；收集到的东西都会保留。';
    $('ending-restart').firstElementChild.textContent='回到本层入口';stats();save();
  }
  function finish(){
    save();setMode('won');unlock();show('hud',false);show('ending');WZ.storage.set('progress.v2',null);
    const best=WZ.storage.get('best.v2',null);if(state.cleared.length===4&&(best===null||state.elapsed<best))WZ.storage.set('best.v2',state.elapsed);
    $('ending-kicker').textContent='THE WAY HOME / 约定已找回';$('ending-title').textContent='一起回家。';
    $('ending-description').textContent=WZ.level.reveal+'\n\n门外，小满朝你挥手。你抱起团子，走进了早晨的阳光。\n这一次，你们一起下班。';$('ending-restart').firstElementChild.textContent='重新开始四章旅程';stats();
  }
  function updateHome(){const value=checkpoint();show('continue-game',!!value);if(value)$('continue-game').textContent='继续第 '+(value.level+1)+' 章 · '+WZ.levels[value.level].name+' ↗';const best=WZ.storage.get('best.v2',null);$('best-record').textContent=best===null?'温和测试版 / 四张地图均可直接选择':'最短归途 / '+formatTime(best);}
  function updateHUD(){
    $('fuse-count').textContent=state.fuses+' / 3';$('fuse-progress').querySelectorAll('i').forEach((el,i)=>el.classList.toggle('found',i<state.fuses));
    $('objective-text').textContent=state.power?WZ.level.exitName:state.fuses===3?'前往'+WZ.level.stationName:WZ.level.objective;
    $('stamina-fill').style.width=state.player.stamina+'%';$('posture').textContent=state.player.hidden?'躲藏':state.player.crouch?'蹲行':state.moveAmount>1.1?'小跑':'漫步';
    if(lastTorch!==state.player.torch){lastTorch=state.player.torch;$('torch-state').innerHTML=(lastTorch?'◉ 手电开启':'○ 环境照明')+' <kbd>F</kbd>';}
    $('area-name').textContent='0'+(state.level+1)+' / '+WZ.area(state.player.x,state.player.y);
  }
  function target(){
    const p=state.player;if(p.hidden)return{type:'unhide',label:'离开储物柜'};let best=1.6,found=null;
    for(const obj of state.objects){if(obj.taken||!obj.label)continue;const d=WZ.distance(p,obj),angle=Math.abs(WZ.angleDiff(Math.atan2(obj.y-p.y,obj.x-p.x),p.angle));if(d<best&&angle<.85&&WZ.lineOfSight(p,obj)){best=d;found=obj;}}return found;
  }
  function interact(){
    if(state.mode==='note'){closeNote();return;}if(state.mode!=='playing')return;const item=target();if(!item)return;
    if(item.type==='fuse'){
      if(WZ.level.ordered&&item.order!==state.fuses){state.objects.filter(o=>o.type==='fuse').forEach(o=>o.taken=false);state.fuses=0;audio.click();subtitle('顺序要从 ① 开始：① → ② → ③。阀门已复位，可以再试一次。',6);}
      else{item.taken=true;state.fuses++;audio.pickup();subtitle(WZ.level.collectText[item.order]+(state.fuses===3?' 去'+WZ.level.stationName+'吧。':''),6);}save();updateHUD();
    }else if(item.type==='generator'){
      if(state.power){subtitle('通路已经打开。'+WZ.level.exitName+'吧。');return;}
      if(state.fuses<3){subtitle('还需要 '+(3-state.fuses)+' 个'+WZ.level.itemName+'。查看地图可以找到它们。');audio.click();return;}
      state.power=true;audio.power();subtitle('通路已打开。'+WZ.level.exitName+'。',6);save();updateHUD();
    }else if(item.type==='exit'){
      if(state.power)completeLevel();else subtitle('先完成本层任务，再启动'+WZ.level.stationName+'。不着急，团子陪着你。',5);
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
  function updateEnemy(dt){
    const e=state.enemy,p=state.player,dist=WZ.distance(e,p),visible=WZ.lineOfSight(e,p);
    if(state.levelElapsed<8)return;
    const sees=!p.hidden&&visible&&dist<(p.torch?5.7:p.crouch?2:3.5),hears=!p.hidden&&state.moveAmount>1.1&&dist<7;
    if(sees||hears){if(e.mode!=='chase'){state.chases++;subtitle('团子蹦蹦跳跳地过来了。它想找你击掌。',4);}e.mode='chase';e.memory=3.5;e.target={x:p.x,y:p.y};}
    else if(e.mode==='chase'){e.memory-=dt;if(e.memory<=0){e.mode='patrol';e.target=null;e.path=[];e.repath=0;}}
    const patrol=WZ.level.patrol;if(e.mode==='patrol'&&(!e.target||WZ.distance(e,e.target)<.45)){const candidate=patrol[e.waypoint++%patrol.length];
      e.target=WZ.canStand(candidate.x,candidate.y,.22)?candidate:[[.8,0],[-.8,0],[0,.8],[0,-.8],[1.2,0],[-1.2,0]].map(([x,y])=>({x:candidate.x+x,y:candidate.y+y})).find(q=>WZ.canStand(q.x,q.y,.22));
      e.repath=0;}
    e.repath-=dt;if(e.repath<=0&&e.target){e.path=WZ.findPath(e,e.target);e.repath=e.mode==='chase'?.45:1.1;}
    const point=e.path[0]||(e.mode==='chase'&&visible?e.target:null);
    WZ.settle(e,dt);
    if(point){const d=WZ.distance(e,point),speed=e.mode==='chase'?1.65:.85;if(d<.12)e.path.shift();else{const step=Math.min(d,speed*dt);WZ.move(e,(point.x-e.x)/d*step,(point.y-e.y)/d*step,.2);}}
    enemyStepTimer-=dt;if(enemyStepTimer<=0){enemyStepTimer=.6;if(dist<9)audio.enemyStep(Math.sin(Math.atan2(e.y-p.y,e.x-p.x)-p.angle),Math.max(0,1-dist/9));}
    $('danger-label').classList.toggle('visible',dist<7&&visible);$('danger-label').lastElementChild.textContent=e.mode==='chase'?'团子想和你击掌':'团子在附近散步';
    if(dist<.6&&Math.abs((e.elevation||0)-(p.elevation||0))<1&&visible&&!p.hidden)caught();
  }
  function update(dt){
    if(state.mode!=='playing')return;state.elapsed+=dt;state.levelElapsed+=dt;
    if(subtitleTimer>0){subtitleTimer-=dt;if(subtitleTimer<=0)$('subtitle').classList.remove('visible');}
    const p=state.player;WZ.settle(p,dt);viewInput.apply(p,dt,WZ.settings.sensitivity);if(keys.has('ArrowLeft'))p.angle-=dt*1.9;if(keys.has('ArrowRight'))p.angle+=dt*1.9;if(p.hidden){p.angle=p.hideAngle+WZ.clamp(WZ.angleDiff(p.angle,p.hideAngle),-1.1,1.1);p.pitch=WZ.clamp(p.pitch,-.4,.4);}
    let forward=(keys.has('KeyW')||keys.has('ArrowUp')?1:0)-(keys.has('KeyS')||keys.has('ArrowDown')?1:0)+touch.forward,strafe=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0)+touch.strafe;
    const len=Math.hypot(forward,strafe);if(len>1){forward/=len;strafe/=len;}p.crouch=touch.crouch||keys.has('KeyC')||keys.has('ControlLeft')||keys.has('ControlRight');
    if(p.stamina<2)p.exhausted=true;else if(p.stamina>25)p.exhausted=false;
    const sprint=(touch.sprint||keys.has('ShiftLeft')||keys.has('ShiftRight'))&&!p.crouch&&!p.exhausted&&!p.hidden&&len>.05,speed=sprint?5.8:p.crouch?1.7:3.5,oldX=p.x,oldY=p.y;
    if(!p.hidden)WZ.move(p,(Math.cos(p.angle)*forward-Math.sin(p.angle)*strafe)*speed*dt,(Math.sin(p.angle)*forward+Math.cos(p.angle)*strafe)*speed*dt);
    const moved=Math.hypot(p.x-oldX,p.y-oldY)>dt*.1;state.moveAmount=moved?(sprint?1.5:p.crouch?.35:1):0;p.stamina=WZ.clamp(p.stamina+(sprint&&moved?-24:22)*dt,0,100);
    if(moved){state.walkPhase+=dt*(sprint?12:p.crouch?5:8);stepTimer-=dt;if(stepTimer<=0){audio.step(sprint,p.crouch);stepTimer=sprint?.32:p.crouch?.8:.5;}}else stepTimer=0;
    const item=target();show('interaction',!!item);$('crosshair').classList.toggle('active',!!item);if(item)$('interaction-text').textContent=item.label;
    updateEnemy(dt);hudTimer-=dt;if(hudTimer<=0){updateHUD();hudTimer=.08;}
  }
  function frame(now){const dt=Math.min(.045,(now-last)/1000);last=now;update(dt);renderer.render(state,now/1000);requestAnimationFrame(frame);}
  $('start').onclick=()=>start(0);$('help-start').onclick=()=>start(0);$('continue-game').onclick=()=>{const value=checkpoint();if(value)start(value.level,value);};
  $('chapter-next').onclick=enterChapter;$('chapter-home').onclick=home;$('chapters-open').onclick=()=>show('chapter-select');$('chapter-select-close').onclick=()=>show('chapter-select',false);
  WZ.levels.forEach((level,i)=>{const b=document.createElement('button');b.className='chapter-card';const a=document.createElement('small');a.textContent='CHAPTER 0'+(i+1);const title=document.createElement('strong');title.textContent=level.name;const sub=document.createElement('span');sub.textContent=level.chapter;b.append(a,title,sub);b.onclick=()=>start(i);$('chapter-list').append(b);});
  $('resume').onclick=resume;$('restart').onclick=restart;$('return-home').onclick=home;$('ending-home').onclick=home;$('ending-restart').onclick=()=>state.mode==='won'?start(0):recover();$('pause-button').onclick=pause;
  $('help-open').onclick=()=>show('help');$('settings-open').onclick=openSettings;$('pause-settings').onclick=openSettings;$('settings-done').onclick=closeSettings;$('map-close').onclick=toggleMap;$('map-button').onclick=toggleMap;$('note-close').onclick=closeNote;$('note-done').onclick=closeNote;
  document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>b.dataset.close==='settings'?closeSettings():show(b.dataset.close,false));
  function applySettings(){const s=WZ.settings;document.documentElement.style.setProperty('--brightness',s.brightness/100);document.querySelector('.grain').style.display=s.grain?'':'none';audio.volume(s.volume);WZ.storage.set('settings',s);}
  for(const name of['volume','brightness','sensitivity']){const el=$(name);el.value=WZ.settings[name];$(name+'-value').textContent=el.value+'%';el.oninput=()=>{WZ.settings[name]=Number(el.value);$(name+'-value').textContent=el.value+'%';applySettings();};}
  $('grain-toggle').checked=WZ.settings.grain;$('grain-toggle').onchange=e=>{WZ.settings.grain=e.target.checked;applySettings();};
  window.addEventListener('keydown',e=>{
    if(e.target instanceof HTMLInputElement)return;
    if(['Tab','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)||(state.mode==='playing'&&['KeyW','KeyA','KeyS','KeyD','ControlLeft','ControlRight'].includes(e.code)))e.preventDefault();
    if(e.repeat)return;
    if(e.code==='Escape'){
      if(!$('help').hidden){show('help',false);return;}if(!$('chapter-select').hidden){show('chapter-select',false);return;}
      if(state.mode==='settings')closeSettings();else if(state.mode==='map')toggleMap();else if(state.mode==='note')closeNote();else if(state.mode==='paused')resume();else if(state.mode==='playing')pause();return;
    }
    if(e.code==='Tab'||e.code==='KeyM'){toggleMap();return;}if(e.code==='KeyE'){interact();return;}if(e.code==='KeyF'){torch();return;}if(state.mode==='playing')keys.add(e.code);
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
  document.querySelectorAll('[data-action]').forEach(b=>{const action=b.dataset.action;b.onpointerdown=e=>{e.preventDefault();if(action==='sprint'){touch.sprint=true;b.setPointerCapture(e.pointerId);}else if(action==='interact')interact();else if(action==='torch')torch();else if(action==='map')toggleMap();else if(action==='crouch'){touch.crouch=!touch.crouch;b.classList.toggle('active',touch.crouch);}};if(action==='sprint')b.onpointerup=b.onpointercancel=()=>touch.sprint=false;});
  window.addEventListener('pagehide',save);document.addEventListener('contextmenu',e=>e.preventDefault());applySettings();updateHome();requestAnimationFrame(frame);
  return{state,renderer,audio,input:viewInput,start,pause,resume,home,interact,toggleMap,formatTime,save};
})();
