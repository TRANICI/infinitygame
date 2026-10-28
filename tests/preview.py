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
 p.evaluate("game.state.mode='preview';document.exitPointerLock()")
 for name,x,y,angle in [('garden',240,696,-2.05),('garden-stairs',120,703,-1.57),('B-courtyard',164,243,-1.57),('street-cafe',688,443,-2.48),('A-stairs',539,318,-1.57)]:
  p.evaluate("""([x,y,a])=>{const s=DUST2_LAYOUT.scale;Object.assign(game.state.player,{x:x*s,y:y*s,angle:a,pitch:-.12,elevation:WZ.groundHeight(x*s,y*s),eyeElevation:WZ.groundHeight(x*s,y*s)});game.state.levelElapsed=0;}""",[x,y,angle])
  p.wait_for_timeout(150);p.screenshot(path=str(root/f"test-results/terrain-{name}.png"))
 p.evaluate("game.renderer.drawMap(game.state)")
 p.evaluate("game.state.mode='playing';game.toggleMap()");p.wait_for_timeout(100)
 p.screenshot(path=str(root/"test-results/reference-map.png"))
 b.close()
