"use strict";
class WardLegacyRenderer{
  constructor(canvas){
    this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.floor=document.createElement('canvas');this.fctx=this.floor.getContext('2d',{alpha:false});this.textures=[];this.sprites={};this.shades={};this.makeTextures();this.makeSprites();this.resize();
    window.addEventListener('resize',()=>this.resize());
  }
  resize(){const w=Math.max(320,Math.min(800,Math.round(innerWidth*.58/2)*2));this.w=this.canvas.width=w;this.h=this.canvas.height=Math.round(w*innerHeight/innerWidth);this.floor.width=Math.ceil(w/2);this.floor.height=Math.ceil(this.h/2);this.floorData=this.fctx.createImageData(this.floor.width,this.floor.height);this.z=new Float32Array(w);this.focal=w/1.38;}
  makeTextures(){
    const theme=WZ.level.theme,rand=WZ.random(9709+WZ.levelIndex);
    const pal={yellow:['#e8dcb1','#c9b780','#a38d58'],pool:['#d7f0ef','#a7d5dc','#7bb0bd'],play:['#f1dfe2','#b5ccd1','#92aeb9'],station:['#e3e9e5','#b0c3c6','#8da4ae']}[theme];
    this.textures=[];
    for(let t=0;t<6;t++){
      const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');
      x.fillStyle=pal[0];x.fillRect(0,0,128,128);x.fillStyle=pal[1];x.fillRect(0,75,128,53);x.fillStyle=pal[2];x.fillRect(0,75,128,2);x.fillRect(0,123,128,5);
      if(theme==='yellow'){x.strokeStyle='#ac995e35';x.lineWidth=1;for(let a=0;a<140;a+=16){x.beginPath();x.moveTo(a,0);x.lineTo(a,75);x.stroke();for(let b=10;b<75;b+=20){x.beginPath();x.moveTo(a,b);x.lineTo(a+4,b+5);x.lineTo(a,b+10);x.lineTo(a-4,b+5);x.closePath();x.stroke();}}}
      if(theme==='pool'||theme==='station'){x.strokeStyle=theme==='pool'?'#81b7c566':'#9eafb54d';for(let a=0;a<128;a+=16){x.beginPath();x.moveTo(a,0);x.lineTo(a,128);x.moveTo(0,a);x.lineTo(128,a);x.stroke();}}
      if(theme==='play'){x.fillStyle='#ffffff99';for(let i=0;i<3;i++){const a=15+i*43,b=20+(i%2)*20;x.beginPath();x.ellipse(a,b,12,5,0,0,WZ.TAU);x.ellipse(a+3,b-4,7,7,0,0,WZ.TAU);x.fill();}}
      for(let i=0;i<600;i++){x.fillStyle=rand()>.5?'#ffffff0b':'#776c5e07';x.fillRect(rand()*128,rand()*128,2,2);}
      if(t===1||t===4){x.fillStyle=theme==='yellow'?'#9a8a58':'#7198a0';x.fillRect(36,33,56,19);x.fillStyle='#f4f0db';x.font='8px monospace';x.textAlign='center';x.fillText(t===1?'LEVEL 0'+(WZ.levelIndex+1):'THIS WAY >',64,45);}
      this.textures.push(c);
    }
  }
  sprite(name,w,h,draw){
    const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);this.sprites[name]=c;
    this.shades[name]=Array.from({length:8},(_,i)=>{const v=document.createElement('canvas');v.width=w;v.height=h;const x=v.getContext('2d');x.drawImage(c,0,0);x.globalCompositeOperation='source-atop';x.fillStyle='rgba(1,9,4,'+(1-(i+1)/8)+')';x.fillRect(0,0,w,h);return v;});
  }
  makeSprites(){
    this.sprite('enemy',160,256,x=>{
      x.fillStyle='#263631';x.beginPath();x.moveTo(48,79);x.lineTo(104,76);x.lineTo(116,196);x.lineTo(46,202);x.closePath();x.fill();
      x.fillStyle='#1a2825';x.fillRect(56,192,14,64);x.fillRect(89,192,14,64);
      x.strokeStyle='#34433b';x.lineWidth=13;x.beginPath();x.moveTo(47,86);x.lineTo(34,145);x.lineTo(31,205);x.moveTo(111,83);x.lineTo(122,148);x.lineTo(127,207);x.stroke();
      x.strokeStyle='#899480';x.lineWidth=6;x.beginPath();x.moveTo(31,160);x.lineTo(27,217);x.moveTo(125,161);x.lineTo(131,220);x.stroke();
      const face=document.createElement('canvas');face.width=face.height=128;WardRelief.mask(face.getContext('2d'));x.drawImage(face,43,0,73,82);
      x.fillStyle='#a49c7a';for(let i=0;i<3;i++)x.fillRect(69+i%2*3,100+i*13,13,18);
    });
    this.sprite('ticket',100,144,x=>{x.fillStyle='#e4c16a';x.fillRect(21,27,58,91);x.fillStyle='#fff4cb';x.fillRect(26,32,48,81);x.fillStyle='#a78b4c';x.font='bold 20px monospace';x.textAlign='center';x.fillText('017',50,73);x.font='8px monospace';x.fillText('TAKE ME HOME',50,97);x.fillRect(32,43,36,2);});
    this.sprite('photo',100,120,x=>{x.save();x.translate(50,60);x.rotate(-.12);x.fillStyle='#fff7e6';x.fillRect(-36,-45,72,93);x.fillStyle='#b4d1de';x.fillRect(-30,-39,60,60);x.fillStyle='#f0d486';x.beginPath();x.arc(12,-23,9,0,WZ.TAU);x.fill();x.fillStyle='#a2bd90';x.beginPath();x.moveTo(-30,21);x.lineTo(-6,-14);x.lineTo(30,21);x.fill();x.fillStyle='#d699a4';x.fillRect(-15,30,30,3);x.restore();});
    this.sprite('valve',128,144,x=>{x.fillStyle='#90b1bc';x.fillRect(51,65,26,72);x.fillStyle='#abcad0';x.fillRect(20,103,88,17);x.strokeStyle='#6ba9bb';x.lineWidth=10;x.beginPath();x.arc(64,57,37,0,WZ.TAU);x.stroke();x.strokeStyle='#d7eef1';x.lineWidth=6;for(let i=0;i<4;i++){const a=i*Math.PI/2;x.beginPath();x.moveTo(64,57);x.lineTo(64+Math.cos(a)*35,57+Math.sin(a)*35);x.stroke();}x.fillStyle='#faf4c7';x.beginPath();x.arc(64,57,10,0,WZ.TAU);x.fill();});
    this.sprite('beacon',100,144,x=>{x.fillStyle='#9aafb4';x.fillRect(39,65,22,72);x.fillStyle='#c4d6d6';x.fillRect(22,125,56,14);x.fillStyle='#f5d896';x.beginPath();x.arc(50,45,31,0,WZ.TAU);x.fill();x.fillStyle='#fffae9';x.beginPath();x.arc(50,45,23,0,WZ.TAU);x.fill();x.fillStyle='#a5b791';x.font='25px serif';x.textAlign='center';x.fillText('✦',50,54);});
    this.sprite('terminal',150,190,x=>{x.fillStyle='#a6b8b6';x.fillRect(14,8,122,170);x.fillStyle='#dce5d5';x.fillRect(19,13,112,157);x.fillStyle='#658f93';x.fillRect(31,28,88,55);x.fillStyle='#d5ecd2';x.font='10px monospace';x.textAlign='center';x.fillText('WELCOME',75,53);x.fillText('HOME',75,68);for(let i=0;i<3;i++){x.fillStyle=['#ddb775','#a3bf91','#b9add0'][i];x.beginPath();x.arc(46+i*29,111,9,0,WZ.TAU);x.fill();}x.fillStyle='#90ada9';x.fillRect(39,141,72,8);});
    this.sprite('bench',200,120,x=>{x.fillStyle='#75999a';x.fillRect(12,32,176,45);x.fillStyle='#acc2bb';x.fillRect(15,35,170,28);x.fillStyle='#d4bf8f';x.fillRect(12,76,176,12);x.fillStyle='#74918a';x.fillRect(25,88,8,28);x.fillRect(167,88,8,28);});
    this.sprite('cloud',180,130,x=>{x.fillStyle='#a5c5d7';x.fillRect(20,89,140,17);x.fillStyle='#f9e8e6';x.beginPath();x.ellipse(90,69,76,32,0,0,WZ.TAU);x.ellipse(59,50,29,30,0,0,WZ.TAU);x.ellipse(108,43,36,36,0,0,WZ.TAU);x.fill();x.fillStyle='#b895a9';x.beginPath();x.arc(74,66,3,0,WZ.TAU);x.arc(108,66,3,0,WZ.TAU);x.fill();x.strokeStyle='#c69aa5';x.lineWidth=2;x.beginPath();x.arc(91,72,8,0,Math.PI);x.stroke();});

    this.sprite('fuse',64,96,x=>{const glow=x.createRadialGradient(32,54,2,32,54,29);glow.addColorStop(0,'#ebcb7655');glow.addColorStop(1,'#c9b25b00');x.fillStyle=glow;x.fillRect(0,10,64,85);x.shadowColor='#e2bd6e';x.shadowBlur=9;x.fillStyle='#aaae8a';x.fillRect(24,24,16,49);x.shadowBlur=0;x.fillStyle='#d7c493';x.fillRect(25,27,14,7);x.fillRect(25,63,14,9);x.fillStyle='#526252';x.fillRect(26,37,12,23);x.fillStyle='#d7b36a';x.fillRect(30,40,4,17);x.strokeStyle='#dee3bd80';x.strokeRect(23.5,23.5,17,50);});
    this.sprite('note',96,96,x=>{x.save();x.translate(48,54);x.rotate(-.16);x.shadowColor='#d7dbb255';x.shadowBlur=10;x.fillStyle='#c4c4a6';x.fillRect(-23,-24,46,51);x.shadowBlur=0;x.fillStyle='#61705b';for(let i=0;i<7;i++)x.fillRect(-17,-17+i*6,31-(i%3)*6,1);x.restore();});
    this.sprite('locker',100,192,x=>{const g=x.createLinearGradient(0,0,100,0);g.addColorStop(0,'#273a31');g.addColorStop(.45,'#657364');g.addColorStop(1,'#273d31');x.fillStyle=g;x.fillRect(10,5,80,178);x.fillStyle='#182d23';x.fillRect(14,9,72,5);x.strokeStyle='#96a18366';x.strokeRect(17,16,65,160);x.fillStyle='#172e23';for(let i=0;i<5;i++){x.fillRect(30,30+i*7,40,3);x.fillRect(30,128+i*6,40,3);}x.fillStyle='#a5ac8d';x.fillRect(69,84,4,15);x.fillStyle='#8b937b';x.fillRect(42,74,18,7);x.fillStyle='#243b2a';x.font='5px monospace';x.fillText('009',45,79);x.fillStyle='#14291f';x.fillRect(15,183,9,9);x.fillRect(76,183,9,9);});
    this.sprite('bed',220,130,x=>{x.fillStyle='#18261f';x.beginPath();x.ellipse(111,121,105,7,0,0,WZ.TAU);x.fill();x.fillStyle='#687265';x.fillRect(12,42,195,58);x.fillStyle='#b8b9a1';x.beginPath();x.moveTo(18,43);x.lineTo(186,30);x.lineTo(207,57);x.lineTo(38,72);x.closePath();x.fill();x.fillStyle='#848d7b';x.fillRect(39,71,166,17);x.fillStyle='#c2c2ac';x.beginPath();x.ellipse(52,47,25,11,-.12,0,WZ.TAU);x.fill();x.fillStyle='#9b9e88';x.beginPath();x.moveTo(85,43);x.lineTo(179,36);x.lineTo(196,61);x.lineTo(103,70);x.closePath();x.fill();x.strokeStyle='#8d9b8a';x.lineWidth=5;for(const[a,b,c,d]of[[12,23,12,113],[207,40,207,116],[12,29,42,22],[207,44,207,72],[13,99,205,99]]){x.beginPath();x.moveTo(a,b);x.lineTo(c,d);x.stroke();}x.fillStyle='#26382b';[17,199].forEach(a=>{x.beginPath();x.arc(a,118,6,0,WZ.TAU);x.fill();});});
    this.sprite('cart',110,144,x=>{x.fillStyle='#657366';x.fillRect(13,47,84,7);x.fillRect(15,96,80,6);x.strokeStyle='#8a9883';x.lineWidth=4;[[18,39,18,132],[92,39,92,132],[18,42,93,42]].forEach(a=>{x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(a[2],a[3]);x.stroke();});x.fillStyle='#bdbaa0';x.fillRect(23,32,23,14);x.fillStyle='#596e5b';x.fillRect(52,23,15,23);x.fillStyle='#a3b29b';x.fillRect(55,20,9,4);x.fillStyle='#233d2a';[20,90].forEach(a=>{x.beginPath();x.arc(a,135,7,0,WZ.TAU);x.fill();});x.fillStyle='#86896f';x.fillRect(26,80,53,15);});
    this.sprite('shelf',140,192,x=>{x.fillStyle='#354539';x.fillRect(9,5,122,182);x.fillStyle='#60725b';x.fillRect(9,5,5,182);x.fillRect(125,5,5,182);const r=WZ.random(29);for(let row=0;row<4;row++){x.fillStyle='#7a846c';x.fillRect(10,45+row*43,119,5);for(let i=0;i<8;i++){x.fillStyle=['#9c9c7c','#727e65','#aaa587','#82775c'][Math.floor(r()*4)];x.fillRect(17+i*13,15+row*43+r()*5,9,29-r()*6);}}});
    this.sprite('generator',150,190,x=>{x.fillStyle='#2d4036';x.fillRect(8,5,134,179);x.fillStyle='#71816c';x.fillRect(13,10,125,167);x.strokeStyle='#2e4835';x.lineWidth=2;x.strokeRect(19,17,111,153);x.fillStyle='#263d2f';x.fillRect(29,29,92,39);x.strokeStyle='#768e6b';for(let i=0;i<8;i++){x.beginPath();x.moveTo(33+i*11,33);x.lineTo(33+i*11,63);x.stroke();}x.fillStyle='#bab99b';x.fillRect(49,76,54,11);x.fillStyle='#3d503a';x.font='8px monospace';x.fillText('MAIN POWER',51,85);for(let i=0;i<3;i++){x.fillStyle='#263b2b';x.fillRect(36+i*29,102,21,34);x.fillStyle='#a8a78b';x.fillRect(43+i*29,106,7,24);}x.fillStyle='#b4784f';x.fillRect(95,149,11,11);x.fillStyle='#98a987';x.fillRect(29,151,40,5);});
    this.sprite('exit',180,200,x=>{x.fillStyle='#263e30';x.fillRect(7,0,166,199);x.fillStyle='#687961';x.fillRect(14,23,152,173);x.fillStyle='#263b2c';x.fillRect(88,25,3,168);x.fillStyle='#273e30';x.fillRect(27,38,46,54);x.fillRect(105,38,46,54);x.fillStyle='#8c9c7b';x.fillRect(24,130,51,5);x.fillRect(104,130,51,5);x.fillStyle='#243c2b';x.fillRect(37,2,106,17);x.fillStyle='#b5c7a1';x.font='9px monospace';x.textAlign='center';x.fillText('EXIT / SOUTH',90,14);});

  }
  light(distance,nx,wx,wy,g){
    let base=g.power?.94:.82;
    if(g.player.torch&&!g.player.hidden)base+=.22*Math.exp(-distance*.12)*Math.pow(Math.max(0,1-Math.abs(nx)*.6),2);
    return WZ.clamp(base*Math.exp(-distance*.009),.48,1);
  }
  render(g,time){
    const c=this.ctx,w=this.w,h=this.h,p=g.player,home=g.mode==='home';
    const angle=home?WZ.level.start.angle+.025*Math.sin(time*.12):p.angle,px=home?WZ.level.start.x:p.x,py=home?WZ.level.start.y:p.y,crouch=!home&&p.crouch;
    const dx=Math.cos(angle),dy=Math.sin(angle),planeX=-dy*.69,planeY=dx*.69;
    const bob=home||WZ.settings.reducedMotion?0:Math.sin(g.walkPhase)*Math.min(g.moveAmount,1)*h*.004,horizon=h*.49+(!home?p.pitch*h*.22:0)+bob,eye=crouch?.31:.5,f=this.focal;
    const fw=this.floor.width,fh=this.floor.height,data=this.floorData.data;
    for(let sy=0;sy<fh;sy++){
      const screenY=sy*2,below=screenY>horizon,delta=Math.max(1,Math.abs(screenY-horizon)),rowD=(below?eye:1-eye)*f/delta;
      const stepX=rowD*planeX*2/fw,stepY=rowD*planeY*2/fw;let wx=px+rowD*(dx-planeX),wy=py+rowD*(dy-planeY);
      for(let sx=0;sx<fw;sx++,wx+=stepX,wy+=stepY){
        const at=(sy*fw+sx)*4,nx=sx/fw*2-1,fx=wx-Math.floor(wx),fy=wy-Math.floor(wy);let r,gg,b;
        if(below){
          const theme=WZ.level.theme,line=fx<.018||fy<.018,tile=(Math.floor(wx)+Math.floor(wy))&1,dirt=((Math.floor(wx*47)^Math.floor(wy*47))&7)-3;
          if(theme==='yellow'){r=tile?177:186;gg=tile?161:169;b=tile?113:122;}
          else if(theme==='pool'){const ripple=Math.sin(wx*3+wy*2+time*.7)*5;r=151+ripple;gg=201+ripple;b=211+ripple;}
          else if(theme==='play'){r=tile?191:208;gg=tile?206:193;b=tile?210:201;}
          else{r=tile?181:192;gg=tile?195:205;b=tile?194:205;if(Math.abs(wx-11.4)<.09||Math.abs(wx-15.6)<.09){r=223;gg=195;b=113;}}
          if(line&&theme!=='yellow'){r*=.9;gg*=.9;b*=.9;}r+=dirt;gg+=dirt;b+=dirt;
        }else{
          const seam=fx<.012||fy<.012;r=seam?185:216;gg=seam?191:222;b=seam?179:204;
          if(Math.abs((wx+1)%5-2.5)<.19&&Math.abs((wy+1)%5-2.5)<.68&&rowD<35){data[at]=245;data[at+1]=245;data[at+2]=220;data[at+3]=255;continue;}
        }
        const li=this.light(rowD,nx,wx,wy,g)*(below?1:.92);data[at]=r*li;data[at+1]=gg*li;data[at+2]=b*li;data[at+3]=255;
      }
    }
    this.fctx.putImageData(this.floorData,0,0);c.imageSmoothingEnabled=false;c.drawImage(this.floor,0,0,w,h);
    for(let x=0;x<w;x+=2){
      const nx=2*x/w-1,rx=dx+planeX*nx,ry=dy+planeY*nx;let mx=Math.floor(px),my=Math.floor(py),sx=rx<0?-1:1,sy=ry<0?-1:1;
      const ddx=Math.abs(1/rx),ddy=Math.abs(1/ry);let sdx=(rx<0?px-mx:mx+1-px)*ddx,sdy=(ry<0?py-my:my+1-py)*ddy,side=0,steps=0;
      while(steps++<80){if(sdx<sdy){sdx+=ddx;mx+=sx;side=0;}else{sdy+=ddy;my+=sy;side=1;}if(WZ.solid(mx,my))break;}
      const dist=Math.max(.03,side?sdy-ddy:sdx-ddx);this.z[x]=dist;this.z[x+1]=dist;let wallX=side?px+dist*rx:py+dist*ry;wallX-=Math.floor(wallX);
      let tx=Math.floor(wallX*128);if((!side&&rx>0)||(side&&ry<0))tx=127-tx;
      const wallH=f/dist,top=horizon-wallH*(1-eye),texture=this.textures[Math.abs(mx*3+my*7)%this.textures.length];
      c.drawImage(texture,tx,0,1,128,x,top,2,wallH);const li=this.light(dist,nx,px+rx*dist,py+ry*dist,g)*(side?.94:1);c.fillStyle='rgba(2,9,6,'+(1-li)+')';c.fillRect(x,top,2,wallH+.5);
    }
    const entities=g.objects.filter(o=>!o.taken&&!(o.activated&&(['gate','room-door'].includes(o.type)||o.type==='field'&&['window','barricade','motor'].includes(o.kind))));if(g.pursuerEnabled&&!home&&g.levelElapsed>=12)entities.push({...g.enemy,type:'enemy',height:2.5,scale:.8});const visible=entities;
    visible.sort((a,b)=>(b.x-px)**2+(b.y-py)**2-(a.x-px)**2-(a.y-py)**2);
    for(const obj of visible){
      const xx=obj.x-px,yy=obj.y-py,z=xx*dx+yy*dy;if(z<.16)continue;
      const lateral=(-dy*xx+dx*yy)/.69,screenX=(w/2)*(1+lateral/z),sh=f*(obj.height||1)/z,sw=f*(obj.scale||.65)/z,enemyBob=obj.type==='enemy'?Math.sin(time*5)*sh*.04:0,top=horizon+f*eye/z-sh+enemyBob,left=screenX-sw/2;
      if(left>w||left+sw<0)continue;
      const li=this.light(z,(screenX/w)*2-1,obj.x,obj.y,g),brightness=obj.type==='enemy'?Math.max(.9,li):Math.max(.7,li),kind=obj.type==='fuse'?({yellow:'ticket',pool:'valve',play:'photo',station:'beacon'}[WZ.level.theme]):['generator','device','puzzle','interactive','field'].includes(obj.type)?'terminal':obj.type==='evidence'?'note':['gate','room-door'].includes(obj.type)?'exit':['washer','tank','privacy-screen'].includes(obj.type)?'generator':obj.type,sprite=this.shades[kind]?.[WZ.clamp(Math.round(brightness*8)-1,0,7)];if(!sprite)continue;
      c.globalAlpha=obj.type==='enemy'?.94:1;
      for(let x=Math.max(0,Math.floor(left/2)*2);x<Math.min(w,left+sw);x+=2){if(z>=this.z[x])continue;const tx=WZ.clamp((x-left)/sw*sprite.width,0,sprite.width-1);c.drawImage(sprite,tx,0,Math.min(sprite.width-tx,sprite.width/sw*2),sprite.height,x,top,2,sh);}
      c.globalAlpha=1;
      if(!home&&g.mode==='playing'&&!obj.activated&&!obj.read&&g.nearby?.some(v=>v.object===obj)&&z<this.z[Math.max(0,Math.min(w-1,Math.floor(screenX)))]){
        const r=Math.max(2,f*.2/z),cy=top+sh*.3,halo=c.createRadialGradient(screenX,cy,0,screenX,cy,r);
        halo.addColorStop(0,obj.cue==='locked'?'#efb66f88':'#fff0c899');halo.addColorStop(1,'#fff0c800');c.fillStyle=halo;c.fillRect(screenX-r,cy-r,r*2,r*2);
      }
      if(obj.type==='fuse'&&z<8&&WZ.lineOfSight({x:px,y:py},obj)){c.fillStyle='rgba(220,193,113,'+(.35*Math.max(0,1-z/8))+')';c.beginPath();c.arc(screenX,top+sh*.53,Math.max(1,3/z),0,WZ.TAU);c.fill();}
    }
    if(!home&&!p.hidden)this.drawHand(g,w,h);
  }
  drawHand(g,w,h){
    const c=this.ctx,bob=WZ.settings.reducedMotion?0:Math.sin(g.walkPhase)*g.moveAmount*h*.008;c.save();c.translate(w*.78+Math.cos(g.walkPhase*.5)*g.moveAmount*2,h*.95+bob);c.rotate(-.32);const scale=w/800;c.scale(scale,scale);
    c.fillStyle='#131e17';c.beginPath();c.moveTo(-28,20);c.lineTo(-8,-25);c.lineTo(48,-17);c.lineTo(76,45);c.closePath();c.fill();
    const metal=c.createLinearGradient(-20,-90,30,-90);metal.addColorStop(0,'#101b15');metal.addColorStop(.45,'#4a5848');metal.addColorStop(.7,'#273c2b');metal.addColorStop(1,'#0d1911');c.fillStyle=metal;c.fillRect(-13,-92,39,107);c.fillStyle='#5d6752';c.fillRect(-19,-105,51,22);c.fillStyle='#1b2e1e';c.beginPath();c.ellipse(6,-107,26,11,0,0,WZ.TAU);c.fill();c.fillStyle=g.player.torch?'#d8ddad':'#485a3e';c.beginPath();c.ellipse(6,-110,20,6,0,0,WZ.TAU);c.fill();c.fillStyle='#71755a';c.fillRect(-21,-24,17,35);c.fillStyle='#4f5a43';c.fillRect(20,-13,16,29);c.restore();
  }
  drawMap(g,focus=this.mapFocus||'all'){
    this.mapFocus=focus;
    const view=focus==='annex'?{x:108,y:20,w:104,h:76}:focus==='courtyard'?{x:0,y:0,w:122,h:122}:{x:0,y:0,w:WZ.width,h:WZ.height};
    const canvas=document.getElementById('map-canvas'),c=canvas.getContext('2d'),s=Math.min((canvas.width-64)/view.w,(canvas.height-80)/view.h),ox=(canvas.width-view.w*s)/2-view.x*s,oy=18-view.y*s;c.clearRect(0,0,canvas.width,canvas.height);c.fillStyle='#11211b';c.fillRect(0,0,canvas.width,canvas.height);
    c.strokeStyle='#a0bd8310';c.lineWidth=1;for(let x=0;x<canvas.width;x+=22){c.beginPath();c.moveTo(x,0);c.lineTo(x,canvas.height);c.stroke();}for(let y=0;y<canvas.height;y+=22){c.beginPath();c.moveTo(0,y);c.lineTo(canvas.width,y);c.stroke();}
    c.save();c.beginPath();c.rect(ox+view.x*s,oy+view.y*s,view.w*s,view.h*s);c.clip();
    // Draw only surveyed cells, so geometry, furniture and puzzle markers cannot leak.
    c.beginPath();const size=WardCartography.cell,cols=Math.ceil(WZ.width/size);
    for(const id of g.charted||[])c.rect(ox+(id%cols)*size*s,oy+Math.floor(id/cols)*size*s,size*s+.25,size*s+.25);
    c.clip();
    if(WZ.level.reference){
      const scale=DUST2_LAYOUT.scale;
      c.beginPath();for(const points of DUST2_LAYOUT.contours){points.forEach(([x,y],i)=>i?c.lineTo(ox+x*scale*s,oy+y*scale*s):c.moveTo(ox+x*scale*s,oy+y*scale*s));c.closePath();}
      c.fillStyle='#43575c';c.fill('evenodd');c.save();c.clip('evenodd');
      for(const polygon of DUST2_SCENE.green){c.beginPath();polygon.forEach(([x,y],i)=>i?c.lineTo(ox+x*scale*s,oy+y*scale*s):c.moveTo(ox+x*scale*s,oy+y*scale*s));c.closePath();c.fillStyle='#63704e';c.fill();}
      c.restore();
      for(const points of DUST2_LAYOUT.contours){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(ox+x*scale*s,oy+y*scale*s):c.moveTo(ox+x*scale*s,oy+y*scale*s));c.strokeStyle='#9ea88a';c.stroke();}
      c.fillStyle='#607b73';for(const[x1,y1,x2,y2]of DUST2_ANNEX.rects)c.fillRect(ox+x1*s,oy+y1*s,(x2-x1)*s,(y2-y1)*s);
      for(const room of DUST2_ANNEX.rooms){const[x1,y1,x2,y2]=room.box;c.fillStyle='rgb('+room.color.map(v=>Math.round(v*135)).join(',')+')';c.fillRect(ox+x1*s,oy+y1*s,(x2-x1)*s,(y2-y1)*s);}
      for(const r of [...DUST2_ROOMS.rooms,...DUST2_ROOMS.passages]){c.fillStyle='#83795b';for(const[x1,y1,x2,y2]of[r.box,r.entry,...r.links||[]])c.fillRect(ox+x1*s,oy+y1*s,(x2-x1)*s,(y2-y1)*s);}
      for(const o of g.objects.filter(o=>o.type==='room-door'&&!o.activated)){c.save();c.translate(ox+o.x*s,oy+o.y*s);c.rotate(o.angle-Math.PI/2);c.fillStyle=o.key?'#cf8a73':'#cab78a';c.fillRect(-o.width*s/2,-1,o.width*s,2);c.restore();}
      for(const o of g.objects.filter(o=>!o.label)){
        if(o.type==='gate'&&o.activated)continue;
        c.save();c.translate(ox+o.x*s,oy+o.y*s);c.rotate(o.angle-Math.PI/2);c.fillStyle=o.type==='door'?'#beaa7c':'#94a095';c.fillRect(-o.width*s/2,-o.depth*s/2,o.width*s,o.depth*s);c.restore();
      }
    }else
    for(let y=0;y<WZ.height;y++)for(let x=0;x<WZ.width;x++)if(!WZ.cells[y][x]){c.fillStyle='#54715145';c.fillRect(ox+x*s,oy+y*s,s,s);c.strokeStyle='#9cba8270';for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1]])if(WZ.solid(x+dx,y+dy)){c.beginPath();if(dx){const xx=ox+(x+(dx>0?1:0))*s;c.moveTo(xx,oy+y*s);c.lineTo(xx,oy+(y+1)*s);}else{const yy=oy+(y+(dy>0?1:0))*s;c.moveTo(ox+x*s,yy);c.lineTo(ox+(x+1)*s,yy);}c.stroke();}}
    c.font='14px "Microsoft YaHei",sans-serif';c.textAlign='center';c.fillStyle='#d1d8b8';for(const[text,x,y]of [...WZ.level.labels,...DUST2_ANNEX.labels,...DUST2_ROOMS.labels])if(WardCartography.known(g,x,y))c.fillText(text,ox+x*s,oy+y*s);
    c.font='10px monospace';c.fillStyle='#63845a';c.fillText('N ↑',canvas.width-45,35);
    for(const o of g.objects.filter(o=>o.type==='field'&&WardCartography.known(g,o.x,o.y))){c.font='11px "Microsoft YaHei"';c.fillStyle=o.activated?'#9daf9a':'#f2c18a';c.fillText(o.activated?'✓':({code:'柜',pressure:'泵',dosage:'药',motor:'门',window:'窗',barricade:'板',clue:'纸'}[o.kind]),ox+o.x*s,oy+o.y*s+4);}
    for(const o of g.objects){if(o.taken||!WardCartography.known(g,o.x,o.y))continue;const xx=ox+o.x*s,yy=oy+o.y*s;if(o.type==='puzzle'){c.fillStyle=o.activated?'#abd8a1':'#efc18a';c.font='11px sans-serif';c.fillText(o.kind==='seal'?o.symbol:({relay:'配',keypad:'密',receiver:'播',shortcut:'闩',valve:'阀',service:'闩'}[o.kind]||'?'),xx,yy+4);}else if(o.type==='device'){c.fillStyle=o.activated?'#abd8a1':'#cdaee0';c.font='12px sans-serif';c.fillText(['录','电','档','铃'][o.kind],xx,yy+4);}else if(o.type==='memory'){c.fillStyle=o.activated?'#abd8a1':'#efc18a';c.font='14px sans-serif';c.fillText(o.activated?'✓':'✉',xx,yy+4);}else if(o.type==='fuse'){c.fillStyle='#d9b16a';c.fillRect(xx-4,yy-4,8,8);c.font='13px monospace';c.fillText(String(o.order+1),xx,yy-9);}else if(o.type==='generator'){c.strokeStyle='#8cbca9';c.strokeRect(xx-5,yy-5,10,10);}else if(o.type==='exit'){c.fillStyle=g.power&&g.mission?.broadcast?'#c4e99f':'#8ba67b';c.fillRect(xx-8,yy-2,16,4);}else if(o.type==='locker'){c.fillStyle='#668674';c.fillRect(xx-3,yy-4,6,8);}}
    const px=ox+g.player.x*s,py=oy+g.player.y*s;c.save();c.translate(px,py);c.rotate(g.player.angle);c.fillStyle='#dfe8c5';c.beginPath();c.moveTo(10,0);c.lineTo(-6,-5);c.lineTo(-3,0);c.lineTo(-6,5);c.closePath();c.fill();c.restore();c.strokeStyle='#dce9c555';c.beginPath();c.arc(px,py,11,0,WZ.TAU);c.stroke();c.restore();c.textAlign='center';c.fillStyle='#66855b';c.font='11px monospace';c.fillText('LEVEL 0'+(g.level+1)+' / '+WZ.level.en,canvas.width/2,canvas.height-24);
  }
}
