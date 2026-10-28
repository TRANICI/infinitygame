"""DOM-only headless checks. Native pointer lock and mouse input are never used."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
URL=os.environ.get('WARD_TEST_URL',(ROOT/'index.html').as_uri())
SAFE="""window.blockedPointerRequests=0;Element.prototype.requestPointerLock=function(){window.blockedPointerRequests++;return Promise.resolve()};document.exitPointerLock=()=>{};"""
def click(p,selector):p.evaluate('s=>document.querySelector(s).click()',selector)
def action(p,text):p.evaluate('t=>[...document.querySelectorAll("#puzzle-body button")].find(b=>b.textContent===t).click()',text)
def use(p,oid):
    assert p.evaluate("""id=>{const o=game.state.objects.find(o=>o.id===id);for(const[dx,dy]of[[0,1],[0,-1],[1,0],[-1,0]]){
      if(!WZ.canStand(o.x+dx,o.y+dy,.25,o.baseY))continue;
      Object.assign(game.state.player,{x:o.x+dx,y:o.y+dy,elevation:o.baseY,eyeElevation:o.baseY,verticalSpeed:0,angle:Math.atan2(-dy,-dx),pitch:0,hidden:false});game.state.levelElapsed=0;
      if(WZ.lineOfSight(game.state.player,o)){game.interact();return true;}}
      return false;}""",oid),oid

with sync_playwright() as pw:
    b=pw.chromium.launch(headless=True,channel='chrome');p=b.new_page(viewport={'width':1440,'height':900});p.add_init_script(SAFE);errors=[]
    p.on('pageerror',lambda e:errors.append(str(e)));p.goto(URL);p.wait_for_load_state('networkidle');click(p,'#start');click(p,'#chapter-next')
    assert p.evaluate('document.pointerLockElement===null')
    use(p,'room-door-gatehouse');assert p.evaluate("game.state.exploration.opened.includes('room-door-gatehouse')")
    use(p,'gatehouse-drawer');action(p,'搜索并收进背包');assert p.evaluate('game.state.exploration.inventory.coin===2');p.screenshot(path=str(OUT/'room-search.png'));click(p,'#puzzle-done')
    for oid in ['supply-drawer','workshop-tools','booth-wire']:
        use(p,oid);action(p,'搜索并收进背包');click(p,'#puzzle-done')
    use(p,'room-door-booth');assert p.evaluate("game.state.exploration.unlocked.includes('room-door-booth')")
    use(p,'dispatch-radio');action(p,'安装线材 · 使用螺丝刀');action(p,'呼叫 · 候诊庭院');assert p.evaluate('game.state.enemy.lureTime===8');p.screenshot(path=str(OUT/'room-radio.png'));click(p,'#puzzle-done')
    use(p,'cafe-vendor');action(p,'投入 1 枚硬币 · 购买汽水');click(p,'#puzzle-done');p.evaluate('game.state.player.stamina=40');click(p,'#inventory-button');action(p,'喝汽水 · 恢复体力')
    assert p.evaluate('game.state.player.stamina===100&&game.state.exploration.inventory.bottle===3');p.screenshot(path=str(OUT/'room-inventory.png'));click(p,'#puzzle-done')
    p.evaluate("Object.assign(game.state.player,{x:26,y:27,elevation:4.68,angle:0});game.state.levelElapsed=0");click(p,'#throw-button');assert p.evaluate('game.state.exploration.inventory.bottle===2')
    use(p,'scene-garden-board');action(p,'抄录异常记录');click(p,'#puzzle-done')
    p.evaluate('game.save();game.home()');click(p,'#continue-game');click(p,'#chapter-next');assert p.evaluate("game.state.exploration.repaired.includes('dispatch-radio')&&game.state.exploration.inspected.includes('scene-garden-board')")
    click(p,'#map-button');click(p,'[data-map-focus="courtyard"]');p.screenshot(path=str(OUT/'courtyard-rooms-map.png'));click(p,'#map-close')
    p.evaluate("game.state.mode='preview';for(const o of game.state.objects.filter(o=>o.type==='room-door')){o.activated=true;o.collide=false;}WZ.refreshCollision()")
    for name,x,y,h,a in [('gatehouse',45.5,116,7.92,-1.57),('records',67,38,1.62,-.6),('courtyard',27,27,4.68,3.14)]:
        p.evaluate('v=>Object.assign(game.state.player,v)',{'x':x,'y':y,'elevation':h,'eyeElevation':h,'angle':a,'pitch':-.07});p.wait_for_timeout(80);p.screenshot(path=str(OUT/f'room-preview-{name}.png'))
    assert p.evaluate('game.renderer.gl.getError()===0')
    assert p.evaluate("""()=>{const g=game.state,r=game.renderer;g.mission.door=false;game.investigation.sync();r.render(g,0);
      const count=r.interactives.count,buffer=r.world.buffer;g.mission.door=true;game.investigation.sync();r.render(g,0);
      return r.interactives.count<count&&r.world.buffer===buffer;}"""),'opened gates disappear from dynamic geometry'
    assert p.evaluate('Object.values(game.renderer.tiles).every(t=>t.every(v=>v>=0&&v<=1))')
    mobile=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);mp=mobile.new_page();mp.add_init_script(SAFE);mp.on('pageerror',lambda e:errors.append(str(e)));mp.goto(URL);mp.wait_for_load_state('networkidle');click(mp,'#start');click(mp,'#chapter-next');click(mp,'#inventory-button')
    assert mp.locator('.puzzle-panel').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
    assert mp.locator('#inventory-button').evaluate('e=>getComputedStyle(e).pointerEvents')=='auto'
    mp.screenshot(path=str(OUT/'room-mobile-inventory.png'));click(mp,'#puzzle-done');mp.screenshot(path=str(OUT/'room-mobile-hud.png'))
    assert mp.locator('.hud-top').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
    assert not errors,errors
    assert p.evaluate('document.pointerLockElement===null') and mp.evaluate('document.pointerLockElement===null')
    b.close();print('PASS: DOM interactions, inventory, keys, repair, purchases, drinking, throwing, inspection, saves, WebGL, map and mobile; native pointer lock disabled')
