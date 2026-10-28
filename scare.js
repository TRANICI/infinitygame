"use strict";
// A deliberately graphic face: three colours and asymmetric voids, no realistic gore.
class WardScare{
  constructor(canvas){this.canvas=canvas;this.timer=null;}
  show(done){
    if(!WZ.settings.shocks){done();return;}
    const c=this.canvas,x=c.getContext('2d');c.width=720;c.height=720;
    x.fillStyle='#030708';x.fillRect(0,0,720,720);x.fillStyle='#bdc2ad';
    x.beginPath();x.moveTo(112,-40);x.lineTo(533,-40);x.lineTo(626,228);x.lineTo(550,568);x.lineTo(346,800);x.lineTo(170,557);x.lineTo(85,210);x.closePath();x.fill();
    x.fillStyle='#889584';x.beginPath();x.moveTo(490,0);x.lineTo(626,228);x.lineTo(550,568);x.lineTo(346,800);x.lineTo(427,440);x.closePath();x.fill();
    x.fillStyle='#050b0c';x.fillRect(172,218,100,29);x.fillRect(425,165,80,38);x.fillRect(281,441,135,18);x.fillRect(345,458,22,140);
    x.fillStyle='#b3b9a5';x.fillRect(215,222,4,4);x.fillRect(456,170,4,4);
    x.strokeStyle='#35433e';x.lineWidth=7;x.beginPath();x.moveTo(360,0);x.lineTo(323,161);x.lineTo(360,310);x.stroke();
    c.hidden=false;c.classList.remove('strike');void c.offsetWidth;c.classList.add('strike');
    clearTimeout(this.timer);this.timer=setTimeout(()=>{c.hidden=true;c.classList.remove('strike');done();},680);
  }
  cancel(){clearTimeout(this.timer);this.canvas.hidden=true;this.canvas.classList.remove('strike');}
}
