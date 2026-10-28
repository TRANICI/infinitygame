"""Check rendered PCM, spatial footsteps, UI sounds and mobile audio recovery."""
from pathlib import Path
import os
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
URL=os.environ.get('WARD_TEST_URL',(ROOT/'index.html').as_uri())
with sync_playwright() as pw:
    b=pw.chromium.launch(headless=True,channel='chrome')
    p=b.new_page(viewport={'width':844,'height':390},is_mobile=True,has_touch=True)
    p.add_init_script('Element.prototype.requestPointerLock=()=>Promise.resolve();document.exitPointerLock=()=>{};')
    errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
    p.goto(URL);p.wait_for_load_state('networkidle');p.locator('#start').tap();p.locator('#chapter-next').tap()
    p.wait_for_function('game.audio.ctx.state==="running"')
    p.evaluate('game.state.pursuerEnabled=false;game.pause()')
    # Measure post-volume/post-limiter samples instead of merely counting calls.
    p.evaluate('''()=>{
      const a=game.audio,split=a.ctx.createChannelSplitter(2);a.limiter.connect(split);
      const meters=[0,1].map(i=>{const m=a.ctx.createAnalyser();m.fftSize=2048;split.connect(m,i);return m;});
      window.measureAudio=async(fn)=>{const peak=[0,0],rms=[0,0],data=new Float32Array(2048);fn();for(let i=0;i<24;i++){await new Promise(r=>setTimeout(r,16));meters.forEach((m,j)=>{m.getFloatTimeDomainData(data);let sum=0;for(const v of data){peak[j]=Math.max(peak[j],Math.abs(v));sum+=v*v;}rms[j]=Math.max(rms[j],Math.sqrt(sum/data.length));});}return{peak,rms};};
    }''')
    left=p.evaluate('measureAudio(()=>game.audio.enemyStep(-.8,1,true))')
    right=p.evaluate('measureAudio(()=>game.audio.enemyStep(.8,1,true))')
    far=p.evaluate('measureAudio(()=>game.audio.enemyStep(0,.15,true))')
    assert left['rms'][0]>.01 and left['rms'][0]>left['rms'][1]*2,left
    assert right['rms'][1]>.01 and right['rms'][1]>right['rms'][0]*2,right
    assert max(far['rms'])<max(left['rms'])*.6,(left,far)
    # Pause silences scene footsteps; opening a puzzle keeps pickup sounds audible.
    silent=p.evaluate('measureAudio(()=>game.audio.enemyStep(0,1))')
    assert max(silent['peak'])<.001,silent
    pickup=p.evaluate('measureAudio(()=>game.audio.pickup())')
    assert max(pickup['rms'])>.004,pickup
    p.evaluate('WZ.settings.volume=0;game.audio.volume(0)');p.wait_for_timeout(250)
    zero=p.evaluate('measureAudio(()=>game.audio.pickup())');assert max(zero['peak'])<.001,zero
    p.evaluate('WZ.settings.volume=55;game.audio.volume(55)')
    # A trusted tap recovers a suspended context, including from settings.
    p.locator('#pause-settings').tap();p.evaluate('game.audio.ctx.suspend()')
    assert p.evaluate('game.audio.ctx.state')=='suspended'
    p.locator('#audio-test').tap();p.wait_for_function('game.audio.ctx.state==="running"')
    assert p.locator('#audio-status').inner_text()
    p.locator('#settings-done').tap();p.locator('#resume').tap()
    # The physical pursuer must actually emit steps during its update loop.
    calls=p.evaluate('''()=>{const g=game.state,a=game.audio,original=a.enemyStep;let calls=0;a.enemyStep=(...args)=>{calls++;original.apply(a,args);};g.mode='preview';g.levelElapsed=30;g.pursuerEnabled=true;Object.assign(g.player,{x:126,y:58,elevation:4.68,eyeElevation:4.68,hidden:false,torch:true});Object.assign(g.enemy,{x:126,y:65,elevation:4.68,mode:'patrol',path:[],repath:0,target:null,stepTimer:0});for(let i=0;i<20;i++)game.pursuer.update(1/60);a.enemyStep=original;return calls;}''')
    assert calls>=1,calls
    assert not errors,errors
    b.close();print('PASS: audible stereo PCM, distance falloff, pause/UI buses, zero volume, trusted mobile resume, live pursuer steps',{'left':left,'right':right,'far':far})
