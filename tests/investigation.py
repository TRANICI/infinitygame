"""Solve the courtyard investigation through actual interaction and dialog controls."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
URL=os.environ.get('WARD_TEST_URL',(ROOT/'index.html').as_uri())

def place(p,oid):
    for dx,dy in [(0,.95),(0,-.95),(.95,0),(-.95,0)]:
        if p.evaluate("""([id,dx,dy])=>{const o=game.state.objects.find(o=>o.id===id);
          if(!WZ.canStand(o.x+dx,o.y+dy,.25,o.baseY))return false;
          Object.assign(game.state.player,{x:o.x+dx,y:o.y+dy,elevation:o.baseY,eyeElevation:o.baseY,verticalSpeed:0,hidden:false,angle:Math.atan2(-dy,-dx),pitch:-.1});game.state.levelElapsed=0;
          return WZ.lineOfSight(game.state.player,o);}""",[oid,dx,dy]):
            p.wait_for_timeout(80)
            if p.locator('#interaction-text').inner_text()==p.evaluate('id=>game.state.objects.find(o=>o.id===id).label',oid):return
    raise AssertionError('Cannot interact: '+oid)

def use(p,oid):place(p,oid);p.keyboard.press('e')
def close(p):p.click('#puzzle-done');assert p.evaluate("game.state.mode==='playing'")
def key(p,label):p.locator('#puzzle-body button').get_by_text(label,exact=True).click()

with sync_playwright() as pw:
    b=pw.chromium.launch(headless=True,channel='chrome');p=b.new_page(viewport={'width':1440,'height':900});errors=[]
    p.on('pageerror',lambda e:errors.append(str(e)))
    p.add_init_script("document.addEventListener('mousemove',e=>{if(e.isTrusted)e.stopImmediatePropagation()},true)")
    p.goto(URL);p.wait_for_load_state('networkidle');assert p.locator('.chapter-card').count()==1
    p.click('#start');p.click('#chapter-next')
    use(p,'annex-keypad');p.locator('#puzzle-code').fill('0217');key(p,'确认门禁')
    assert not p.evaluate('game.state.mission.door');assert '没有供电' in p.locator('#puzzle-message').inner_text()
    p.locator('#puzzle-code').focus();p.keyboard.press('Escape');assert p.evaluate("game.state.mode==='playing'")
    use(p,'annex-relay');key(p,'A · 断开');key(p,'C · 断开');key(p,'合闸检验')
    assert not p.evaluate('game.state.mission.relay');assert '总电源' in p.locator('#puzzle-message').inner_text()
    t=p.evaluate('game.state.elapsed');p.wait_for_timeout(200);assert p.evaluate('game.state.elapsed')==t
    close(p);print('PASS: prerequisite gating, editable switches, paused puzzles, Escape from code input')

    for i in range(1,4):use(p,'item-'+str(i))
    use(p,'station');assert p.evaluate('game.state.power');use(p,'exit');assert p.evaluate("game.state.mode==='playing'")
    for oid in ['annex-note-maintenance','annex-note-clock','annex-note-order']:
        use(p,oid);assert p.locator('#puzzle-screen').is_visible();close(p)
    p.keyboard.press('j');assert p.locator('#puzzle-body details').count()==3
    p.locator('#puzzle-body summary').first.click();assert '两端' in p.locator('#puzzle-body details').first.inner_text()
    p.screenshot(path=str(OUT/'investigation-journal.png'));p.keyboard.press('j')
    use(p,'annex-relay');key(p,'B · 断开');key(p,'合闸检验');assert not p.evaluate('game.state.mission.relay')
    key(p,'B · 接通');key(p,'合闸检验');assert p.evaluate('game.state.mission.relay')
    p.screenshot(path=str(OUT/'investigation-relay.png'));close(p)
    use(p,'annex-keypad');p.locator('#puzzle-code').fill('1234');key(p,'确认门禁');assert not p.evaluate('game.state.mission.door')
    p.locator('#puzzle-code').fill('0217');key(p,'确认门禁');assert p.evaluate('game.state.mission.door')
    assert p.evaluate("!game.state.objects.find(o=>o.id==='annex-gate').collide")
    close(p);print('PASS: real collection, clue journal, wrong circuit, correct circuit, wrong/correct password, physical gate')

    # Resume a partial investigation and preserve the older courtyard collectibles.
    p.evaluate('game.save();game.home()');p.click('#continue-game');p.click('#chapter-next')
    assert p.evaluate('game.state.fuses===3&&game.state.power&&game.state.mission.door&&game.state.mission.relay')
    use(p,'annex-receiver');assert p.get_by_role('button',name='日 · 缺失',exact=True).is_disabled();close(p)
    use(p,'annex-seal-2');use(p,'annex-seal-0');use(p,'annex-seal-1')
    assert p.evaluate('game.state.mission.seals.length')==3
    use(p,'annex-seal-0');assert p.evaluate('game.state.mission.seals.length')==3
    use(p,'annex-receiver')
    for name in ['月','雨','日']:key(p,name)
    assert not p.evaluate('game.state.mission.broadcast');assert '顺序' in p.locator('#puzzle-message').inner_text()
    for name in ['日','雨','月']:key(p,name)
    assert p.evaluate('game.state.mission.broadcast');p.screenshot(path=str(OUT/'investigation-receiver.png'));close(p)
    use(p,'annex-shortcut');assert p.evaluate("game.state.mission.shortcut&&!game.state.objects.find(o=>o.id==='annex-return-gate').collide")
    p.evaluate('game.save();game.home()');p.click('#continue-game');p.click('#chapter-next')
    assert p.evaluate('game.state.mission.broadcast&&game.state.mission.shortcut&&game.state.mission.seals.length===3')
    assert p.evaluate("!game.state.objects.find(o=>o.id==='annex-return-gate').collide")
    p.evaluate('Object.assign(game.state.player,{x:126,y:58,angle:-Math.PI/2,pitch:0,elevation:4.68,eyeElevation:4.68});game.state.levelElapsed=0')
    p.wait_for_timeout(100);p.screenshot(path=str(OUT/'annex-lobby.png'))
    p.evaluate('Object.assign(game.state.player,{x:153,y:59,angle:0,pitch:0,elevation:4.68,eyeElevation:4.68});game.state.levelElapsed=0')
    p.wait_for_timeout(100);p.screenshot(path=str(OUT/'annex-maze.png'))
    use(p,'exit');assert p.evaluate("game.state.mode==='won'&&game.state.cleared.length===1")
    assert p.evaluate("WZ.storage.get('progress.v2',null)===null")
    p.screenshot(path=str(OUT/'single-level-ending.png'));print('PASS: partial/full save reload, stamps, wrong/correct order, shortcut, single-level ending')

    m=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
    mp=m.new_page();mp.on('pageerror',lambda e:errors.append(str(e)));mp.goto(URL);mp.wait_for_load_state('networkidle');mp.click('#start');mp.click('#chapter-next')
    mp.locator('#journal-button').tap();assert mp.locator('#puzzle-screen').is_visible()
    assert mp.locator('.puzzle-panel').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
    mp.screenshot(path=str(OUT/'mobile-journal.png'));mp.locator('#puzzle-done').tap()
    place(mp,'annex-keypad');mp.locator('[data-action="interact"]').tap();mp.locator('#puzzle-code').fill('0217');key(mp,'确认门禁')
    assert not mp.evaluate('game.state.mission.door');assert mp.locator('.puzzle-panel').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
    mp.screenshot(path=str(OUT/'mobile-keypad.png'));mp.locator('#puzzle-done').tap()
    mp.evaluate("game.start(0,{power:true,items:['item-1','item-2','item-3']})");mp.click('#chapter-next')
    assert mp.evaluate('game.state.fuses===3&&game.state.power&&!game.state.mission.broadcast&&!game.state.mission.door')
    print('PASS: mobile journal/keypad, panel layout, legacy courtyard save compatibility')
    assert not errors,errors
    print('PASS: no browser runtime errors');b.close()
