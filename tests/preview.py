from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
with sync_playwright() as pw:
 b=pw.chromium.launch(headless=True,channel="chrome")
 p=b.new_page(viewport={"width":1440,"height":900})
 p.on("pageerror",lambda e:print("ERROR",e))
 p.goto((root/"index.html").as_uri());p.wait_for_timeout(1000)
 p.screenshot(path=str(root/"test-results/reference-home.png"))
 p.click("#start");p.click("#chapter-next");p.wait_for_timeout(200)
 for name,x,y,angle in [('T-spawn',351,740,0),('A-stairs',539,318,-1.57),('CT-underpass',519,205,-1.57),('B-stairs',270,380,-1.57),('pit',731,521,-1.57)]:
  p.evaluate("""([x,y,a])=>{const s=DUST2_LAYOUT.scale;Object.assign(game.state.player,{x:x*s,y:y*s,angle:a,pitch:-.12,elevation:WZ.groundHeight(x*s,y*s),eyeElevation:WZ.groundHeight(x*s,y*s)});game.state.levelElapsed=0;}""",[x,y,angle])
  p.wait_for_timeout(150);p.screenshot(path=str(root/f"test-results/terrain-{name}.png"))
 p.evaluate("game.renderer.drawMap(game.state)")
 p.keyboard.press("Tab");p.wait_for_timeout(100)
 p.screenshot(path=str(root/"test-results/reference-map.png"))
 b.close()
