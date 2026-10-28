"""Horror investigation regression. Headless DOM calls only; never capture the mouse."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
URL=os.environ.get('WARD_TEST_URL',(ROOT/'index.html').as_uri())
SAFE="Element.prototype.requestPointerLock=()=>Promise.resolve();document.exitPointerLock=()=>{};"
def click(p,selector):p.evaluate('s=>document.querySelector(s).click()',selector)
def action(p,label):p.evaluate('t=>[...document.querySelectorAll("#puzzle-body button")].find(b=>b.textContent===t).click()',label)
def use(p,oid):
    for dx,dy in [(1,0),(-1,0),(0,1),(0,-1),(1.5,0),(-1.5,0),(0,1.5),(0,-1.5)]:
        if not p.evaluate('''([id,dx,dy])=>{const o=game.state.objects.find(o=>o.id===id),p=game.state.player;
          if(!WZ.canStand(o.x+dx,o.y+dy,.25,o.baseY))return false;
          Object.assign(p,{x:o.x+dx,y:o.y+dy,elevation:o.baseY,eyeElevation:o.baseY,verticalSpeed:0,angle:Math.atan2(-dy,-dx),pitch:0,hidden:false});
          return WZ.lineOfSight(p,o)}''',[oid,dx,dy]):continue
        p.wait_for_timeout(120)
        if p.locator('#interaction-text').inner_text()==p.evaluate('id=>game.state.objects.find(o=>o.id===id).label',oid):
            p.evaluate('game.interact()');return
    raise AssertionError('No selectable target '+oid)
def close(p):click(p,'#puzzle-done')

with sync_playwright() as pw:
    b=pw.chromium.launch(headless=True,channel='chrome');p=b.new_page(viewport={'width':1440,'height':900});p.add_init_script(SAFE)
    errors=[];requests=[];p.on('pageerror',lambda e:errors.append(str(e)));p.on('request',lambda r:requests.append(r.url))
    p.goto(URL);p.wait_for_load_state('networkidle');p.screenshot(path=str(OUT/'horror-menu.png'));click(p,'#start')
    assert '林秋' in p.locator('#chapter-story').inner_text();click(p,'#chapter-next')
    use(p,'shift-safe');action(p,'核对并开柜');assert not p.evaluate('game.interactions.has("crowbar")')
    for index,count in enumerate([3,1,7]):
        for n in range(count):action(p,f'第 {index+1} 位：{n}')
    action(p,'核对并开柜');assert p.evaluate('game.state.exploration.inventory.crowbar===1');p.screenshot(path=str(OUT/'horror-tool-puzzle.png'));close(p)
    use(p,'well-pump');action(p,'小阀 +1：关');action(p,'大阀 +3：关');action(p,'启动排水');assert p.evaluate('game.interactions.has("motor-fuse")');close(p)
    use(p,'workshop-tools');action(p,'搜索并收进背包');close(p)
    use(p,'decon-boards');p.screenshot(path=str(OUT/'horror-board-dialog.png'));action(p,'用撬棍拆木板');close(p)
    use(p,'decon-gate');action(p,'换保险芯 · 修复大门');close(p)
    assert p.evaluate('!game.state.objects.find(o=>o.id==="decon-gate").collide')
    p.evaluate('Object.assign(game.state.player,{x:70,y:61.5,elevation:4.68,eyeElevation:4.68,angle:0,pitch:0})');p.wait_for_timeout(120);p.screenshot(path=str(OUT/'horror-corridor-open.png'))
    use(p,'pharmacy-window');action(p,'用螺丝刀拆窗 · 小声');close(p)
    use(p,'medicine-cabinet');action(p,'每次：1 片');action(p,'每天：1 次');action(p,'每天：2 次');action(p,'核对并开柜');close(p)
    assert p.evaluate('game.state.exploration.inventory.drink===2')
    p.evaluate('game.save();game.home()');click(p,'#continue-game');click(p,'#chapter-next')
    assert p.evaluate('game.state.exploration.broken.length===2&&game.state.exploration.repaired.includes("decon-gate")')
    use(p,'triage-clue');action(p,'抄录异常记录');close(p);click(p,'#inventory-button')
    assert '别再问门外那个人' in p.locator('#puzzle-body').inner_text();close(p)
    # Actual near-object cues and separate static/dynamic meshes.
    p.evaluate('Object.assign(game.state.player,{x:42,y:101,elevation:7.92,eyeElevation:7.92,angle:Math.PI/2,pitch:0})');p.wait_for_timeout(150)
    assert p.evaluate('game.state.nearby.every(v=>WZ.lineOfSight(game.state.player,v.object))')
    click(p,'#map-button');click(p,'[data-map-focus="courtyard"]');p.screenshot(path=str(OUT/'horror-courtyard-map.png'));click(p,'#map-close')
    # Pursuit is covered separately; isolate the deterministic puzzle walkthrough.
    assert p.evaluate('game.state.pursuerEnabled');p.evaluate('game.state.pursuerEnabled=false')
    # Run the main chapter through its real interaction and puzzle handlers.
    for oid in ['item-1','item-2','item-3','station']:use(p,oid)
    use(p,'annex-relay');action(p,'A · 断开');action(p,'C · 断开');action(p,'合闸检验');close(p)
    use(p,'annex-keypad');p.evaluate('document.querySelector("#puzzle-code").value="0217";document.querySelector(".code-form").requestSubmit()');close(p)
    for oid in ['annex-seal-0','annex-seal-1','annex-seal-2']:use(p,oid)
    use(p,'annex-receiver')
    for label in ['日','雨','月']:action(p,label)
    close(p);use(p,'exit');assert p.evaluate('game.state.mode==="won"');assert '02:18' in p.locator('#ending-description').inner_text();p.screenshot(path=str(OUT/'horror-ending.png'))
    assert not any('/design/' in r or 'the-relief' in r for r in requests),'offline concept must never be requested'
    assert p.evaluate('game.renderer.gl.getError()===0&&document.pointerLockElement===null')
    assert not errors,errors
    b.close();print('PASS: field puzzle UI, obstacle repair, save/restore, story ending, WebGL; no concept requests or native mouse capture')
