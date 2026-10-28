from pathlib import Path
import json,sys
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,channel="chrome")
 p=b.new_page(viewport={"width":1440,"height":900})
 p.add_init_script("Element.prototype.requestPointerLock=()=>Promise.resolve();document.exitPointerLock=()=>{};")
 p.goto((root/"index.html").as_uri());p.wait_for_timeout(700)
 p.evaluate("document.querySelector('#start').click();document.querySelector('#chapter-next').click()")
 p.evaluate("game.state.mode='benchmark';document.exitPointerLock()")
 result=p.evaluate("""async()=>{const g=game.state,r=game.renderer;let samples=[],last=performance.now();await new Promise(done=>{function tick(now){if(samples.length<180){samples.push(now-last);last=now;g.player.angle+=.012;requestAnimationFrame(tick);}else done();}requestAnimationFrame(tick)});samples=samples.slice(20).sort((a,b)=>a-b);let paths=[];for(let i=0;i<5;i++){const t=performance.now();WZ.findPath(WZ.level.start,WZ.level.patrol[i]);paths.push(performance.now()-t);}const t=performance.now();g.objects[0].taken=true;r.render(g,0);return {fps:1000/(samples.reduce((a,b)=>a+b)/samples.length),frameP95:samples[Math.floor(samples.length*.95)],pathMs:paths,pickupMs:performance.now()-t,vertices:r.world?.count,renderer:r.kind};}""")
 print(json.dumps(result));(root/'test-results'/('performance-'+(sys.argv[1] if len(sys.argv)>1 else 'after')+'.json')).write_text(json.dumps(result,indent=2))
 b.close()
