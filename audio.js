"use strict";
class WardAudio{
  constructor(){this.ctx=null;this.master=null;this.started=false;this.muted=true;this.lastHeart=0;}
  init(){
    if(this.ctx){this.ctx.resume().catch(()=>{});return;}
    try{
      const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
      this.ctx=new Context();this.master=this.ctx.createGain();this.master.gain.value=0;this.master.connect(this.ctx.destination);
      this.ambient=this.ctx.createGain();this.ambient.gain.value=.035;this.ambient.connect(this.master);
      [130.81,196,261.63].forEach((freq,i)=>{const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sine';o.frequency.value=freq;g.gain.value=i===0?.22:.06;o.connect(g);g.connect(this.ambient);o.start();});
      const n=this.ctx.sampleRate*2;this.noiseBuffer=this.ctx.createBuffer(1,n,this.ctx.sampleRate);const data=this.noiseBuffer.getChannelData(0);for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*.25;this.started=true;
    }catch{this.ctx=null;}
  }
  volume(v){if(this.ctx)this.master.gain.setTargetAtTime(this.muted?0:v/100*.45,this.ctx.currentTime,.12);}
  suspend(mute){this.muted=mute;this.volume(WZ.settings.volume);}
  tone(freq,duration=.2,gain=.1,type='sine',end=freq,delay=0){
    if(!this.ctx)return;const t=this.ctx.currentTime+delay,o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(1,end),t+duration);g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(Math.max(.0002,gain),t+.015);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(this.master);o.start(t);o.stop(t+duration+.01);
  }
  noise(duration,gain,cutoff=600,pan=0){
    if(!this.ctx||!this.noiseBuffer)return;const t=this.ctx.currentTime,n=this.ctx.createBufferSource(),f=this.ctx.createBiquadFilter(),g=this.ctx.createGain();n.buffer=this.noiseBuffer;f.type='lowpass';f.frequency.value=cutoff;g.gain.setValueAtTime(Math.max(.0001,gain),t);g.gain.exponentialRampToValueAtTime(.0001,t+duration);n.connect(f);f.connect(g);
    if(this.ctx.createStereoPanner){const p=this.ctx.createStereoPanner();p.pan.value=WZ.clamp(pan,-1,1);g.connect(p);p.connect(this.master);}else g.connect(this.master);n.start(t,Math.random());n.stop(t+duration);
  }
  step(running,crouching=false){this.noise(.1,crouching?.025:running?.12:.065,700);}
  enemyStep(pan,strength){this.noise(.12,strength*.045,500,pan);}
  pickup(){this.tone(659,.19,.1);this.tone(880,.25,.08,'sine',880,.12);}
  click(){this.noise(.05,.04,1300);}
  door(){this.noise(.3,.07,650);this.tone(330,.3,.025,'sine',392);}
  power(){[523,659,784].forEach((f,i)=>this.tone(f,.45,.07,'sine',f,i*.12));}
  hug(){this.tone(523,.22,.09);this.tone(659,.3,.08,'sine',659,.15);}
  update(){/* Gentle build: no heartbeat, rumble, alarm or sudden sound. */}
}
