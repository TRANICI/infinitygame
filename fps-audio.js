"use strict";
class ArenaAudio{
  constructor(){this.volume=.65;this.events=0;this.listener=null;this.active=0;}
  async unlock(){if(!this.ctx){const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return false;const c=this.ctx=new Audio(),bus=this.bus=c.createGain(),limiter=c.createDynamicsCompressor();limiter.threshold.value=-13;limiter.ratio.value=6;bus.connect(limiter);limiter.connect(c.destination);bus.gain.value=this.volume;this.noise=c.createBuffer(1,c.sampleRate,c.sampleRate);const a=this.noise.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;}if(this.ctx.state==='suspended')await this.ctx.resume();return this.ctx.state==='running';}
  setVolume(v){this.volume=FP.clamp(v,0,1);if(this.bus)this.bus.gain.setTargetAtTime(this.volume,this.ctx.currentTime,.02);}
  pause(){if(this.ctx?.state==='running')this.ctx.suspend().catch(()=>{});}
  play(kind,actor){const c=this.ctx;if(!c||c.state!=='running'||this.active>30)return;let gain=1,pan=0;const p=this.listener;if(actor&&p&&actor!==p){const d=FP.dist(actor,p),range=kind==='step'?19:75;if(d>range)return;gain=Math.pow(1-d/range,2)*.7;pan=FP.clamp(Math.sin(Math.atan2(actor.y-p.y,actor.x-p.x)-p.angle),-1,1);}
    this.events++;const now=c.currentTime,out=c.createGain();out.gain.value=gain;const stereo=c.createStereoPanner?.();if(stereo){stereo.pan.value=pan;out.connect(stereo);stereo.connect(this.bus);}else out.connect(this.bus);let last=now;
    const sound=(delay,duration,volume,freq,noise=false,to=freq)=>{const start=now+delay,s=noise?c.createBufferSource():c.createOscillator(),g=c.createGain(),filter=c.createBiquadFilter();if(noise)s.buffer=this.noise;else{s.type='triangle';s.frequency.setValueAtTime(freq,start);s.frequency.exponentialRampToValueAtTime(Math.max(20,to),start+duration);}filter.type='lowpass';filter.frequency.value=noise?freq:12000;s.connect(filter);filter.connect(g);g.connect(out);g.gain.setValueAtTime(.001,start);g.gain.linearRampToValueAtTime(volume,start+.003);g.gain.exponentialRampToValueAtTime(.001,start+duration);s.start(start);s.stop(start+duration+.01);this.active++;s.onended=()=>{this.active--;s.disconnect();filter.disconnect();g.disconnect();};last=Math.max(last,start+duration);};
    if(kind==='rifle'||kind==='pistol'){sound(0,.13,kind==='rifle'?.65:.5,6000,true);sound(0,.13,.37,170,false,42);sound(.07,.17,.13,1400,true);}
    else if(kind==='step'){sound(0,.065,.18,550,true);sound(0,.075,.12,95,false,40);}
    else if(kind==='reload'){sound(0,.09,.22,2400,true);sound(.45,.1,.18,1500,true);sound(1.05,.08,.23,3200,true);}
    else if(kind==='flip'||kind==='equip'){sound(0,.075,.13,2100,false,900);sound(.065,.05,.12,3700,true);}
    else if(kind==='slash'){sound(0,.15,.28,3100,true);sound(.12,.045,.14,1800,false,900);}
    else if(kind==='hit'){sound(0,.055,.16,1050,false,600);}
    else if(kind==='result'){sound(0,.2,.18,440);sound(.15,.25,.15,660);}
    setTimeout(()=>{out.disconnect();stereo?.disconnect();},Math.max(100,(last-now)*1000+100));
  }
}
