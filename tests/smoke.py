"""Single-level gameplay and mouse regression suite. python tests/smoke.py"""
from pathlib import Path
import json
import os
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
BASE=os.environ.get("WARD_TEST_URL",(ROOT/"index.html").as_uri())
OUT=ROOT/"test-results"
OUT.mkdir(exist_ok=True)
checks=[]
def check(name,condition):
    if not condition: raise AssertionError(name)
    checks.append(name)
    print("PASS:",name,flush=True)

def place(page,oid):
    label=page.evaluate("id=>game.state.objects.find(o=>o.id===id).label",oid)
    for offset in [[0,.9],[0,-.9],[.9,0],[-.9,0]]:
        ok=page.evaluate("""({id,offset})=>{
          const o=game.state.objects.find(o=>o.id===id),[x,y]=offset;
          if(!WZ.canStand(o.x+x,o.y+y))return false;
          const h=WZ.groundHeight(o.x+x,o.y+y,o.baseY);if(h===null)return false;Object.assign(game.state.player,{x:o.x+x,y:o.y+y,angle:Math.atan2(-y,-x),pitch:0,hidden:false,elevation:h,eyeElevation:h,verticalSpeed:0});
          game.state.levelElapsed=0;
          Object.assign(game.state.enemy,WZ.level.enemy,{mode:'patrol',target:null,path:[],elevation:WZ.groundHeight(WZ.level.enemy.x,WZ.level.enemy.y)});
          return true;
        }""",{"id":oid,"offset":offset})
        if ok:
            page.wait_for_timeout(80)
            if page.locator("#interaction-text").inner_text()==label:return
    raise AssertionError("Cannot interact with "+oid+" in level "+str(page.evaluate("game.state.level")))

ISOLATE_INPUT="""(() => {
  // Headless raw mouse capture on Windows can pick up the human user's device.
  // Exercise the supported fallback and isolate synthetic camera regressions.
  window.pointerRequests=[];
  const native=Element.prototype.requestPointerLock;
  Element.prototype.requestPointerLock=function(options){
    pointerRequests.push(options||{});
    if(options?.unadjustedMovement)return Promise.reject(new DOMException('Test fallback','NotSupportedError'));
    return native.call(this);
  };
  document.addEventListener('mousemove',e=>{if(e.isTrusted)e.stopImmediatePropagation();},true);
})()"""

