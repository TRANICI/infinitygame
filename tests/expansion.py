"""Browser checks for the clinical wing, shortcuts, pursuit and map rendering."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
URL=os.environ.get('WARD_TEST_URL',(ROOT/'index.html').as_uri())

def use(p,oid):
    for dx,dy in [(0,.95),(0,-.95),(.95,0),(-.95,0)]:
        if p.evaluate("""([id,dx,dy])=>{const o=game.state.objects.find(o=>o.id===id);if(!WZ.canStand(o.x+dx,o.y+dy,.25,o.baseY))return false;
            Object.assign(game.state.player,{x:o.x+dx,y:o.y+dy,elevation:o.baseY,eyeElevation:o.baseY,verticalSpeed:0,hidden:false,angle:Math.atan2(-dy,-dx),pitch:0});game.state.levelElapsed=0;
            return WZ.lineOfSight(game.state.player,o);}""",[oid,dx,dy]):
            p.wait_for_timeout(100)
            if p.locator('#interaction-text').inner_text()==p.evaluate('id=>game.state.objects.find(o=>o.id===id).label',oid):
                p.keyboard.press('e');return
    raise AssertionError('Cannot interact with '+oid)

with sync_playwright() as pw:
    b=pw.chromium.launch(headless=True,channel='chrome')
    p=b.new_page(viewport={'width':1440,'height':900});errors=[]
    p.on('pageerror',lambda e:errors.append(str(e)))
    p.add_init_script("document.addEventListener('mousemove',e=>{if(e.isTrusted)e.stopImmediatePropagation()},true)")
    p.goto(URL);p.wait_for_load_state('networkidle');p.click('#start');p.click('#chapter-next')
    p.evaluate("game.state.power=true;game.state.mission.relay=true;game.investigation.sync()")
    use(p,'clinical-keypad');p.locator('#puzzle-code').fill('0217');p.get_by_role('button',name='确认门禁',exact=True).click();p.click('#puzzle-done')
    assert p.evaluate("game.state.objects.filter(o=>['clinical-gate','annex-gate'].includes(o.id)).every(o=>!o.collide)")
    use(p,'service-release');assert p.evaluate("game.state.objects.find(o=>o.id==='service-gate').collide")
    use(p,'laundry-valve');use(p,'service-release');assert not p.evaluate('game.state.mission.service')
    use(p,'pump-valve');use(p,'service-release');assert p.evaluate('game.state.mission.service')
    use(p,'annex-call');assert p.evaluate('game.state.enemy.lureTime>0&&game.state.enemy.lure.x===187')
    for oid in ['staff-note','ward-note','pump-note','observation-note']:
        use(p,oid);assert p.locator('#puzzle-screen').is_visible();p.click('#puzzle-done')
    for oid in ['staff-locker','treatment-locker','laundry-locker','storage-locker','atrium-locker']:
        use(p,oid);assert p.evaluate('game.state.player.hidden');p.keyboard.press('e');assert not p.evaluate('game.state.player.hidden')
    p.evaluate('game.save();game.home()');p.click('#continue-game');p.click('#chapter-next')
    assert p.evaluate("game.state.mission.service&&game.state.mission.valves.length===2&&!game.state.objects.find(o=>o.id==='service-gate').collide")
    print('PASS: north door, dual valves, service shortcut, lure, all new clues/lockers and save restore')

    # A new chase must replace an old patrol path immediately, even if its timer has not expired.
    p.evaluate("""()=>{const g=game.state;Object.assign(g.player,{x:182,y:45,angle:0,elevation:4.68,hidden:false,torch:true});
        Object.assign(g.enemy,{x:185,y:45,elevation:4.68,mode:'patrol',path:[{x:187,y:45}],target:{x:187,y:45},repath:3,lureTime:0,collisionVersion:WZ.collisionVersion,patrolZone:'archive'});
        g.mission.entered=true;g.levelElapsed=9;}""")
    p.wait_for_timeout(250)
    assert p.evaluate("game.state.enemy.mode==='chase'&&game.state.enemy.x<184.8"),p.evaluate('game.state.enemy')
    # Known hiding spots stop updates of the chase target and let its memory expire.
    p.evaluate("game.state.player.hidden=true;game.state.enemy.memory=.05;game.state.enemy.lureTime=0")
    p.wait_for_timeout(150);assert p.evaluate("game.state.enemy.mode==='patrol'")
    assert p.evaluate("game.state.enemy.target.x>=120&&game.state.enemy.patrolZone==='archive'")
    print('PASS: immediate chase repath, hiding breaks pursuit, archive patrol activated')

    p.evaluate("game.state.mode='preview';game.state.player.hidden=false;document.exitPointerLock()")
    for name,x,y,a in [('ward',160,34,-1.57),('atrium',184,55,-1.85),('laundry',203,54,3.14),('pump',188,64,.6),('clinical-hall',167,40,3.14)]:
        p.evaluate("""([x,y,a])=>Object.assign(game.state.player,{x,y,angle:a,pitch:-.06,elevation:4.68,eyeElevation:4.68})""",[x,y,a])
        p.wait_for_timeout(120);p.screenshot(path=str(OUT/f'expansion-{name}.png'))
    p.evaluate("game.state.mode='playing';game.toggleMap()")
    p.screenshot(path=str(OUT/'expansion-map.png'))
    p.locator('[data-map-focus="annex"]').click();p.screenshot(path=str(OUT/'expansion-map-annex.png'))
    assert p.evaluate("Object.values(game.renderer.tiles).every(t=>t.every(v=>v>=0&&v<=1))")
    assert p.evaluate('game.renderer.gl.getError()')==0
    # Verify the map omits open gate bodies, using its real canvas drawing operations.
    assert p.evaluate("""()=>{const ctx=document.querySelector('#map-canvas').getContext('2d'),original=ctx.fillRect,calls=[];
      ctx.fillRect=function(...args){calls.push(args);return original.apply(this,args)};
      try{game.renderer.drawMap(game.state);const open=calls.length;calls.length=0;
        const gates=game.state.objects.filter(o=>o.type==='gate'&&o.activated);gates.forEach(o=>o.activated=false);game.renderer.drawMap(game.state);
        const closed=calls.length;gates.forEach(o=>o.activated=true);return closed-open===gates.length;
      }finally{ctx.fillRect=original;game.renderer.drawMap(game.state);}}""")
    mobile=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    mp=mobile.new_page();mp.on('pageerror',lambda e:errors.append(str(e)));mp.goto(URL);mp.wait_for_load_state('networkidle');mp.click('#start');mp.click('#chapter-next');mp.locator('#map-button').tap()
    assert mp.locator('.map-panel').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
    mp.locator('[data-map-focus="annex"]').tap()
    assert mp.locator('[data-map-focus="annex"]').get_attribute('aria-pressed')=='true'
    assert mp.locator('#map-rooms span').count()==14
    mp.screenshot(path=str(OUT/'expansion-mobile-map.png'))
    assert not errors,errors
    print('PASS: room previews, atlas bounds, WebGL, open gates on map, mobile map and no runtime errors')
    b.close()
