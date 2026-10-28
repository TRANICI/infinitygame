"use strict";
// Contact uses the actor's actual mask, lit like the corridor, without a flash.
class WardScare{
  constructor(canvas){this.canvas=canvas;this.timer=null;}
  show(done){
    if(!WZ.settings.shocks){done();return;}
    const c=this.canvas,x=c.getContext('2d');c.width=720;c.height=720;
    const mask=document.createElement('canvas');mask.width=mask.height=720;WardRelief.mask(mask.getContext('2d'),720);
    x.fillStyle='#080e0f';x.fillRect(0,0,720,720);x.save();x.translate(360,330);x.rotate(-.14);x.drawImage(mask,-360,-350);x.restore();
    const shade=x.createRadialGradient(330,300,100,360,360,470);shade.addColorStop(0,'#101a1900');shade.addColorStop(1,'#03090be8');x.fillStyle=shade;x.fillRect(0,0,720,720);
    c.hidden=false;c.classList.remove('strike');void c.offsetWidth;c.classList.add('strike');
    clearTimeout(this.timer);this.timer=setTimeout(()=>{c.hidden=true;c.classList.remove('strike');done();},680);
  }
  cancel(){clearTimeout(this.timer);this.canvas.hidden=true;this.canvas.classList.remove('strike');}
}