with sync_playwright() as pw:
    try: browser=pw.chromium.launch(headless=True)
    except Exception: browser=pw.chromium.launch(headless=True,channel="chrome")
    context=browser.new_context(viewport={"width":1440,"height":900})
    context.add_init_script(ISOLATE_INPUT)
    page=context.new_page()
    errors=[];requests=[]
    page.on("pageerror",lambda e:errors.append(str(e)))
    page.on("request",lambda r:requests.append(r.url))
    page.goto(BASE);page.wait_for_load_state("networkidle")
    check("offline home loads",page.locator("#start").is_visible())
    check("one selectable chapter",page.locator(".chapter-card").count()==1)
    check("courtyard objectives and patrols reachable",page.evaluate("""()=>{
      const objects=game.state.objects;
      const annexIds=new Set([...DUST2_ANNEX.objects,...DUST2_ROOMS.objects].map(o=>o.id));
      return [...objects.filter(o=>o.label&&!annexIds.has(o.id)),...WZ.level.patrol].every(o=>WZ.findPath(WZ.level.start,o).length>0);
    }"""))
    page.screenshot(path=str(OUT/"01-home.png"))
    page.click("#help-open");check("night shift instructions", "追逐" in page.locator(".content-note").inner_text());page.keyboard.press("Escape")
    page.click("#settings-open")
    page.locator("#volume").evaluate("e=>{e.value=0;e.dispatchEvent(new Event('input'));}")
    page.click("#settings-done");page.reload();page.wait_for_load_state("networkidle")
    check("settings persist",page.evaluate("WZ.settings.volume===0"))
    page.click("#start");check("chapter story before play",page.locator("#chapter-screen").is_visible())
    page.click("#chapter-next");page.wait_for_timeout(250)
    check("first-person gameplay",page.evaluate("game.state.mode==='playing'"))
    page.wait_for_function("document.pointerLockElement===document.getElementById('world')")
    check("raw mouse fallback locks successfully",page.evaluate("pointerRequests.some(o=>o.unadjustedMovement)&&pointerRequests.some(o=>!o.unadjustedMovement)"))
    page.evaluate("game.input.reset(true)")
    before=page.evaluate("[game.state.player.angle,game.state.player.pitch]")
    page.evaluate("document.dispatchEvent(new MouseEvent('mousemove',{movementX:408,movementY:-106}))")
    page.wait_for_timeout(80)
    check("capture warp ignored",before==page.evaluate("[game.state.player.angle,game.state.player.pitch]"))
    page.evaluate("document.dispatchEvent(new MouseEvent('mousemove',{movementX:10,movementY:0}))");page.wait_for_timeout(80)
    after=page.evaluate("[game.state.player.angle,game.state.player.pitch]")
    check("mouse turns right without vertical drift",abs(after[0]-before[0]-.018)<1e-7 and after[1]==before[1])
    page.wait_for_timeout(180)
    check("no inertia after mouse stops",after==page.evaluate("[game.state.player.angle,game.state.player.pitch]"))
    page.evaluate("document.dispatchEvent(new MouseEvent('mousemove',{movementX:-10,movementY:0}))");page.wait_for_timeout(80)
    check("left/right symmetric",abs(page.evaluate("game.state.player.angle")-before[0])<1e-7)
    check("mouse stable at 30/60/120/144 fps and 16 events/frame",page.evaluate("""()=>{
      function run(frames,events){const input=new WardLookInput(),p={angle:0,pitch:0};
        for(let n=0;n<frames;n++){for(let i=0;i<events;i++)input.add(100/frames/events,0);input.apply(p,1/frames,50);}return p.angle;}
      return [30,60,120,144].every(f=>[1,4,16].every(n=>Math.abs(run(f,n)-.18)<1e-8));
    }"""))
    check("warp and stalled frame cannot produce delayed spinning",page.evaluate("""()=>{
      const input=new WardLookInput(),p={angle:0,pitch:0};input.reset(true);
      input.mouse(1,0,10);input.mouse(9000,-9000,11);input.apply(p,1/60,50);if(p.angle||p.pitch)return false;
      input.add(600,0);input.apply(p,.2,50);const angle=p.angle;input.apply(p,1/60,50);
      return angle<=Math.PI*4/30+1e-9&&p.angle===angle;
    }"""))
    y=page.evaluate("game.state.player.y");page.keyboard.down("w");page.wait_for_timeout(450);page.keyboard.up("w")
    check("W moves player",page.evaluate("game.state.player.y")<y-.4)
    page.keyboard.down("c");page.wait_for_timeout(100);check("crouch",page.evaluate("game.state.player.crouch"));page.keyboard.up("c")
    page.evaluate("Object.assign(game.state.player,{x:351*.14,y:740*.14,angle:0,elevation:WZ.groundHeight(351*.14,740*.14)})")
    page.keyboard.down("Shift");page.keyboard.down("w");page.wait_for_timeout(400);page.keyboard.up("w");page.keyboard.up("Shift")
    check("sprint stamina",page.evaluate("game.state.player.stamina")<98)
    page.evaluate("Object.assign(game.state.player,{x:735*.14,y:300*.14,angle:0,elevation:WZ.groundHeight(735*.14,300*.14)})")
    page.keyboard.down("w");page.wait_for_timeout(400);page.keyboard.up("w")
    check("wall collision",page.evaluate("game.state.player.x")<=764*.14)
    page.keyboard.press("Escape");check("pause menu",page.locator("#pause").is_visible())
    page.click("#pause-settings");page.click("#settings-done");check("settings return to pause",page.evaluate("game.state.mode==='paused'"));page.click("#resume")
    page.locator("#map-button").evaluate("e=>e.click()")
    check("map button",page.evaluate("game.state.mode==='map'"))
    t=page.evaluate("game.state.elapsed");page.wait_for_timeout(200);check("map pauses time",page.evaluate("game.state.elapsed")==t);page.click("#map-close")
    page.keyboard.press("f");check("bright even with flashlight off",page.evaluate("game.renderer.light(20,1,1,1,game.state)>=.48"));page.keyboard.press("f")

    check("true 3D scene active",page.evaluate("game.renderer.kind==='webgl'"))
    check("fixed furniture has collision",page.evaluate("game.state.objects.filter(o=>['bench','locker','generator','crate'].includes(o.type)).every(o=>!WZ.canStand(o.x,o.y))"))
    check("reference double doors have fixed collision",page.evaluate("game.state.objects.filter(o=>o.type==='door').length===5&&game.state.objects.filter(o=>o.type==='door').every(o=>!WZ.canStand(o.x,o.y))"))
    page.evaluate("Object.assign(game.state.player,{x:351*.14,y:736*.14,angle:0,pitch:-.1,elevation:WZ.groundHeight(351*.14,736*.14)});game.state.levelElapsed=0")
    page.screenshot(path=str(OUT/"reference-spawn.png"))
    place(page,"locker-0")
    locker_angle=page.evaluate("game.state.objects.find(o=>o.id==='locker-0').angle")
    page.keyboard.press("e")
    check("locker entry turns camera outward",abs(page.evaluate("game.state.player.angle")-locker_angle)<1e-7)
    hidden_position=page.evaluate("[game.state.player.x,game.state.player.y]")
    page.keyboard.down("ArrowRight");page.wait_for_timeout(250);page.keyboard.up("ArrowRight")
    check("can turn head while hiding",page.evaluate("game.state.player.angle")>locker_angle+.2)
    page.evaluate("document.dispatchEvent(new MouseEvent('mousemove',{movementX:15,movementY:-10}))")
    page.wait_for_timeout(80)
    check("mouse look works inside locker",page.evaluate("game.state.player.pitch")>0)
    page.keyboard.down("w");page.wait_for_timeout(150);page.keyboard.up("w")
    check("hiding locks position, not view",hidden_position==page.evaluate("[game.state.player.x,game.state.player.y]"))
    page.screenshot(path=str(OUT/"locker-look-out.png"))
    page.keyboard.press("e")
    check("leaving locker returns to clear floor",page.evaluate("!game.state.player.hidden&&WZ.canStand(game.state.player.x,game.state.player.y)"))

    place(page,"locker-0");page.keyboard.press("e");check("hide",page.evaluate("game.state.player.hidden"))
    page.keyboard.press("e");check("leave hiding",page.evaluate("!game.state.player.hidden"))
    for name in ["garden","radio","cafe"]:
        place(page,"memory-"+name);page.keyboard.press("e")
        check("optional memory "+name,page.evaluate("game.state.mode==='note'") and "归途明信片" in page.locator("#note-title").inner_text())
        page.keyboard.press("e")
    check("three memories complete without changing main quest",page.evaluate("game.state.fuses===0&&game.state.objects.filter(o=>o.type==='memory'&&o.activated).length===3"))
    check("optional progress shown", "已拼好" in page.locator("#explore-progress").inner_text())
    place(page,"memory-garden");page.keyboard.press("e");page.keyboard.press("e")
    check("revisiting a memory does not duplicate progress",page.evaluate("WZ.storage.get('progress.v2',{}).memories.length===3"))
    for level in range(1):
        check(f"chapter {level+1} active",page.evaluate("game.state.level")==level)
        page.evaluate("Object.assign(game.state.player,WZ.level.start,{pitch:0,torch:true,elevation:WZ.groundHeight(WZ.level.start.x,WZ.level.start.y),eyeElevation:WZ.groundHeight(WZ.level.start.x,WZ.level.start.y)});game.state.levelElapsed=0")
        page.screenshot(path=str(OUT/f"chapter-{level+1}.png"))
        page.keyboard.press("Tab")
        check(f"chapter {level+1} map",page.locator("#map-screen").is_visible())
        page.screenshot(path=str(OUT/f"chapter-{level+1}-map.png"));page.keyboard.press("Tab")
        place(page,"note-0");page.keyboard.press("e")
        check(f"chapter {level+1} story note",page.evaluate("game.state.mode==='note'") and "\n" in page.locator("#note-text").inner_text())
        page.keyboard.press("e")
        place(page,"exit");page.keyboard.press("e")
        check(f"chapter {level+1} exit gated",page.evaluate("game.state.mode==='playing'&&!game.state.power"))
        place(page,"station");page.keyboard.press("e")
        check(f"chapter {level+1} station requires objectives",page.evaluate("!game.state.power"))
        if level==1:
            place(page,"item-2");page.keyboard.press("e")
            check("wrong valve order resets safely",page.evaluate("game.state.fuses===0"))
        for i in range(1,4):
            place(page,f"item-{i}");page.keyboard.press("e")
            check(f"chapter {level+1} objective {i}",page.evaluate("game.state.fuses")==i)
            page.keyboard.press("e")
            check(f"chapter {level+1} no duplicate {i}",page.evaluate("game.state.fuses")==i)
            if level==0 and i==1:
                page.keyboard.press("Escape");page.click("#return-home")
                check("continue appears",page.locator("#continue-game").is_visible())
                page.click("#continue-game");page.click("#chapter-next")
                check("save preserves optional memories",page.evaluate("game.state.objects.filter(o=>o.type==='memory'&&o.activated).length===3"))
                check("save preserves collected item",page.evaluate("game.state.fuses===1&&game.state.objects.find(o=>o.id==='item-1').taken"))
        if level==0:
            page.evaluate("game.state.levelElapsed=20;game.state.enemy.x=game.state.player.x;game.state.enemy.y=game.state.player.y-.1;game.state.enemy.elevation=game.state.player.elevation")
            page.wait_for_function("game.state.mode==='caught'")
            check("capture returns to entrance",page.locator("#ending-title").inner_text()=="你被带回了入口。")
            page.click("#ending-restart")
            check("capture preserves inventory",page.evaluate("game.state.fuses===3&&game.state.mode==='playing'"))
        place(page,"station");page.keyboard.press("e");check("courtyard power authorizes investigation",page.evaluate("game.state.power"))
        place(page,"exit");page.keyboard.press("e")
        check("courtyard exit still requires investigation",page.evaluate("game.state.mode==='playing'"))
        # The dedicated investigation suite solves every mechanism through its UI.
        page.evaluate("game.state.mission.broadcast=true;game.investigation.commit()")
        place(page,"exit");page.keyboard.press("e")
    check("single-level ending",page.evaluate("game.state.mode==='won'&&game.state.cleared.length===1"))
    check("completed checkpoint cleared",page.evaluate("WZ.storage.get('progress.v2',null)===null"))
    check("best complete run saved",page.evaluate("WZ.storage.get('best.courtyard.v1',null)!==null"))
    page.screenshot(path=str(OUT/"ending.png"));page.click("#ending-home")
    page.click("#chapters-open");page.locator(".chapter-card").nth(0).click();page.click("#chapter-next")
    check("only first chapter selectable",page.evaluate("game.state.level===0&&WZ.levels.length===1"))
    check("no runtime errors",not errors)
    check("no remote assets",all(url.startswith(("file:","data:",BASE.rsplit("/",1)[0]+"/")) for url in requests))
    mobile=browser.new_context(viewport={"width":390,"height":844},is_mobile=True,has_touch=True,device_scale_factor=1)
    mp=mobile.new_page();mp.on("pageerror",lambda e:errors.append(str(e)))
    mp.goto(BASE);mp.wait_for_load_state("networkidle")
    mp.screenshot(path=str(OUT/"mobile-home.png"));mp.click("#start");mp.click("#chapter-next")
    check("touch controls",mp.locator("#touch-move").is_visible())
    mp.locator('[data-action="torch"]').tap();check("touch flashlight",mp.evaluate("!game.state.player.torch"))
    mp.locator('[data-action="crouch"]').tap();mp.wait_for_timeout(100);check("touch crouch",mp.evaluate("game.state.player.crouch"))
    mp.locator('[data-action="map"]').tap();check("touch map",mp.evaluate("game.state.mode==='map'"));mp.click("#map-close")
    mp.screenshot(path=str(OUT/"mobile-game.png"));check("no mobile runtime errors",not errors)
    browser.close()
(OUT/"report.json").write_text(json.dumps({"passed":len(checks),"checks":checks,"errors":errors},ensure_ascii=False,indent=2),encoding="utf-8")
print(f"ALL {len(checks)} CHECKS PASSED",flush=True)
