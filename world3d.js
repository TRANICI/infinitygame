"use strict";
/* WebGL scene: world-fixed furniture, real perspective and per-pixel depth. */
class WardMesh {
  constructor(atlas){this.atlas=atlas;this.data=[];}
  vertex(p,n,uv,color,glow){this.data.push(...p,...n,...uv,...color,glow);}
  quad(points,n,tile='white',color=[1,1,1],glow=0){
    const uv=this.atlas[tile]||this.atlas.white;
    const coords=[[uv[0],uv[1]],[uv[2],uv[1]],[uv[2],uv[3]],[uv[0],uv[3]]];
    for(const i of[0,1,2,0,2,3])this.vertex(points[i],n,coords[i],color,glow);
  }
  transform(o,p){const a=o.angle??Math.PI/2,c=Math.cos(a),s=Math.sin(a);return[o.x+p[0]*s+p[2]*c,p[1]+(o.baseY||0),o.y-p[0]*c+p[2]*s];}
  normal(o,n){const a=o.angle??Math.PI/2,c=Math.cos(a),s=Math.sin(a);return[n[0]*s+n[2]*c,n[1],-n[0]*c+n[2]*s];}
  box(o,x,y,z,w,h,d,tile='white',color=[1,1,1],glow=0){
    const l=x-w/2,r=x+w/2,b=y,t=y+h,f=z+d/2,k=z-d/2;
    const faces=[
      [[[l,b,f],[r,b,f],[r,t,f],[l,t,f]],[0,0,1]],
      [[[r,b,k],[l,b,k],[l,t,k],[r,t,k]],[0,0,-1]],
      [[[r,b,f],[r,b,k],[r,t,k],[r,t,f]],[1,0,0]],
      [[[l,b,k],[l,b,f],[l,t,f],[l,t,k]],[-1,0,0]],
      [[[l,t,f],[r,t,f],[r,t,k],[l,t,k]],[0,1,0]],
      [[[l,b,k],[r,b,k],[r,b,f],[l,b,f]],[0,-1,0]]
    ];
    for(const[points,n]of faces)this.quad(points.map(p=>this.transform(o,p)),this.normal(o,n),tile,color,glow);
  }
  panel(o,y,w,h,z,tile,color=[1,1,1],glow=0){
    this.quad([[-w/2,y,z],[w/2,y,z],[w/2,y+h,z],[-w/2,y+h,z]].map(p=>this.transform(o,p)),this.normal(o,[0,0,1]),tile,color,glow);
  }
  sphere(x,y,z,rx,ry,rz,color,rings=10,slices=16){
    const point=(a,b)=>[x+Math.sin(a)*Math.cos(b)*rx,y+Math.cos(a)*ry,z+Math.sin(a)*Math.sin(b)*rz];
    for(let i=0;i<rings;i++)for(let j=0;j<slices;j++){
      const a=i*Math.PI/rings,b=j*WZ.TAU/slices,c=(i+1)*Math.PI/rings,d=(j+1)*WZ.TAU/slices;
      const points=[point(a,b),point(a,d),point(c,d),point(c,b)];
      const uv=this.atlas.white,tex=[(uv[0]+uv[2])/2,(uv[1]+uv[3])/2];
      for(const k of[0,1,2,0,2,3]){const p=points[k],n=[(p[0]-x)/(rx*rx),(p[1]-y)/(ry*ry),(p[2]-z)/(rz*rz)],len=Math.hypot(...n);this.vertex(p,n.map(v=>v/len),tex,color,0);}
    }
  }
}
class WardRenderer {
  constructor(canvas){
    this.canvas=canvas;
    const gl=canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'high-performance'});
    if(!gl)return new WardLegacyRenderer(canvas);
    this.gl=gl;this.kind='webgl';this.assets=new WardLegacyRenderer(document.createElement('canvas'));this.worldKey='';
    this.program=this.programFrom(
      'attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aUV;attribute vec3 aColor;attribute float aGlow;uniform mat4 uVP;uniform mat4 uModel;varying vec3 vWorld;varying vec3 vNormal;varying vec2 vUV;varying vec3 vColor;varying float vGlow;void main(){vec4 world=uModel*vec4(aPosition,1.0);vWorld=world.xyz;vNormal=mat3(uModel)*aNormal;vUV=aUV;vColor=aColor;vGlow=aGlow;gl_Position=uVP*world;}',
      'precision mediump float;uniform sampler2D uAtlas;uniform vec4 uFloorTile;uniform vec3 uEye;uniform vec3 uForward;uniform vec3 uFog;uniform float uTorch;varying vec3 vWorld;varying vec3 vNormal;varying vec2 vUV;varying vec3 vColor;varying float vGlow;void main(){vec2 uv=vGlow<0.0?mix(uFloorTile.xy,uFloorTile.zw,fract(vWorld.xz*.7)):vUV;vec4 tex=texture2D(uAtlas,uv);if(tex.a<0.12)discard;float dist=length(vWorld-uEye);float diffuse=0.78+0.22*max(0.0,dot(normalize(vNormal),normalize(vec3(-0.4,1.0,0.3))));vec3 ray=normalize(vWorld-uEye);float beam=pow(max(0.0,dot(ray,uForward)),18.0)*uTorch*0.17/(1.0+dist*0.08);float light=mix(diffuse+beam,1.0,clamp(vGlow,0.0,1.0));vec3 color=tex.rgb*vColor*light;float fog=clamp((dist-25.0)/170.0,0.0,0.23);gl_FragColor=vec4(mix(color,uFog,fog),tex.a);}'
    );
    gl.useProgram(this.program);this.uniform={};for(const n of['uVP','uModel','uFloorTile','uAtlas','uEye','uForward','uFog','uTorch'])this.uniform[n]=gl.getUniformLocation(this.program,n);
    this.attributes=[['aPosition',3],['aNormal',3],['aUV',2],['aColor',3],['aGlow',1]].map(([name,size])=>[gl.getAttribLocation(this.program,name),size]);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    this.texture=gl.createTexture();this.makeTextures();this.resize();window.addEventListener('resize',()=>this.resize());
  }
  programFrom(vs,fs){
    const gl=this.gl,p=gl.createProgram();
    for(const[type,source]of[[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);}
    gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;
  }
  resize(){const ratio=Math.min(1,1440/innerWidth);this.w=this.canvas.width=Math.round(innerWidth*ratio);this.h=this.canvas.height=Math.round(innerHeight*ratio);this.gl.viewport(0,0,this.w,this.h);}
  makeTextures(){
    this.assets.makeTextures();const atlas=document.createElement('canvas');atlas.width=atlas.height=1024;const c=atlas.getContext('2d');this.tiles={};let index=0;
    const add=(name,source)=>{const x=(index%8)*128,y=Math.floor(index/8)*128;this.tiles[name]=[(x+2)/1024,(y+126)/1024,(x+126)/1024,(y+2)/1024];c.drawImage(source,x+2,y+2,124,124);index++;};
    this.assets.textures.forEach((tex,i)=>{
      if(WZ.levelIndex===0){
        const t=document.createElement('canvas');t.width=t.height=128;const x=t.getContext('2d'),r=WZ.random(200+i);
        x.fillStyle=['#d9cba5','#d5c5a1','#dfd1b0','#d3c3a2','#e0d3b3','#d6c8a7'][i];x.fillRect(0,0,128,128);
        for(let j=0;j<1700;j++){x.fillStyle=j%2?'#ffffff13':'#826e4c0c';x.fillRect(r()*128,r()*128,1+r()*3,1+r()*2);}
        x.fillStyle='#a9987419';x.fillRect(0,116,128,12);tex=t;
      }add('wall'+i,tex);
    });
    for(const name of['ticket','photo','valve','beacon','terminal','locker','exit','note'])add(name,this.assets.sprites[name]);
    const tile=(name,draw)=>{const t=document.createElement('canvas');t.width=t.height=128;draw(t.getContext('2d'));add(name,t);};
    tile('white',x=>{x.fillStyle='#ffffff';x.fillRect(0,0,128,128);});
    tile('floor',x=>{
      const theme=WZ.level.theme,colors={yellow:['#c2b184','#b9a77e'],pool:['#a7d7df','#b3dfe4'],play:['#bfd1d9','#e3cbd0'],station:['#b8c7c7','#c4cece']}[theme];
      x.fillStyle=colors[0];x.fillRect(0,0,128,128);x.fillStyle=colors[1];x.fillRect(0,0,64,64);x.fillRect(64,64,64,64);
      const r=WZ.random(97);for(let i=0;i<1400;i++){x.fillStyle=i%2?'#ffffff10':'#675e4a0b';x.fillRect(r()*128,r()*128,2,2);}
      if(theme!=='yellow'){x.strokeStyle='#7a979733';x.strokeRect(.5,.5,127,127);x.beginPath();x.moveTo(64,0);x.lineTo(64,128);x.moveTo(0,64);x.lineTo(128,64);x.stroke();}
    });
    tile('ceiling',x=>{x.fillStyle='#e4e7dc';x.fillRect(0,0,128,128);x.strokeStyle='#c3c9c0';x.strokeRect(.5,.5,127,127);});
    tile('wood',x=>{x.fillStyle='#bcaa82';x.fillRect(0,0,128,128);x.strokeStyle='#9e8d69';for(let i=0;i<128;i+=16){x.strokeRect(i,0,16,128);}x.strokeStyle='#ddd0a5';x.lineWidth=8;x.strokeRect(5,5,118,118);});
    tile('metal',x=>{x.fillStyle='#a5bab0';x.fillRect(0,0,128,128);x.strokeStyle='#c9d6c7';x.strokeRect(3,3,122,122);});
    this.signs=[];
    for(const[text,x,y]of WZ.level.labels){
      if(WZ.solid(x,y))continue;
      let nearest=null;
      for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]])for(let step=.1;step<5;step+=.1){const px=x+dx*step,py=y+dy*step;if(WZ.solid(px,py)){if(!nearest||step<nearest.distance)nearest={x:px-dx*.09,y:py-dy*.09,angle:Math.atan2(-dy,-dx),distance:step};break;}}
      if(!nearest)continue;
      const name='sign'+this.signs.length;
      const t=document.createElement('canvas');t.width=256;t.height=80;const x2=t.getContext('2d');x2.fillStyle='#789387';x2.fillRect(0,0,256,80);x2.strokeStyle='#d8e3c4';x2.strokeRect(3,3,250,74);x2.fillStyle='#fff4d6';x2.textAlign='center';x2.font='20px "Microsoft YaHei"';x2.fillText(text,128,34);x2.font='11px monospace';x2.fillText('LEVEL 0'+(WZ.levelIndex+1)+'  /  WAYFINDING',128,61);add(name,t);
      this.signs.push({...nearest,tile:name,baseY:WZ.groundHeight(nearest.x,nearest.y)??0});
    }
    const gl=this.gl;gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    this.bunny=this.upload(this.bunnyMesh(),this.bunny);this.hand=this.upload(this.handMesh(),this.hand);this.worldKey='';
  }
  upload(mesh,previous){
    const gl=this.gl,buffer=previous?.buffer||gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh.data),gl.STATIC_DRAW);return{buffer,count:mesh.data.length/12};
  }
  bunnyMesh(){
    const m=new WardMesh(this.tiles),cream=[.98,.95,.85],pink=[.91,.65,.67],dark=[.29,.4,.35];
    m.sphere(0,.43,0,.34,.36,.28,cream);m.sphere(0,.87,0,.34,.29,.29,[1,.98,.9]);
    for(const sign of[-1,1]){m.sphere(sign*.18,1.2,-.02,.09,.29,.075,cream);m.sphere(sign*.18,1.22,.05,.042,.18,.025,pink);m.sphere(sign*.115,.91,.267,.026,.039,.018,dark);m.sphere(sign*.2,.81,.257,.055,.032,.018,pink);m.sphere(sign*.23,.1,.08,.12,.085,.14,cream);m.sphere(sign*.36,.46,.02,.1,.17,.12,cream);}
    m.sphere(0,.835,.292,.026,.019,.016,pink);m.sphere(-.026,.787,.285,.025,.009,.008,[.7,.5,.45]);m.sphere(.026,.787,.285,.025,.009,.008,[.7,.5,.45]);
    m.box({x:0,y:0,angle:Math.PI/2},0,.575,.02,.53,.075,.45,'white',[.6,.79,.68]);m.sphere(0,.54,.265,.045,.045,.018,[.9,.75,.41]);return m;
  }
  handMesh(){
    const m=new WardMesh(this.tiles),o={x:0,y:0,angle:Math.PI/2};
    m.box(o,.3,-.37,-.48,.12,.11,.14,'white',[.74,.72,.57]);m.box(o,.29,-.31,-.56,.07,.075,.27,'metal',[.27,.39,.3]);m.box(o,.29,-.32,-.71,.115,.1,.055,'metal',[.6,.67,.5]);m.box(o,.29,-.3,-.744,.085,.07,.005,'white',[.99,.99,.78],1);return m;
  }
  object(mesh,o,taken,power){
    const w=o.width,d=o.depth;
    if(o.type==='bench'){
      for(const x of[-w*.4,w*.4])for(const z of[-d*.3,d*.3])mesh.box(o,x,0,z,.11,.5,.11,'metal',[.62,.72,.66]);
      mesh.box(o,0,.48,0,w,.12,d,'wood');mesh.box(o,0,.6,-d*.4,w,.48,.1,'metal',[.67,.8,.77]);return;
    }
    if(o.type==='wall'||o.type==='door'||o.type==='step'){mesh.box(o,0,0,0,w,o.bodyHeight,d,o.type==='door'?'wood':'wall0');return;}
    if(o.type==='crate'){mesh.box(o,0,0,0,w,o.bodyHeight,d,'wood');return;}
    if(o.type==='exit'){
      for(const x of[-.83,.83])mesh.box(o,x,0,0,.14,2.35,.2,'metal',[.64,.72,.63]);
      mesh.box(o,0,2.21,0,1.8,.14,.2,'metal',[.64,.72,.63]);mesh.box(o,0,0,0,1.52,2.21,.13,'metal',[.82,.87,.77]);
      mesh.panel(o,.04,1.48,2.15,.074,'exit');mesh.box(o,0,2.38,0,.86,.22,.18,'white',power?[.65,.89,.64]:[.81,.8,.63],.5);return;
    }
    if(o.type==='locker'){
      mesh.box(o,0,0,0,w,2.15,d,'metal',[.77,.87,.77]);mesh.panel(o,.04,w-.06,2.07,d/2+.006,'locker');mesh.box(o,.31,.96,d/2+.035,.035,.18,.035,'white',[.93,.91,.73]);return;
    }
    if(o.type==='generator'){
      mesh.box(o,0,0,0,w,1.45,d,'metal',[.83,.9,.8]);mesh.panel(o,.05,w-.05,1.35,d/2+.006,'terminal');
      for(let i=0;i<3;i++)mesh.box(o,-.26+i*.26,1.45,0,.14,.035,.14,'white',power?[.62,.87,.61]:[.91,.77,.47],.8);return;
    }
    if(o.type==='note'){
      for(const x of[-.2,.2])mesh.box(o,x,0,0,.06,.79,.32,'metal');
      mesh.box(o,0,.78,0,w,.055,d,'wood');
      mesh.quad([[-.23,.841,-.19],[.23,.841,-.19],[.23,.841,.19],[-.23,.841,.19]].map(p=>mesh.transform(o,p)),[0,1,0],'note');return;
    }
    if(o.type==='fuse'){
      mesh.box(o,0,0,0,w,.65,d,'metal',[.8,.86,.76]);
      if(taken){mesh.box(o,0,.65,0,.26,.025,.26,'white',[.62,.83,.59],.7);return;}
      const tile={yellow:'ticket',pool:'valve',play:'photo',station:'beacon'}[WZ.level.theme];
      mesh.box(o,0,.65,0,.06,.28,.06,'metal');mesh.panel(o,.72,.42,.58,.04,tile);return;
    }
  }
  buildWorld(g){
    const m=new WardMesh(this.tiles),ceiling=2.6;
    if(WZ.level.reference)this.buildReference(m);
    else for(let z=0;z<WZ.height;z++)for(let x=0;x<WZ.width;x++){
      if(WZ.cells[z][x])continue;
      m.quad([[x,0,z],[x+1,0,z],[x+1,0,z+1],[x,0,z+1]],[0,1,0],'floor');
      m.quad([[x,ceiling,z+1],[x+1,ceiling,z+1],[x+1,ceiling,z],[x,ceiling,z]],[0,-1,0],'ceiling');
      const tile='wall'+Math.abs(x*3+z*7)%6;
      if(WZ.solid(x-1,z))m.quad([[x,0,z+1],[x,0,z],[x,ceiling,z],[x,ceiling,z+1]],[1,0,0],tile);
      if(WZ.solid(x+1,z))m.quad([[x+1,0,z],[x+1,0,z+1],[x+1,ceiling,z+1],[x+1,ceiling,z]],[-1,0,0],tile);
      if(WZ.solid(x,z-1))m.quad([[x,0,z],[x+1,0,z],[x+1,ceiling,z],[x,ceiling,z]],[0,0,1],tile);
      if(WZ.solid(x,z+1))m.quad([[x+1,0,z+1],[x,0,z+1],[x,ceiling,z+1],[x+1,ceiling,z+1]],[0,0,-1],tile);
      if(x%4===0&&z%4===0)m.quad([[x+.3,2.58,z+.1],[x+.7,2.58,z+.1],[x+.7,2.58,z+.9],[x+.3,2.58,z+.9]],[0,-1,0],'white',[1,.99,.83],1);
    }
    for(const o of g.objects)this.object(m,o,!!o.taken,g.power);
    for(const sign of this.signs)m.panel(sign,1.55,1.3,.4,0,sign.tile,[1,1,1],.1);
    this.world=this.upload(m,this.world);
  }
  buildReference(m){
    const scale=DUST2_LAYOUT.scale,terrain=WZ.terrain,height=4.5;
    if(!this.referenceFloor){
      const floor=new WardMesh(this.tiles);
      const inside=(x,y,polygon)=>{let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
        const a=polygon[i],b=polygon[j];if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;}return hit;};
      const a=terrain.architecture,{width,height,step,quantum}=a;
      for(const [layer,deck]of[[a.lower,false],[a.upper,true]]){
        // Greedy horizontal runs give every landing a flat top and a solid base.
        for(let z=0;z<height;z++)for(let x=0;x<width;){
          const value=layer[z*width+x];if(value<0){x++;continue;}
          const start=x;while(x<width&&layer[z*width+x]===value)x++;
          const y=value*quantum,x0=start*step,x1=x*step,z0=z*step,z1=z0+step;
          const green=DUST2_SCENE.green.some(p=>inside((x0+x1)/2/scale,(z0+z1)/2/scale,p)),color=green?[.89,1,.83]:[.87,.96,1];
          const points=[[x0,y,z0],[x1,y,z0],[x1,y,z1],[x0,y,z1]];
          for(const i of[0,1,2,0,2,3])floor.vertex(points[i],[0,1,0],[0,0],color,-1);
          if(deck)floor.quad(points.map(p=>[p[0],p[1]-.4,p[2]]),[0,-1,0],'ceiling');
        }
        for(let z=0;z<height;z++)for(let x=0;x<width;x++){
          const v=layer[z*width+x];if(v<0)continue;const y=v*quantum,x0=x*step,z0=z*step;
          for(const[dx,dz]of[[-1,0],[1,0],[0,-1],[0,1]]){
            const nx=x+dx,nz=z+dz,n=nx<0||nz<0||nx>=width||nz>=height?-1:layer[nz*width+nx];
            if(n>=v)continue;
            const bottom=deck?Math.max(y-.4,n>=0?n*quantum:y-.4):n>=0?n*quantum:-.4;
            let p;if(dx){const xx=x0+(dx>0?step:0);p=[[xx,bottom,z0],[xx,bottom,z0+step],[xx,y,z0+step],[xx,y,z0]];}
            else{const zz=z0+(dz>0?step:0);p=[[x0,bottom,zz],[x0+step,bottom,zz],[x0+step,y,zz],[x0,y,zz]];}
            floor.quad(p,[dx,0,dz],'wall0',[.84,.83,.72]);
          }
        }
      }
      this.referenceFloor=floor.data;
    }
    for(const value of this.referenceFloor)m.data.push(value);
    for(const contour of DUST2_LAYOUT.contours){
      const edgeHeights=contour.flatMap(([x,z])=>terrain.surfaces(x*scale,z*scale,1).map(s=>s.height));
      const wallTop=(edgeHeights.length?Math.max(...edgeHeights):8)+height;
      for(let i=1;i<contour.length;i++){
      const a=contour[i-1].map(v=>v*scale),b=contour[i].map(v=>v*scale),dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),pieces=Math.ceil(length/1.3);
      for(let j=0;j<pieces;j++){
        const x=a[0]+dx*j/pieces,z=a[1]+dz*j/pieces,xx=a[0]+dx*(j+1)/pieces,zz=a[1]+dz*(j+1)/pieces;
        const surfaces=terrain.surfaces((x+xx)/2,(z+zz)/2,1),heights=surfaces.map(s=>s.height),base=-.4,top=wallTop;
        m.quad([[x,base,z],[xx,base,zz],[xx,top,zz],[x,top,z]],[-dz/length,0,dx/length],'wall'+i%6);
        m.quad([[x,top,z],[xx,top,zz],[xx,top+.15,zz],[x,top+.15,z]],[-dz/length,0,dx/length],'white',[.88,.86,.71]);
      }
    }
    }
    // Upper and lower B tunnel roofs are placed above their actual ground levels.
    for(let pz=318;pz<590;pz+=10)for(let px=80;px<290;px+=10){
      const x=px*scale,z=pz*scale,h=terrain.height(x,z);if(h===null||WZ.solid(x,z))continue;
      const top=h+height,w=10*scale;
      m.quad([[x-w/2,top,z+w/2],[x+w/2,top,z+w/2],[x+w/2,top,z-w/2],[x-w/2,top,z-w/2]],[0,-1,0],'ceiling');
    }
  }
  identity(){return[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];}
  multiply(a,b){const out=new Float32Array(16);for(let i=0;i<4;i++)for(let j=0;j<4;j++)out[j*4+i]=a[i]*b[j*4]+a[i+4]*b[j*4+1]+a[i+8]*b[j*4+2]+a[i+12]*b[j*4+3];return out;}
  camera(eye,angle,pitch){
    const forward=[Math.cos(angle)*Math.cos(pitch),Math.sin(pitch),Math.sin(angle)*Math.cos(pitch)],right=[-Math.sin(angle),0,Math.cos(angle)],up=[-Math.cos(angle)*Math.sin(pitch),Math.cos(pitch),-Math.sin(angle)*Math.sin(pitch)],back=forward.map(v=>-v);
    const dot=v=>-(v[0]*eye[0]+v[1]*eye[1]+v[2]*eye[2]);
    const view=[right[0],up[0],back[0],0,right[1],up[1],back[1],0,right[2],up[2],back[2],0,dot(right),dot(up),dot(back),1];
    const inverse=[...right,0,...up,0,...back,0,...eye,1];
    const aspect=this.w/this.h,fovy=Math.min(1.66,2*Math.atan(Math.tan(.7)/aspect)),f=1/Math.tan(fovy/2),near=.04,far=230;
    const projection=[f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0];
    return{vp:this.multiply(projection,view),forward,inverse};
  }
  draw(mesh,model){
    const gl=this.gl;gl.uniformMatrix4fv(this.uniform.uModel,false,model);gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);let offset=0;
    for(const[location,size]of this.attributes){gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,size,gl.FLOAT,false,48,offset*4);offset+=size;}
    gl.drawArrays(gl.TRIANGLES,0,mesh.count);
  }
  light(){return .85;}
  render(g,time){
    const gl=this.gl,home=g.mode==='home',p=g.player,key=WZ.levelIndex+':'+g.objects.map(o=>o.taken?'1':'0').join('')+':'+g.power;
    if(key!==this.worldKey){this.buildWorld(g);this.worldKey=key;}
    const source=home?WZ.level.start:p,angle=home?source.angle+Math.sin(time*.08)*.035:p.angle,pitch=home?-.03:p.pitch;
    const eye=[source.x,(home?(WZ.groundHeight(source.x,source.y)??0):(p.eyeElevation??p.elevation??WZ.groundHeight(p.x,p.y)??0))+(home?1.63:p.hidden?1.3:p.crouch?1.05:1.63)+(home||p.hidden?0:Math.sin(g.walkPhase)*g.moveAmount*.012),source.y],camera=this.camera(eye,angle,pitch);
    const fog={yellow:[.87,.83,.67],pool:[.72,.86,.88],play:[.86,.8,.83],station:[.83,.87,.85]}[WZ.level.theme];
    gl.clearColor(...fog,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);gl.uniformMatrix4fv(this.uniform.uVP,false,camera.vp);gl.uniform3fv(this.uniform.uEye,eye);gl.uniform3fv(this.uniform.uForward,camera.forward);gl.uniform3fv(this.uniform.uFog,fog);gl.uniform1f(this.uniform.uTorch,p.torch?1:0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.uniform1i(this.uniform.uAtlas,0);gl.uniform4fv(this.uniform.uFloorTile,this.tiles.floor);
    this.draw(this.world,this.identity());
    if(!home){
      const e=g.enemy,a=Math.atan2(p.x-e.x,p.y-e.y),c=Math.cos(a),s=Math.sin(a),hop=Math.max(0,Math.sin(time*6))*.045;
      this.draw(this.bunny,[c,0,-s,0,0,1,0,0,s,0,c,0,e.x,(e.elevation??WZ.groundHeight(e.x,e.y)??0)+hop,e.y,1]);
      if(!p.hidden){gl.clear(gl.DEPTH_BUFFER_BIT);this.draw(this.hand,camera.inverse);}
    }
  }
  drawMap(g){this.assets.drawMap(g);}
}
