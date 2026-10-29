"""Real browser inputs, WebAudio signal, landscape rotation, and shipped static build.
Run: python tests/fps-ui.py [base URL or file URI]
Chrome and Python Playwright are required. Pointer lock is stubbed in headless mode;
these checks do not capture the operating-system mouse.
"""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'test-results'
OUT.mkdir(exist_ok=True)
URL = sys.argv[1] if len(sys.argv) > 1 else (ROOT / 'dist/index.html').as_uri()

def ready(page):
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.add_init_script('Element.prototype.requestPointerLock=()=>Promise.resolve();document.exitPointerLock=()=>{};')
    page.goto(URL, wait_until='networkidle')
    page.wait_for_function('window.arena && arena.renderer.world.count > 0')
    return errors

def live(page):
    page.wait_for_function('arena.match.mode === "live"')
    assert page.evaluate('arena.match.actors.length') == 10

def touch_point(page, selector):
    box = page.locator(selector).bounding_box()
    return {'x': box['x'] + box['width']/2, 'y': box['y'] + box['height']/2}

with sync_playwright() as pw:
    browser = pw.chromium.launch(headless=True, channel='chrome')
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    errors = ready(page)
    page.screenshot(path=str(OUT / 'dustline-menu.png'))
    page.locator('#start').click()
    live(page)
    page.screenshot(path=str(OUT / 'dustline-rifle.png'))
    # Stop bots only for repeatable player-input assertions; full AI match is tested in fps.cjs.
    page.evaluate('arena.savedBot=arena.match.bot;arena.match.bot=()=>{}')
    pos = page.evaluate('({x:arena.match.player.x,y:arena.match.player.y})')
    page.keyboard.down('KeyW')
    page.wait_for_timeout(450)
    page.keyboard.up('KeyW')
    assert page.evaluate('(p)=>Math.hypot(arena.match.player.x-p.x,arena.match.player.y-p.y)', pos) > .5
    page.mouse.move(640, 430)
    page.mouse.down()
    page.wait_for_timeout(480)
    page.mouse.up()
    count = page.evaluate('arena.match.player.ammo.rifle')
    assert 22 <= count < 30, count
    page.keyboard.press('KeyR')
    page.wait_for_function('arena.match.player.reloading>0')
    page.wait_for_function('arena.match.player.reloading<=0')
    assert page.evaluate('arena.match.player.ammo.rifle') == 30
    page.keyboard.press('Digit3')
    page.wait_for_timeout(250)
    for index in range(3):
        page.keyboard.press('KeyF')
        page.wait_for_function('(i)=>arena.match.inspection?.index===i', arg=index)
        page.wait_for_timeout(600)
        page.screenshot(path=str(OUT / f'dustline-knife-{index+1}.png'))
    page.mouse.down()
    page.wait_for_timeout(100)
    page.mouse.up()
    assert page.evaluate('arena.match.inspection === null')
    # Probe the actual output bus rather than relying only on event counters.
    signal = page.evaluate('''async()=>{const a=arena.audio;await a.unlock();const analyser=a.ctx.createAnalyser();analyser.fftSize=512;a.bus.connect(analyser);let peak=0;for(const kind of ['rifle','pistol','step','flip','slash']){a.play(kind,arena.match.player);for(let i=0;i<6;i++){await new Promise(r=>setTimeout(r,12));const data=new Float32Array(analyser.fftSize);analyser.getFloatTimeDomainData(data);peak=Math.max(peak,...data.map(Math.abs));}}a.bus.disconnect(analyser);return {peak,state:a.ctx.state};}''')
    assert signal['peak'] > .005 and signal['state'] == 'running', signal
    page.keyboard.press('Escape')
    assert page.locator('#pause').is_visible()
    timer = page.evaluate('arena.match.time')
    page.wait_for_timeout(250)
    assert page.evaluate('arena.match.time') == timer
    page.locator('#resume').click()
    page.keyboard.down('Tab')
    assert page.locator('#scoreboard').is_visible()
    assert page.locator('#scoreboard tbody tr').count() == 10
    page.keyboard.up('Tab')
    assert page.locator('#scoreboard').is_hidden()
    # Death/spectator UI, round reset, and the final result screen.
    page.evaluate('arena.match.damage(arena.match.player,100,arena.match.actors[5])')
    page.wait_for_function('!document.querySelector("#spectator").hidden')
    assert page.evaluate('arena.match.view().id') != 0
    page.locator('#next-spectator').click()
    page.evaluate('arena.match.score=[4,0];arena.match.endRound(0,"test")')
    page.wait_for_function('!document.querySelector("#finish").hidden')
    page.screenshot(path=str(OUT / 'dustline-result.png'))
    page.locator('#again').click()
    assert page.evaluate('arena.match.round') == 1
    assert page.evaluate('arena.match.score.join()') == '0,0'
    assert not errors, errors
    assert page.evaluate('arena.renderer.gl.getError()') == 0
    desktop_report = {'audio': signal, 'errors': errors}
    page.close()

    ctx = browser.new_context(viewport={'width': 393, 'height': 852}, is_mobile=True, has_touch=True, device_scale_factor=1)
    page = ctx.new_page()
    errors = ready(page)
    assert page.evaluate('ArenaViewport.rotated')
    assert page.evaluate('ArenaViewport.size.width > ArenaViewport.size.height')
    page.screenshot(path=str(OUT / 'dustline-mobile-menu.png'))
    page.locator('#start').tap()
    live(page)
    page.evaluate('arena.match.bot=()=>{}')
    # Real CDP multitouch: drag the movement stick and hold fire simultaneously.
    cdp = ctx.new_cdp_session(page)
    stick = touch_point(page, '#joystick')
    fire = touch_point(page, '#touch-fire')
    def send(kind, points):
        cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': points})
    pos = page.evaluate('({x:arena.match.player.x,y:arena.match.player.y})')
    send('touchStart', [{'id': 1, **stick}])
    moved = {'x': stick['x'] + 30, 'y': stick['y']}  # physical right = logical forward in portrait
    send('touchMove', [{'id': 1, **moved}])
    send('touchStart', [{'id': 1, **moved}, {'id': 2, **fire}])
    page.wait_for_timeout(500)
    send('touchEnd', [])
    assert page.evaluate('(p)=>Math.hypot(arena.match.player.x-p.x,arena.match.player.y-p.y)', pos) > .5
    assert page.evaluate('arena.match.player.ammo.rifle') < 30
    assert page.evaluate('!arena.input.fire && arena.input.joy.x===0 && arena.input.joy.y===0')
    # Look direction also follows the inverse rotation.
    angle = page.evaluate('arena.match.player.angle')
    send('touchStart', [{'id': 3, 'x': 220, 'y': 460}])
    send('touchMove', [{'id': 3, 'x': 220, 'y': 500}])
    send('touchEnd', [])
    assert page.evaluate('arena.match.player.angle') > angle
    page.locator('[data-weapon="knife"]').tap()
    for i in range(3):
        page.locator('#touch-inspect').tap()
        page.wait_for_function('(i)=>arena.match.inspection?.index===i', arg=i)
    page.wait_for_timeout(450)
    page.screenshot(path=str(OUT / 'dustline-mobile-knife.png'))
    for size in [{'width': 852, 'height': 393}, {'width': 393, 'height': 852}, {'width': 667, 'height': 375}, {'width': 320, 'height': 568}]:
        page.set_viewport_size(size)
        page.wait_for_timeout(180)
        assert page.evaluate('ArenaViewport.size.width > ArenaViewport.size.height')
        assert page.evaluate('Math.abs(arena.renderer.canvas.width/arena.renderer.canvas.height-ArenaViewport.size.width/ArenaViewport.size.height)<.02')
        for selector in ['#touch-fire', '#touch-inspect', '#pause-button', '#joystick']:
            box = page.locator(selector).bounding_box()
            assert box['x'] >= -1 and box['y'] >= -1 and box['x']+box['width'] <= size['width']+1 and box['y']+box['height'] <= size['height']+1, (selector, size, box)
    assert page.evaluate('arena.audio.ctx.state') == 'running'
    assert page.evaluate('arena.renderer.gl.getError()') == 0
    assert not errors, errors
    print(json.dumps({'desktop': desktop_report, 'mobile': 'multitouch, fire, inspect x3, aim direction, four viewport changes passed', 'url': URL}, ensure_ascii=True))
    browser.close()
