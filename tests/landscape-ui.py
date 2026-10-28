"""Forced landscape, real button hit targets, and rotated touch axes."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
URL=os.environ.get('WARD_TEST_URL',(ROOT/'index.html').as_uri())
SAFE='Element.prototype.requestPointerLock=()=>Promise.resolve();document.exitPointerLock=()=>{};'

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,channel='chrome')
    ctx=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
    p=ctx.new_page();p.add_init_script(SAFE);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
    p.goto(URL);p.wait_for_load_state('networkidle')
    assert p.evaluate('WardViewport.rotated&&document.querySelector("#app").clientWidth===844&&document.querySelector("#app").clientHeight===390')
    assert p.evaluate('game.renderer.w>game.renderer.h')
    p.screenshot(path=str(OUT/'mobile-forced-landscape-menu.png'))
    p.locator('#start').tap();p.locator('#chapter-next').tap()
    assert p.evaluate('game.state.mode==="playing"')
    # In the clockwise-rotated game, physical right is logical up/forward.
    start=p.evaluate('''()=>{const g=game.state;g.pursuerEnabled=false;Object.assign(g.player,{x:126,y:58,elevation:4.68,eyeElevation:4.68,angle:Math.PI/2,pitch:0});const s=document.querySelector('#touch-move'),r=s.getBoundingClientRect();s.setPointerCapture=()=>{};s.onpointerdown({pointerId:8,clientX:r.x+r.width/2+35,clientY:r.y+r.height/2});return g.player.y;}''')
    p.wait_for_timeout(180)
    assert p.evaluate('game.state.player.y')>start+.1
    assert abs(p.evaluate('game.state.player.x')-126)<.02
    p.evaluate('document.querySelector("#touch-move").onpointerup()')
    # Test both camera axes before the next frame consumes accumulated input.
    assert p.evaluate('''()=>{const w=document.querySelector('#world');w.setPointerCapture=()=>{};game.input.reset();w.onpointerdown({pointerId:9,pointerType:'touch',clientX:200,clientY:500});w.onpointermove({pointerId:9,clientX:200,clientY:520});const horizontal=game.input.x===30&&game.input.y===0;game.input.reset();w.onpointermove({pointerId:9,clientX:220,clientY:520});const vertical=game.input.x===0&&game.input.y===-30;w.onpointerup();return horizontal&&vertical;}''')
    p.locator('[data-action="map"]').tap();assert p.evaluate('game.state.mode==="map"')
    p.locator('#map-close').tap();assert p.evaluate('game.state.mode==="playing"')
    p.locator('#pause-button').tap();p.locator('#pause-settings').tap()
    assert p.locator('#settings .modal').evaluate('e=>e.clientHeight<=366')
    p.locator('#settings-done').tap();p.locator('#resume').tap()
    p.screenshot(path=str(OUT/'mobile-forced-landscape-game.png'))
    # Native landscape uses the same scene dimensions without rotating again.
    p.set_viewport_size({'width':844,'height':390});p.wait_for_timeout(150)
    assert p.evaluate('!WardViewport.rotated&&game.state.mode==="playing"&&game.state.moveAmount===0')
    assert p.evaluate('Math.abs(game.renderer.w/game.renderer.h-844/390)<.01')
    assert p.locator('.hud-top').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
    p.screenshot(path=str(OUT/'mobile-landscape-game.png'))
    p.locator('#inventory-button').tap();p.locator('#puzzle-done').tap()
    # The compact layout also fits a small phone and survives switching back.
    p.set_viewport_size({'width':320,'height':568});p.wait_for_timeout(120)
    assert p.evaluate('WardViewport.rotated&&game.state.moveAmount===0')
    p.locator('#pause-button').tap();p.locator('#return-home').tap()
    assert p.locator('#start').evaluate('e=>{const r=e.getBoundingClientRect();return r.top>=0&&r.left>=0&&r.right<=320&&r.bottom<=568}')
    p.screenshot(path=str(OUT/'mobile-small-landscape-menu.png'))
    assert p.locator('#start').is_visible()
    assert p.evaluate('game.renderer.gl.getError()===0')
    assert not errors,errors
    browser.close();print('PASS: forced landscape in portrait, native landscape, real taps, both touch axes, joystick direction, modal scroll and small-phone layout')
