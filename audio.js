"use strict";
class WardAudio{
  constructor(){this.ctx=null;this.master=null;this.started=false;this.muted=true;this.lastHeart=0;}
  init(){
    if(this.ctx){this.ctx.resume().catch(()=>{});return;}
    try{
      const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
      this.ctx=new Context();this.master=this.ctx.createGain();this.master.gain.value=0;this.master.connect(this.ctx.destination);
      this.ambient=this.ctx.createGain();this.ambient.gain.value=.12;this.ambient.connect(this.master);
      [52,78.3,105].forEach((freq,i)=>{const o=this.ctx.createOscillator(),g=this.ctx.createGain();o.type='sine';o.frequency.value=freq;g.gain.value=i===0?.22:.06;o.connect(g);g.connect(this.ambient);o.start();});
      const n=this.ctx.sampleRate*2;this.noiseBuffer=this.ctx.createBuffer(1,n,this.ctx.sampleRate);const data=this.noiseBuffer.getChannelData(0);for(let i=0;i<n;i++)data[i]=(Math.random()*2-1)*.25;
      const vent=this.ctx.createBufferSource(),filter=this.ctx.createBiquadFilter(),air=this.ctx.createGain();vent.buffer=this.noiseBuffer;vent.loop=true;filter.type='bandpass';filter.frequency.value=240;filter.Q.value=.7;air.gain.value=.11;vent.connect(filter);filter.connect(air);air.connect(this.ambient);vent.start();this.started=true;
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
  enemyStep(pan,strength){this.noise(.22,strength*.22,340,pan);this.tone(58,.2,strength*.08,'sine',39);this.noise(.35,strength*.055,1900,pan);}
  pickup(){this.noise(.16,.06,1600);this.tone(310,.16,.035,'triangle',260);}
  click(){this.noise(.05,.04,1300);}
  door(){this.noise(.45,.11,450);this.tone(143,.55,.025,'triangle',89);}
  bottle(){this.noise(.22,.09,2800);this.tone(1380,.09,.025,'triangle',620);}
  power(){this.noise(.3,.1,700);this.tone(48,.8,.07,'triangle',72);}
  hug(){this.noise(.65,.13,420);this.tone(72,1,.12,'sine',31);}
  whisper(pan=0){this.noise(1.2,.095,950,pan);this.tone(93,.9,.035,'triangle',76);}
  tension(stress,dt){this.lastHeart-=dt;if(stress>.22&&this.lastHeart<=0){this.tone(51,.13,stress*.1,'sine',37);this.tone(47,.15,stress*.065,'sine',32,.18);this.lastHeart=1.1-stress*.42;}}
  environment(player,dt){
    this.environmentTime=(this.environmentTime||0)+dt;
    if(this.environmentTime>16){this.environmentTime=0;const pan=Math.sin(player.x*.37+player.y*.13);this.noise(.55,.04,380,pan);this.tone(180,.9,.012,'triangle',94);}
  }
}
