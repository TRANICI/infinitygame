"use strict";
class WardAudio{
  constructor(){this.ctx=null;this.master=null;this.started=false;this.muted=true;this.lastHeart=0;this.resuming=null;}
  init(){
    if(this.ctx){this.unlock();return;}
    try{
      const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
      this.ctx=new Context();this.master=this.ctx.createGain();this.master.gain.value=0;
      this.limiter=this.ctx.createDynamicsCompressor();this.limiter.threshold.value=-12;this.limiter.knee.value=18;this.limiter.ratio.value=5;this.limiter.attack.value=.003;this.limiter.release.value=.18;
      this.master.connect(this.limiter);this.limiter.connect(this.ctx.destination);
      this.effects=this.ctx.createGain();this.effects.connect(this.master);
      this.scene=this.ctx.createGain();this.scene.gain.value=this.muted?0:1;this.scene.connect(this.master);
      this.ambient=this.ctx.createGain();this.ambient.gain.value=.2;this.ambient.connect(this.scene);
      [74,111,148].forEach((freq,i)=>{const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sine';o.frequency.value=freq;g.gain.value=i===0?.12:.035;o.connect(g);g.connect(this.ambient);o.start();});
      const n=this.ctx.sampleRate*2;this.noiseBuffer=this.ctx.createBuffer(1,n,this.ctx.sampleRate);const data=this.noiseBuffer.getChannelData(0);for(let i=0;i<n;i++)data[i]=Math.random()*2-1;
      const vent=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),air=this.ctx.createGain();vent.buffer=this.noiseBuffer;vent.loop=true;filter.type='bandpass';filter.frequency.value=380;filter.Q.value=.7;air.gain.value=.08;vent.connect(filter);filter.connect(air);air.connect(this.ambient);vent.start();
      this.started=true;this.volume(WZ.settings.volume);this.unlock();
    }catch{this.ctx?.close().catch(()=>{});this.ctx=null;this.started=false;}
  }
  unlock(){
    if(!this.ctx){this.init();return this.resuming||Promise.resolve(false);}
    if(this.ctx.state==='running')return Promise.resolve(true);
    if(!this.resuming)this.resuming=this.ctx.resume().then(()=>this.ctx.state==='running').catch(()=>false).finally(()=>{this.resuming=null;});
    return this.resuming;
  }
  volume(v){if(this.ctx){const value=WZ.clamp(Number(v)||0,0,100)/100*.8;this.master.gain.setTargetAtTime(value,this.ctx.currentTime,.04);}}
  suspend(mute){this.muted=mute;if(this.ctx)this.scene.gain.setTargetAtTime(mute?0:1,this.ctx.currentTime,.025);}
  route(gain,pan,bus){
    if(!this.ctx.createStereoPanner){gain.connect(bus);return null;}
    const p=this.ctx.createStereoPanner();p.pan.value=WZ.clamp(pan,-1,1);gain.connect(p);p.connect(bus);return p;
  }
  tone(freq,duration=.2,gain=.1,type='sine',end=freq,delay=0,pan=0,bus=this.effects){
    if(!this.ctx)return;const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(1,end),t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),t+.008);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);const p=this.route(g,pan,bus);
    o.onended=()=>{o.disconnect();g.disconnect();p?.disconnect();};o.start(t);o.stop(t+duration+.01);
  }
  noise(duration,gain,cutoff=1400,pan=0,bus=this.effects,delay=0){
    if(!this.ctx||!this.noiseBuffer)return;const t=this.ctx.currentTime+delay,n=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();n.buffer=this.noiseBuffer;f.type='lowpass';f.frequency.value=cutoff;g.gain.setValueAtTime(.0001,t);g.gain.linearRampToValueAtTime(Math.max(.0001,gain),t+.006);g.gain.exponentialRampToValueAtTime(.0001,t+duration);n.connect(f);f.connect(g);const p=this.route(g,pan,bus);
    n.onended=()=>{n.disconnect();f.disconnect();g.disconnect();p?.disconnect();};n.start(t,Math.random());n.stop(t+duration);
  }
  step(running,crouching=false){if(this.muted)return;this.noise(.14,crouching?.06:running?.3:.2,1600,0,this.scene);this.tone(running?165:145,.12,crouching?.025:.09,'triangle',85,0,0,this.scene);}
  enemyStep(pan,strength,preview=false){
    if(this.muted&&!preview)return;const bus=preview?this.effects:this.scene,s=WZ.clamp(strength,0,1);
    // A double contact and a drag remain audible on small phone speakers.
    this.tone(165,.24,s*.36,'triangle',76,0,pan,bus);
    this.noise(.2,s*.5,1450,pan,bus);
    this.noise(.3,s*.18,2400,pan,bus,.085);
    this.tone(430,.09,s*.075,'triangle',210,.085,pan,bus);
  }
  pickup(){this.noise(.18,.22,2200);this.tone(580,.25,.12,'triangle',340);}
  click(){this.noise(.07,.2,2400);this.tone(720,.06,.045,'triangle',360);}
  door(){this.noise(.5,.3,1100);this.tone(190,.45,.13,'triangle',90);}
  bottle(){this.noise(.3,.35,4200);this.tone(1650,.15,.12,'triangle',540);}
  power(){this.noise(.35,.28,1800);this.tone(110,.8,.17,'triangle',165);}
  hug(){this.noise(.5,.32,1800);this.tone(140,.65,.24,'triangle',55);}
  whisper(pan=0){this.noise(1.1,.16,1600,pan,this.scene);this.tone(185,.6,.07,'triangle',115,0,pan,this.scene);}
  tension(stress,dt){this.lastHeart-=dt;if(stress>.22&&this.lastHeart<=0){this.tone(90,.13,stress*.16,'sine',52,0,0,this.scene);this.tone(82,.15,stress*.12,'sine',48,.18,0,this.scene);this.lastHeart=1.1-stress*.42;}}
  environment(player,dt){
    this.environmentTime=(this.environmentTime||0)+dt;
    if(this.environmentTime>16){this.environmentTime=0;const pan=Math.sin(player.x*.37+player.y*.13);this.noise(.55,.09,950,pan,this.scene);this.tone(280,.9,.035,'triangle',135,0,pan,this.scene);}
  }
  async preview(){await this.unlock();if(this.ctx?.state!=='running')return false;this.enemyStep(-.6,.8,true);setTimeout(()=>this.enemyStep(.6,.8,true),420);return true;}
}
