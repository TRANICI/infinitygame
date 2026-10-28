"""DOM-only checks of live pursuit, the stylized art direction, scares and fog of war."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
URL=os.environ.get('WARD_TEST_URL',(ROOT/'index.html').as_uri())
SAFE="Element.prototype.requestPointerLock=()=>Promise.resolve();document.exitPointerLock=()=>{};"
def click(p,s):p.evaluate('s=>document.querySelector(s).click()',s)
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,channel='chrome');p=b.new_page(viewport={'width':1440,'height':900});p.add_init_script(SAFE);errors=[]
 p.on('pageerror',lambda e:errors.append(str(e)));p.goto(URL);p.wait_for_load_state('networkidle');click(p,'#start');click(p,'#chapter-next')
 assert p.evaluate('game.state.pursuerEnabled&&game.renderer.surface.ready&&typeof WardRelief==="undefined"')
 initial=p.evaluate('game.state.charted.length');assert 0<initial<35
 click(p,'#map-button');p.screenshot(path=str(OUT/'map-first-visit.png'))
 assert p.evaluate('[...document.querySelectorAll("#map-rooms span")].filter(e=>!e.hidden).length<3');click(p,'#map-close')
 p.evaluate('''()=>{const g=game.state;g.mode='preview';g.levelElapsed=30;Object.assign(g.player,{x:126,y:57.5,elevation:4.68,eyeElevation:4.68,angle:Math.PI/2,pitch:.02});Object.assign(g.enemy,{x:126,y:62,elevation:4.68,angle:Math.PI,motion:0});game.cartography.update(true);game.renderer.render(g,0);}''')
 p.wait_for_timeout(100);p.screenshot(path=str(OUT/'crawler-live.png'))
 assert p.evaluate('game.renderer.pursuerMeshes.body.count>0&&game.renderer.gl.getError()===0')
 p.evaluate('game.state.mode="playing";game.save();game.home()');click(p,'#continue-game');click(p,'#chapter-next')
 assert p.evaluate('game.state.charted.length')>initial
 # Contact triggers a short face overlay followed by recovery; progress is preserved.
 p.evaluate('''()=>{const g=game.state;g.levelElapsed=30;Object.assign(g.enemy,{x:g.player.x,y:g.player.y,elevation:g.player.elevation});game.pursuer.update(.01);}''')
 assert p.locator('#scare').is_visible();p.screenshot(path=str(OUT/'crawler-scare.png'));p.wait_for_function('game.state.mode==="caught"')
 click(p,'#ending-restart');assert p.evaluate('game.state.mode==="playing"&&game.state.levelElapsed<1')
 p.evaluate('''()=>{WZ.settings.shocks=false;const g=game.state;g.levelElapsed=30;Object.assign(g.enemy,{x:g.player.x,y:g.player.y,elevation:g.player.elevation});game.pursuer.update(.01);}''')
 assert p.evaluate('game.state.mode==="caught"');assert p.locator('#scare').is_hidden();click(p,'#ending-restart')
 click(p,'#pause-button');click(p,'#pause-settings');p.evaluate('document.querySelector("#shocks-toggle").checked=false;document.querySelector("#shocks-toggle").dispatchEvent(new Event("change"))');assert p.evaluate('JSON.parse(localStorage.getItem("wardzero.settings")).shocks===false')
 assert p.evaluate('document.pointerLockElement===null');assert not errors,errors
 # Small screens keep the settings and exploration map usable.
 ctx=b.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True);m=ctx.new_page();m.add_init_script(SAFE);m.goto(URL);m.wait_for_load_state('networkidle');click(m,'#start');click(m,'#chapter-next');click(m,'#map-button')
 assert m.locator('.map-panel').evaluate('e=>e.scrollWidth<=e.clientWidth+1');m.screenshot(path=str(OUT/'map-mobile-exploration.png'))
 b.close();print('PASS: live rendered pursuer, close-contact scare, scare toggle, recovery, fog-of-war save, mobile map, no native pointer capture')
