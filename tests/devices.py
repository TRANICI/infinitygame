from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
def place(p,kind):
 for dx,dy in [(0,.95),(0,-.95),(.95,0),(-.95,0)]:
  if p.evaluate("""([kind,dx,dy])=>{const o=game.state.objects.find(o=>o.type==='device'&&o.kind===kind);if(!o||!WZ.canStand(o.x+dx,o.y+dy,.25,o.baseY))return false;Object.assign(game.state.player,{x:o.x+dx,y:o.y+dy,elevation:o.baseY,eyeElevation:o.baseY,verticalSpeed:0,angle:Math.atan2(-dy,-dx),pitch:0});game.state.levelElapsed=0;return WZ.lineOfSight(game.state.player,o);}""",[kind,dx,dy]):
   p.wait_for_timeout(60)
   if p.locator('#interaction-text').inner_text()==p.evaluate("k=>game.state.objects.find(o=>o.type==='device'&&o.kind===k).label",kind):return
 raise AssertionError('inaccessible device '+str(kind))
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,channel='chrome');p=b.new_page(viewport={'width':1280,'height':800});errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
 p.add_init_script("document.addEventListener('mousemove',e=>{if(e.isTrusted)e.stopImmediatePropagation()},true)")
 p.goto((root/'index.html').as_uri());p.wait_for_timeout(500)
 for level in range(1):
  p.evaluate('i=>game.start(i)',level);p.click('#chapter-next');p.wait_for_timeout(100)
  if level==0:
   base=p.evaluate('game.state.player.elevation');p.keyboard.press('Space');p.wait_for_timeout(150);assert p.evaluate('game.state.player.elevation')>base+.2;p.wait_for_timeout(700)
   p.evaluate('game.state.player.angle=0;window.moveStart={x:game.state.player.x,y:game.state.player.y,t:game.state.elapsed}')
   p.keyboard.down('w');p.wait_for_timeout(250);p.keyboard.up('w')
   speed=p.evaluate('Math.hypot(game.state.player.x-moveStart.x,game.state.player.y-moveStart.y)/(game.state.elapsed-moveStart.t)');assert 3.8<speed<4.5,speed
  assert p.evaluate("game.state.objects.filter(o=>o.type==='device'&&o.id.startsWith('device-')).length")==4
  place(p,2);p.keyboard.press('e');assert p.evaluate("game.state.mode")== 'playing'
  for kind in [0,1,2]:place(p,kind);p.keyboard.press('e')
  assert p.evaluate("game.state.mode")== 'note'
  p.click('#note-done');place(p,3);p.keyboard.press('e');assert p.evaluate('game.state.enemy.lureTime')>0
  p.evaluate('game.save()');assert len(p.evaluate("WZ.storage.get('progress.v2',{}).devices"))==4
  p.evaluate("game.start(game.state.level,WZ.storage.get('progress.v2',{}))");p.click('#chapter-next');assert p.evaluate("game.state.objects.filter(o=>o.type==='device'&&o.activated).length")==4
  place(p,1);p.evaluate('window.staticBuffer=game.renderer.world.buffer');p.keyboard.press('e');p.wait_for_timeout(60);assert p.evaluate('staticBuffer===game.renderer.world.buffer')
  p.keyboard.press('F3');assert p.locator('#performance').is_visible();p.keyboard.press('F3')
  if level==0:
   p.evaluate('game.state.player.pitch=-.5');p.wait_for_timeout(100);p.screenshot(path=str(root/'test-results/new-devices.png'))
  print('PASS: devices, puzzle gating, lure, save/restore, static mesh reuse, FPS toggle: chapter',level+1)
 assert not errors,errors
 b.close()
