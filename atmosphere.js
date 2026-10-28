"use strict";
// Scene dressing shares the existing footprints; it does not add invisible collision.
const WardAtmosphere={
  material(gl,tileSize=128){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=tileSize*2;
    const c=canvas.getContext('2d'),r=WZ.random(21744);
    for(let i=0;i<4;i++){
      const x=i%2*tileSize,y=Math.floor(i/2)*tileSize;c.save();c.translate(x,y);c.fillStyle=['#849186','#72786b','#55655a','#62695c'][i];c.fillRect(0,0,tileSize,tileSize);
      if(i===0){c.fillStyle='#304e43';c.fillRect(0,tileSize*.62,tileSize,tileSize*.38);c.fillStyle='#789184';c.fillRect(0,tileSize*.62,tileSize,1);c.fillStyle='#23392f';c.fillRect(0,tileSize-5,tileSize,5);}
      // Seeded low-resolution plaster and terrazzo grain, stable between frames.
      for(let n=0;n<3500;n++){const px=Math.floor(r()*tileSize),py=Math.floor(r()*tileSize);c.fillStyle=i===3?(n%2?'#d3dac308':'#172b2408'):(n%2?'#d3dac315':'#172b2419');c.fillRect(px,py,1+Math.floor(r()*3),1+Math.floor(r()*3));}
      if(i===1||i===3){c.strokeStyle='#1b281fbb';c.lineWidth=1;for(let n=0;n<tileSize;n+=tileSize/4){c.beginPath();c.moveTo(n,0);c.lineTo(n,tileSize);c.moveTo(0,n);c.lineTo(tileSize,n);c.stroke();}}
      c.restore();
    }
    const texture=gl.createTexture(),upload=source=>{gl.bindTexture(gl.TEXTURE_2D,texture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);};
    upload(canvas);return{texture,ready:true};
  },
  light(renderer,x,y,z,color=[.66,.78,.75],radius=8){renderer.lights.push({x,y,z,color,radius});},
  fixture(m,renderer,x,y,base,top=3.1,red=false){
    const o={x,y,baseY:base,angle:Math.PI/2},tint=red?[.55,.3,.16]:[.72,.79,.59];
    m.box(o,0,top,0,.78,.1,.48,'metal',[.35,.41,.32]);m.box(o,0,top-.04,0,.66,.055,.38,'white',tint,.85);
    this.light(renderer,x,base+top-.2,y,tint,red?6:8);
  },
  dress(m,renderer,g){
    const stains=new WardMesh(renderer.tiles);
    const paper=(o,x,y,z,w,d)=>m.quad([[x-w/2,y,z-d/2],[x+w/2,y,z-d/2],[x+w/2,y,z+d/2],[x-w/2,y,z+d/2]].map(p=>m.transform(o,p)),[0,1,0],'note',[.55,.51,.4]);
    for(const o of g.objects){
      if(o.type==='bed'){
        // A torn mattress and loose restraints, deliberately no body-shaped forms.
        m.box(o,0,.8,.32,o.width*.72,.025,.09,'metal',[.24,.22,.16]);
        m.box(o,o.width*.3,.6,.32,.035,.21,.09,'metal',[.24,.22,.16]);
        stains.quad([[-o.width*.4,.815,-.6],[o.width*.4,.815,-.6],[o.width*.4,.815,.6],[-o.width*.4,.815,.6]].map(p=>m.transform(o,p)),[0,1,0],'stain',[.65,.2,.13]);
        stains.quad([[-.4,.014,.8],[.4,.014,.8],[.4,.014,2.6],[-.4,.014,2.6]].map(p=>m.transform(o,p)),[0,1,0],'stain',[.5,.16,.11]);
      }
      if(o.type==='field'&&['code','pressure','dosage'].includes(o.kind)||o.type==='interactive'){
        paper(o,-.5,.012,.6,.35,.48);paper(o,.6,.014,.35,.28,.4);
      }
    }
    // Low pipes and lintels are overhead dressing; floor routes and door widths stay intact.
    for(const r of [...DUST2_ROOMS.rooms,...DUST2_ROOMS.passages]){
      const [x1,z1,x2,z2]=r.box,o={x:(x1+x2)/2,y:(z1+z2)/2,angle:Math.PI/2,baseY:r.base};
      m.box(o,0,2.85,-(z2-z1)/2+.25,x2-x1,.12,.12,'metal',[.36,.29,.23]);
      m.box(o,-(x2-x1)/2+.25,2.9,0,.08,.08,z2-z1,'metal',[.28,.31,.29]);
      if(r.door)this.fixture(m,renderer,o.x,o.y,r.base,2.94,r.id==='dispatch');
      else for(let x=x1+3;x<x2;x+=8)this.fixture(m,renderer,x,o.y,r.base,2.94,x>x1+6);
    }
    // Existing corridor centres: hanging cables stay above the standing/jumping envelope.
    for(const [x,z,base,w]of[[49,105,7.92,3],[26,26,4.68,3.4],[20,53,5.58,3],[96,55,4.68,3],[126,59,4.68,3.2]]){
      const o={x,y:z,baseY:base,angle:Math.PI/2};
      for(let n=0;n<9;n++){const side=(n/8-.5)*w,h=3.4-.35*Math.sin(n/8*Math.PI);m.box(o,side,h,0,w/8+.015,.035,.035,'metal',[.1,.13,.12]);}
      this.fixture(m,renderer,x,z,base,3.7);
    }
    renderer.stains=renderer.upload(stains,renderer.stains);
  },
  nearest(renderer,eye){
    if(!renderer.lightEye||Math.hypot(...eye.map((v,i)=>v-renderer.lightEye[i]))>1){
      renderer.lightEye=[...eye];
      renderer.activeLights=renderer.lights.map(l=>({l,d:Math.hypot(l.x-eye[0],l.y-eye[1],l.z-eye[2])})).filter(v=>v.d<v.l.radius+10).sort((a,b)=>a.d-b.d).slice(0,8).map(v=>v.l);
    }
    const pos=new Float32Array(32),colors=new Float32Array(24);
    (renderer.activeLights||[]).forEach((l,i)=>{pos.set([l.x,l.y,l.z,l.radius],i*4);colors.set(l.color,i*3);});return{pos,colors};
  }
};
