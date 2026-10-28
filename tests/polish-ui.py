"""Release regressions: model geometry, settings, input reset and old saves."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'test-results';OUT.mkdir(exist_ok=True)
URL=os.environ.get('WARD_TEST_URL',(ROOT/'index.html').as_uri())
SAFE="Element.prototype.requestPointerLock=()=>Promise.resolve();document.exitPointerLock=()=>{};"
def click(p,s):p.evaluate('s=>document.querySelector(s).click()',s)

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,channel='chrome')
    p=browser.new_page(viewport={'width':1440,'height':900})
    p.add_init_script(SAFE);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
    p.goto(URL);p.wait_for_load_state('networkidle');click(p,'#start');click(p,'#chapter-next')
    # Inspect the actual mesh data before upload: every component must be finite,
    # fit a doorway vertically, and remain bounded even while animated.
    report=p.evaluate('''()=>{
      const r=game.renderer,parts=WardStalker.meshes({tiles:r.tiles,upload:m=>m.data});
      let count=0;for(const data of Object.values(parts)){if(!data.length||!data.every(Number.isFinite))throw Error('invalid mesh');count+=data.length/13;}
      const g=game.state;g.mode='preview';g.levelElapsed=30;
      Object.assign(g.player,{x:126,y:57.5,elevation:4.68,eyeElevation:4.68,angle:Math.PI/2,pitch:0});
      Object.assign(g.enemy,{x:126,y:62,elevation:4.68,angle:Math.PI,motion:2.25});
      const draw=r.draw;let low=Infinity,high=-Infinity,maxRadius=0;
      r.draw=(data,m)=>{for(let i=0;i<data.length;i+=13){const x=data[i],y=data[i+1],z=data[i+2],wx=m[0]*x+m[4]*y+m[8]*z+m[12],wy=m[1]*x+m[5]*y+m[9]*z+m[13],wz=m[2]*x+m[6]*y+m[10]*z+m[14];low=Math.min(low,wy-4.68);high=Math.max(high,wy-4.68);maxRadius=Math.max(maxRadius,Math.hypot(wx-126,wz-62));}};
      r.pursuerMeshes=parts;for(let i=0;i<24;i++){g.enemy.phase=i*Math.PI/12;WardStalker.draw(r,g,i/4);}
      r.draw=draw;r.pursuerMeshes=null;r.render(g,0);const cached=r.pursuerMeshes;r.render(g,1);
      return {count,low,high,maxRadius,cached:cached===r.pursuerMeshes};
    }''')
    assert 1000<report['count']<12000,report
    assert report['low']>-.04 and 1.2<report['high']<1.5 and report['maxRadius']<.95,report
    assert report['cached'],report
    for name,angle,phase in [('front',3.14159,0),('profile',1.5708,1.2),('back',0,2.8)]:
        p.evaluate('v=>{Object.assign(game.state.enemy,v);game.renderer.render(game.state,0)}',{'angle':angle,'phase':phase})
        p.screenshot(path=str(OUT/f'crawler-{name}.png'))
    p.evaluate('game.state.mode="playing";game.state.levelElapsed=0')
    click(p,'#pause-button');click(p,'#pause-settings')
    p.locator('#reducedMotion-toggle').check()
    assert p.evaluate('WZ.settings.reducedMotion&&JSON.parse(localStorage.getItem("wardzero.settings")).reducedMotion')
    p.locator('#brightness').focus();p.keyboard.press('Escape')
    assert p.evaluate('game.state.mode==="paused"')
    click(p,'#resume')
    # Camera bob must actually be absent, not just a saved checkbox.
    assert p.evaluate('''()=>{const r=game.renderer,g=game.state;g.mode='preview';g.moveAmount=1;const camera=r.camera,eyes=[];r.camera=function(eye,...args){eyes.push([...eye]);return camera.call(this,eye,...args)};g.walkPhase=0;r.render(g,0);g.walkPhase=Math.PI/2;r.render(g,0);r.camera=camera;return eyes[0][1]===eyes[1][1];}''')
    p.evaluate('game.state.mode="playing";game.save()');p.reload();p.wait_for_load_state('networkidle')
    assert p.evaluate('WZ.settings.reducedMotion&&document.body.classList.contains("reduced-motion")')
    click(p,'#continue-game');click(p,'#chapter-next')
    assert p.evaluate('game.state.pursuerEnabled')
    assert p.evaluate('game.renderer.gl.getError()===0')
    # A system preference becomes the default on a clean profile.
    mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,reduced_motion='reduce')
    m=mobile.new_page();m.add_init_script(SAFE);m.on('pageerror',lambda e:errors.append(str(e)))
    m.goto(URL);m.wait_for_load_state('networkidle');assert m.evaluate('WZ.settings.reducedMotion')
    click(m,'#start');click(m,'#chapter-next')
    # Emulated DOM pointers keep the test independent of OS cursor capture.
    m.evaluate('''()=>{const s=document.querySelector('#touch-move');s.setPointerCapture=()=>{};const r=s.getBoundingClientRect();s.onpointerdown({pointerId:7,clientX:r.x+r.width/2,clientY:r.y+10});}''')
    click(m,'#pause-button')
    assert m.locator('#touch-move span').evaluate('e=>e.style.transform===""')
    click(m,'#resume')
    m.evaluate('''()=>{const s=document.querySelector('#touch-move');s.onpointermove({pointerId:7,clientX:0,clientY:0});}''')
    m.wait_for_timeout(150);assert m.evaluate('game.state.moveAmount===0')
    assert m.locator('.hud-bottom').evaluate('e=>e.scrollWidth<=e.clientWidth+1')
    click(m,'#pause-button');click(m,'#pause-settings')
    m.screenshot(path=str(OUT/'settings-mobile-v2.png'))
    assert m.locator('#settings .modal').evaluate('e=>e.scrollHeight<=e.clientHeight+2||getComputedStyle(e).overflowY==="auto"')
    assert not errors,errors
    browser.close();print('PASS: articulated model bounds/cache, reduced motion, preference persistence, settings Escape, mobile pause/input reset',report)
