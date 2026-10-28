"use strict";
/* WebGL scene: world-fixed furniture, real perspective and per-pixel depth. */
class WardMesh {
  constructor(atlas){this.atlas=atlas;this.data=[];}
  vertex(p,n,uv,color,glow,surfaceY=0){this.data.push(...p,...n,...uv,...color,glow,surfaceY);}
  quad(points,n,tile='white',color=[1,1,1],glow=0){
    if(glow===0)glow=tile==='metal'?-4:tile==='ceiling'?-5:0;
    const uv=this.atlas[tile]||this.atlas.white;
    const coords=[[uv[0],uv[1]],[uv[2],uv[1]],[uv[2],uv[3]],[uv[0],uv[3]]];
    const low=Math.min(...points.map(p=>p[1])),high=Math.max(...points.map(p=>p[1]));
    for(const i of[0,1,2,0,2,3])this.vertex(points[i],n,coords[i],color,glow,(points[i][1]-low)/Math.max(.001,high-low));
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
    this.gl=gl;this.kind='webgl';this.assets=new WardLegacyRenderer(document.createElement('canvas'));this.worldKey='';this.staticLevel=-1;
    this.program=this.programFrom(
      'attribute vec3 aPosition;attribute vec3 aNormal;attribute vec2 aUV;attribute vec3 aColor;attribute float aGlow;attribute float aSurfaceY;uniform mat4 uVP;uniform mat4 uModel;varying vec3 vWorld;varying vec3 vNormal;varying vec2 vUV;varying vec3 vColor;varying float vGlow;varying float vSurfaceY;void main(){vec4 world=uModel*vec4(aPosition,1.0);vWorld=world.xyz;vNormal=mat3(uModel)*aNormal;vUV=aUV;vColor=aColor;vGlow=aGlow;vSurfaceY=aSurfaceY;gl_Position=uVP*world;}',
      `precision mediump float;
      uniform sampler2D uAtlas;uniform sampler2D uSurfaces;
      uniform vec3 uEye;uniform vec3 uForward;uniform vec3 uFog;uniform float uTorch;
      uniform vec4 uLights[8];uniform vec3 uLightColors[8];
      varying vec3 vWorld;varying vec3 vNormal;varying vec2 vUV;varying vec3 vColor;varying float vGlow;varying float vSurfaceY;
      float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*437.5);}
      void main(){
        vec3 n=normalize(vNormal),an=abs(n),toEye=uEye-vWorld;float dist=length(toEye);
        vec3 view=toEye/max(dist,.001);vec4 tex;
        bool surface=vGlow<0.0;bool floorSurface=vGlow> -2.5&&surface;
        if(surface){
          vec2 plane=an.y>.5?vWorld.xz:an.x>.5?vWorld.zy:vWorld.xy;
          vec2 repeat=fract(plane*(floorSurface?.48:vGlow< -4.5?.28:.3));
          if(vGlow> -3.5&&!floorSurface)repeat.y=clamp(1.0-vSurfaceY,.01,.99);
          vec2 tile=floorSurface?vec2(.5,0.0):vGlow< -4.5?vec2(.5,.5):vGlow< -3.5?vec2(0.0,.5):vec2(0.0,0.0);
          tex=texture2D(uSurfaces,tile+vec2(.002)+repeat*.496);
        }else tex=texture2D(uAtlas,vUV);
        if(tex.a<.045)discard;
        vec3 ambient=vec3(.105,.135,.15)*(0.72+max(0.0,n.y)*.45);
        vec3 lighting=ambient;float specular=0.0;
        for(int i=0;i<8;i++){
          vec3 delta=uLights[i].xyz-vWorld;float d=length(delta),radius=max(.01,uLights[i].w);
          vec3 dir=delta/max(d,.01);float falloff=pow(max(0.0,1.0-d/radius),2.0);
          lighting+=uLightColors[i]*falloff*(.12+.88*max(0.0,dot(n,dir)))*1.7;
          specular+=pow(max(0.0,dot(n,normalize(dir+view))),48.0)*falloff*.22;
        }
        float cone=smoothstep(.86,.995,dot(-view,uForward));
        float beam=cone*uTorch*1.9/(1.0+dist*.075+dist*dist*.008);
        lighting+=vec3(1.0,.91,.76)*beam*(.28+.72*max(0.0,dot(n,view)));
        vec3 albedo=tex.rgb*vColor;
        float grime=surface?.86+.14*sin(vWorld.x*.7+sin(vWorld.z*.44)+vWorld.y*.6):1.0;
        // Deliberate broad bands of light keep the image graphic and restrained.
        lighting=mix(lighting,floor(lighting*7.0+.2)/7.0,.45);
        vec3 color=albedo*grime*lighting;
        if(floorSurface){float wet=smoothstep(.3,.8,sin(vWorld.x*.53+sin(vWorld.z*.34))*cos(vWorld.z*.65));color+=vec3(.32,.4,.38)*wet*specular;}
        color=mix(color,albedo,clamp(vGlow,0.0,1.0));
        float luminance=dot(color,vec3(.2126,.7152,.0722));color=mix(vec3(luminance),color,.78);
        color=max(vec3(0.0),(color-vec3(.012))*1.12);
        float fog=1.0-exp(-max(0.0,dist-5.0)*.025);color=mix(color,uFog,min(.95,fog));
        gl_FragColor=vec4(color,tex.a);
      }`
    );
    gl.useProgram(this.program);this.uniform={};for(const n of['uVP','uModel','uSurfaces','uLights[0]','uLightColors[0]','uAtlas','uEye','uForward','uFog','uTorch'])this.uniform[n]=gl.getUniformLocation(this.program,n);
    this.attributes=[['aPosition',3],['aNormal',3],['aUV',2],['aColor',3],['aGlow',1],['aSurfaceY',1]].map(([name,size])=>[gl.getAttribLocation(this.program,name),size]);
    gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    this.texture=gl.createTexture();this.surface=WardAtmosphere.material(gl);this.makeTextures();this.resize();window.addEventListener('resize',()=>this.resize());
  }
  programFrom(vs,fs){
    const gl=this.gl,p=gl.createProgram();
    for(const[type,source]of[[gl.VERTEX_SHADER,vs],[gl.FRAGMENT_SHADER,fs]]){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);}
    gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;
  }
  resize(){const ratio=Math.min(1,1440/innerWidth);this.w=this.canvas.width=Math.round(innerWidth*ratio);this.h=this.canvas.height=Math.round(innerHeight*ratio);this.gl.viewport(0,0,this.w,this.h);}
  makeTextures(){
    this.assets.makeTextures();const atlas=document.createElement('canvas');
    // Reserve space for room signs and controls as the level grows.
    const needed=64+DUST2_ANNEX.signs.length+DUST2_ANNEX.objects.filter(o=>o.type==='puzzle').length+WZ.level.labels.length+DUST2_ROOMS.rooms.length+DUST2_ROOMS.objects.filter(o=>o.type==='interactive').length;
    const size=2**Math.ceil(Math.log2(Math.ceil(Math.sqrt(needed))*128)),columns=size/128;
    atlas.width=atlas.height=size;const c=atlas.getContext('2d');this.tiles={};let index=0;
    const add=(name,source)=>{if(index>=columns*columns)throw Error('Texture atlas is full');const x=(index%columns)*128,y=Math.floor(index/columns)*128;this.tiles[name]=[(x+2)/size,(y+126)/size,(x+126)/size,(y+2)/size];c.drawImage(source,x+2,y+2,124,124);index++;};
    this.assets.textures.forEach((tex,i)=>{
      if(WZ.levelIndex===0){
        const t=document.createElement('canvas');t.width=t.height=128;const x=t.getContext('2d'),r=WZ.random(200+i);
        x.fillStyle=['#aaa58c','#9b9d8d','#b5ad93','#969e91','#aaa48d','#a39f8b'][i];x.fillRect(0,0,128,128);
        for(let j=0;j<1700;j++){x.fillStyle=j%2?'#ffffff13':'#826e4c0c';x.fillRect(r()*128,r()*128,1+r()*3,1+r()*2);}
        x.fillStyle='#a9987419';x.fillRect(0,116,128,12);tex=t;
      }add('wall'+i,tex);
    });
    for(const name of['ticket','photo','valve','beacon','terminal','locker','exit','note'])add(name,this.assets.sprites[name]);
    const tile=(name,draw)=>{const t=document.createElement('canvas');t.width=t.height=128;draw(t.getContext('2d'));add(name,t);};
    tile('white',x=>{x.fillStyle='#ffffff';x.fillRect(0,0,128,128);});
    tile('floor',x=>{
      const theme=WZ.level.theme,colors={yellow:['#8b8975','#817e6c'],pool:['#a7d7df','#b3dfe4'],play:['#bfd1d9','#e3cbd0'],station:['#b8c7c7','#c4cece']}[theme];
      x.fillStyle=colors[0];x.fillRect(0,0,128,128);x.fillStyle=colors[1];x.fillRect(0,0,64,64);x.fillRect(64,64,64,64);
      const r=WZ.random(97);for(let i=0;i<1400;i++){x.fillStyle=i%2?'#ffffff10':'#675e4a0b';x.fillRect(r()*128,r()*128,2,2);}
      if(theme!=='yellow'){x.strokeStyle='#7a979733';x.strokeRect(.5,.5,127,127);x.beginPath();x.moveTo(64,0);x.lineTo(64,128);x.moveTo(0,64);x.lineTo(128,64);x.stroke();}
    });
    tile('annex-floor',x=>{x.fillStyle='#a9bfb5';x.fillRect(0,0,128,128);x.fillStyle='#b6c8be';x.fillRect(0,0,64,64);x.fillRect(64,64,64,64);x.strokeStyle='#879f9680';for(const [a,b]of[[0,0],[64,0],[0,64],[64,64]])x.strokeRect(a+.5,b+.5,63,63);});
    tile('ceiling',x=>{x.fillStyle='#e4e7dc';x.fillRect(0,0,128,128);x.strokeStyle='#c3c9c0';x.strokeRect(.5,.5,127,127);});
    tile('wood',x=>{x.fillStyle='#bcaa82';x.fillRect(0,0,128,128);x.strokeStyle='#9e8d69';for(let i=0;i<128;i+=16){x.strokeRect(i,0,16,128);}x.strokeStyle='#ddd0a5';x.lineWidth=8;x.strokeRect(5,5,118,118);});
    tile('metal',x=>{x.fillStyle='#a5bab0';x.fillRect(0,0,128,128);x.strokeStyle='#c9d6c7';x.strokeRect(3,3,122,122);});
    tile('curtain',x=>{x.fillStyle='#8a8a74';x.fillRect(0,0,128,128);const r=WZ.random(45);for(let i=0;i<1500;i++){x.fillStyle=i%3?'#17201c13':'#5c43222b';x.fillRect(r()*128,r()*128,1+r()*12,1+r()*25);}for(let i=0;i<128;i+=9){x.fillStyle='#151e191c';x.fillRect(i,0,3,128);}x.strokeStyle='#303a2966';x.lineWidth=2;x.beginPath();x.moveTo(19,17);x.lineTo(25,53);x.lineTo(21,85);x.stroke();});
    tile('staff-badge',x=>{x.fillStyle='#baad8c';x.fillRect(0,0,128,128);x.fillStyle='#292d27';x.fillRect(16,18,34,45);x.font='bold 17px sans-serif';x.fillText('林秋',58,43);x.font='13px monospace';x.fillText('0217',20,88);x.strokeStyle='#564735';x.strokeRect(7,6,114,116);});
    tile('stain',x=>{x.clearRect(0,0,128,128);x.fillStyle='#932f20';x.beginPath();x.moveTo(20,8);x.lineTo(70,18);x.lineTo(103,43);x.lineTo(83,59);x.lineTo(92,96);x.lineTo(56,82);x.lineTo(39,121);x.lineTo(30,69);x.lineTo(8,56);x.closePath();x.fill();for(let n=0;n<4;n++)x.fillRect(35+n*11,3+n*4,5,36);});
    if(WZ.levelIndex===0){
      for(const detail of DUST2_SCENE.scenery.filter(o=>o.type==='board'))tile('board-'+detail.id,x=>{
        x.fillStyle='#e9dabc';x.fillRect(0,0,128,128);x.strokeStyle='#977b52';x.lineWidth=3;x.strokeRect(6,6,116,116);
        x.textAlign='center';x.fillStyle='#405d59';x.font='bold 11px "Microsoft YaHei"';x.fillText(detail.text,64,53,114);
        x.font='8px "Microsoft YaHei"';x.fillText(detail.sub,64,79,112);x.font='9px monospace';x.fillText('WARD ZERO',64,106);
      });
      for(const letter of['A','B'])tile('mark-'+letter,x=>{x.clearRect(0,0,128,128);x.strokeStyle='#c17e53';x.lineWidth=4;x.strokeRect(7,7,114,114);x.fillStyle='#c17e53';x.font='bold 86px sans-serif';x.textAlign='center';x.fillText(letter==='A'?'急':'候',64,98);});
    }
    for(const [i,label] of ['录音机','支路配电','档案抽屉','呼叫铃'].entries())tile('device-'+i,x=>{x.fillStyle='#344c4b';x.fillRect(0,0,128,128);x.fillStyle='#f0e4c4';x.textAlign='center';x.font='bold 18px "Microsoft YaHei"';x.fillText(label,64,48);x.font='12px sans-serif';x.fillText(['PLAY / 02:17','POWER','ARCHIVE','CALL'][i],64,80);});
    for(const sign of DUST2_ANNEX.signs)tile('annex-sign-'+DUST2_ANNEX.signs.indexOf(sign),x=>{
      x.fillStyle='#d7dfc6';x.fillRect(0,0,128,128);x.strokeStyle='#557367';x.strokeRect(4,4,120,120);x.fillStyle='#365c52';x.textAlign='center';x.scale(1,4);x.font='bold 15px "Microsoft YaHei"';x.fillText(sign.text,64,14,116);x.font='8px "Microsoft YaHei"';x.fillText(sign.sub,64,25,114);
    });
    for(const o of DUST2_ANNEX.objects.filter(o=>o.type==='puzzle'))tile('puzzle-'+o.id,x=>{
      x.fillStyle='#304e49';x.fillRect(0,0,128,128);x.fillStyle='#efe5c7';x.textAlign='center';x.font='bold 19px "Microsoft YaHei"';x.fillText(o.text,64,45,112);x.font='18px Consolas';x.fillText(o.kind==='relay'?'A / B / C':o.kind==='keypad'?'_ _ _ _':o.kind==='seal'?o.symbol:'02 : 17',64,85);
    });
    tile('annex-clock',x=>{x.fillStyle='#eee4c9';x.fillRect(0,0,128,128);x.fillStyle='#4c685b';x.textAlign='center';x.scale(1,2);x.font='bold 32px Consolas';x.fillText('02:17',64,35);x.font='9px sans-serif';x.fillText('SHIFT / 217',64,53);});
    tile('annex-number',x=>{x.fillStyle='#42685e';x.fillRect(0,0,128,128);x.strokeStyle='#bfcbae';x.lineWidth=2;x.strokeRect(4,4,120,120);x.fillStyle='#ece5c7';x.textAlign='center';x.scale(1,3);x.font='bold 28px Consolas';x.fillText('217',64,32);});
    for(const r of DUST2_ROOMS.rooms)tile('room-sign-'+r.id,x=>{x.fillStyle='#344742';x.fillRect(0,0,128,128);x.strokeStyle='#b9ac80';x.strokeRect(3,3,122,122);x.fillStyle='#e2dbb9';x.textAlign='center';x.font='bold 24px Consolas';x.fillText(r.code,64,46);x.font='bold 16px "Microsoft YaHei"';x.fillText(r.name,64,85,118);});
    for(const o of DUST2_ROOMS.objects.filter(o=>['interactive','field'].includes(o.type)))tile('interactive-'+o.id,x=>{x.fillStyle='#28332f';x.fillRect(0,0,128,128);x.fillStyle='#d8ccb0';x.textAlign='center';x.font='bold 15px "Microsoft YaHei"';x.fillText(o.title,64,52,118);x.font='12px Consolas';x.fillText(o.kind==='repair'?'SIGNAL LOST':o.kind==='vendor'?'01 COIN':o.kind==='pressure'?'1 + 2 + 3 / 4':o.kind==='code'?'_ _ _':'02:17 / RECORD',64,88);});
    tile('cue',x=>{const g=x.createRadialGradient(64,64,2,64,64,62);g.addColorStop(0,'#fff5cb88');g.addColorStop(.25,'#fff5cb45');g.addColorStop(1,'#fff5cb00');x.fillStyle=g;x.fillRect(0,0,128,128);});
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
    this.hand=this.upload(this.handMesh(),this.hand);this.worldKey='';this.staticLevel=-1;
  }
  upload(mesh,previous){
    const gl=this.gl,buffer=previous?.buffer||gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh.data),gl.STATIC_DRAW);return{buffer,count:mesh.data.length/13};
  }
  handMesh(){
    const m=new WardMesh(this.tiles),o={x:0,y:0,angle:Math.PI/2};
    m.box(o,.3,-.37,-.48,.12,.11,.14,'white',[.74,.72,.57]);m.box(o,.29,-.31,-.56,.07,.075,.27,'metal',[.27,.39,.3]);m.box(o,.29,-.32,-.71,.115,.1,.055,'metal',[.6,.67,.5]);m.box(o,.29,-.3,-.744,.085,.07,.005,'white',[.99,.99,.78],1);return m;
  }
  object(mesh,o,taken,power){
    const w=o.width,d=o.depth;
    if(this.detailObject(mesh,o))return;
    if(o.type==='bench'){
      for(const x of[-w*.4,w*.4])for(const z of[-d*.3,d*.3])mesh.box(o,x,0,z,.11,.5,.11,'metal',[.62,.72,.66]);
      mesh.box(o,0,.48,0,w,.12,d,'wood');mesh.box(o,0,.6,-d*.4,w,.48,.1,'metal',[.67,.8,.77]);return;
    }
    if(o.type==='wall'||o.type==='door'||o.type==='step'||o.type==='retaining'){mesh.box(o,0,0,0,w,o.bodyHeight,d,o.type==='door'?'wood':'wall0');return;}
    if(o.type==='crate'){
      mesh.box(o,0,0,0,w,o.bodyHeight,d,'metal',[.68,.7,.65]);
      mesh.box(o,0,o.bodyHeight-.08,0,w+.025,.08,d+.025,'metal',[.42,.46,.43]);
      for(const side of[-1,1])mesh.box(o,side*w*.3,o.bodyHeight*.6,d/2+.01,.15,.055,.04,'metal',[.2,.22,.2]);return;
    }
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
    if(o.type==='note'||o.type==='evidence'){
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
  detailObject(m,o){
    if(o.type==='privacy-screen'){
      for(const x of[-o.width/2,o.width/2]){m.box(o,x,0,0,.055,2.25,.055,'metal',[.36,.42,.4]);m.box(o,x,.02,0,.12,.06,.65,'metal');}
      m.box(o,0,2.13,0,o.width,.05,.05,'metal',[.3,.34,.3]);
      for(let x=-o.width/2+.1;x<o.width/2;x+=.2){const hem=.28+.22*(.5+.5*Math.sin(x*17+o.x));m.box(o,x,hem,.025*Math.sin(x*22),.19,2.12-hem,.035,'curtain',[.65,.65,.53]);}return true;
    }
    if(o.type==='field'){
      if(['window','barricade','motor'].includes(o.kind)){
        for(const side of[-1,1])m.box(o,side*(o.width/2-.06),0,0,.12,o.bodyHeight,.22,'metal',[.34,.4,.36]);
        m.box(o,0,o.bodyHeight-.14,0,o.width,.14,.22,'metal',[.34,.4,.36]);
        if(o.kind==='motor'){
          m.box(o,0,o.bodyHeight,0,o.width,.3,.55,'metal',[.4,.44,.38]);
          if(!o.activated)for(let y=.05;y<o.bodyHeight-.2;y+=.25)m.box(o,0,y,0,o.width-.16,.22,.15,'metal',[.52,.55,.48]);
        }else if(!o.activated&&o.kind==='barricade'){
          for(let y=.15;y<2.8;y+=.55)m.box(o,0,y,0,o.width-.16,.27,.14,'wood',[.66,.51,.32]);
        }else if(!o.activated){
          m.box(o,0,.02,0,o.width-.16,o.bodyHeight-.2,.04,'white',[.35,.48,.45]);
          m.box(o,0,.02,.05,.07,o.bodyHeight-.2,.07,'metal');m.box(o,0,1.35,.05,o.width-.16,.08,.07,'metal');
        }
        if(o.activated&&o.kind!=='motor')for(const side of[-1,1])m.box(o,side*(o.width/2-.15),.01,0,.15,.06,.35,'wood',[.5,.42,.3]);
        return true;
      }
      if(o.kind==='clue'){
        m.box(o,0,0,0,.07,1.1,.07,'metal');m.box(o,0,0,0,.5,.05,.4,'metal');
        m.box(o,0,1.05,0,.8,.58,.06,'wood',[.55,.49,.38]);for(const face of[0,Math.PI])m.panel({...o,angle:o.angle+face},1.08,.74,.5,.04,'interactive-'+o.id);return true;
      }
      m.box(o,0,0,0,o.width,o.bodyHeight,o.depth,'metal',[.5,.54,.46]);
      for(const face of[0,Math.PI])m.panel({...o,angle:o.angle+face},.55,o.width*.88,.5,o.depth/2+.01,'interactive-'+o.id);
      for(let i=0;i<3;i++)m.box(o,(i-1)*.22,.3,o.depth/2+.03,.12,.14,.09,'metal',[.76,.69,.49]);
      m.box(o,0,1.21,0,.2,.04,.1,'white',o.activated?[.4,.62,.49]:[.78,.48,.25],.65);return true;
    }
    if(o.type==='room-door'){
      for(const side of[-1,1])m.box(o,side*o.width/2,0,0,.12,3.1,.24,'metal',[.38,.44,.41]);
      m.box(o,0,2.95,0,o.width+.12,.16,.24,'metal',[.38,.44,.41]);
      if(!o.activated){m.box(o,0,0,0,o.width-.12,2.9,.16,'wood',[.63,.63,.51]);m.box(o,o.width*.3,1.25,.12,.12,.1,.12,'metal');}
      const r=DUST2_ROOMS.rooms.find(r=>r.id===o.room);for(const face of[0,Math.PI])m.panel({...o,angle:o.angle+face},o.activated?2.97:2.05,1.2,o.activated?.24:.64,.14,'room-sign-'+r.id);return true;
    }
    if(o.type==='interactive'){
      const open=o.kind==='search'&&o.activated;
      m.box(o,0,0,0,o.width,o.bodyHeight,o.depth,o.kind==='search'?'wood':'metal',[.63,.68,.6]);
      if(o.kind==='search'){m.box(o,0,.6,open?.3:.01,o.width*.9,.23,.45,'wood',[.72,.68,.52]);m.box(o,0,.69,open?.54:.25,.25,.04,.06,'metal');}
      else m.panel(o,.45,o.width*.85,.5,o.depth/2+.01,'interactive-'+o.id);
      m.box(o,0,o.bodyHeight+.01,0,.2,.04,.12,'white',o.activated?[.45,.86,.62]:[.95,.57,.29],.7);return true;
    }
    if(o.type==='bed'){
      m.box(o,0,.35,0,o.width,.18,o.depth,'metal',[.5,.52,.47]);m.box(o,0,.53,0,o.width-.12,.24,o.depth-.12,'curtain',[.74,.7,.57]);
      m.box(o,0,.77,-o.depth*.32,o.width-.3,.09,.65,'curtain',[.64,.62,.53]);m.box(o,0,.78,.35,o.width-.13,.03,o.depth*.48,'curtain',[.4,.44,.41]);
      for(const x of[-o.width/2+.1,o.width/2-.1])for(const z of[-o.depth/2+.1,o.depth/2-.1])m.box(o,x,0,z,.1,1.05,.1,'metal');return true;
    }
    if(o.type==='washer'){
      m.box(o,0,0,0,o.width,o.bodyHeight,o.depth,'white',[.72,.82,.85]);m.box(o,0,.25,o.depth/2+.015,o.width*.68,.7,.035,'metal',[.21,.36,.39]);
      m.box(o,0,1.08,o.depth/2+.025,o.width*.8,.15,.04,'white',[.41,.54,.55]);return true;
    }
    if(o.type==='tank'){
      m.box(o,0,0,0,o.width,o.bodyHeight,o.depth,'metal',[.44,.56,.53]);
      for(const y of[.3,1.3,2.3])m.box(o,0,y,0,o.width+.1,.08,o.depth+.1,'metal',[.77,.66,.4]);return true;
    }
    if(o.type==='gate'){
      for(const x of[-o.width/2,o.width/2])m.box(o,x,0,0,.12,3.1,.2,'metal',[.37,.53,.47]);
      m.box(o,0,3,0,o.width+.12,.14,.2,'metal',[.37,.53,.47]);
      if(!o.activated){m.box(o,0,.05,0,o.width-.12,2.95,.12,'metal',[.63,.74,.65]);for(let i=-1;i<=1;i++)m.box(o,i*.6,1.6,.07,.08,.75,.04,'white',[.29,.41,.38]);}return true;
    }
    if(o.type==='puzzle'){
      const seal=o.kind==='seal';m.box(o,0,0,0,.7,seal?.82:1.4,.55,'metal',[.51,.65,.6]);
      m.panel(o,seal?.3:.76,.62,seal?.4:.55,.285,'puzzle-'+o.id);
      if(seal&&!o.activated){m.box(o,0,.82,0,.32,.14,.3,'wood',[.83,.64,.36]);m.panel(o,.86,.24,.28,.16,'puzzle-'+o.id);}
      m.box(o,0,seal?.76:1.33,.29,.35,.035,.035,'white',o.activated?[.5,.9,.6]:[.95,.75,.4],.6);return true;
    }
    if(o.type==='shelf'){
      for(const x of[-o.width/2,o.width/2])m.box(o,x,0,0,.1,o.bodyHeight,o.depth,'metal',[.5,.65,.58]);
      for(let y=.2;y<o.bodyHeight;y+=.65){m.box(o,0,y,0,o.width,.08,o.depth,'wood');for(let x=-o.width/2+.22;x<o.width/2-.1;x+=.28)m.box(o,x,y+.08,0,.2,.4,.36,'white',Math.floor(x*10)%2?[.69,.6,.43]:[.47,.63,.59]);}return true;
    }

    if(o.type==='device'){
      m.box(o,0,0,0,.65,1,.5,'metal',[.6,.7,.69]);
      m.box(o,0,.68,.26,.52,.22,.035,'white',[.2,.27,.27]);
      for(let i=0;i<o.kind+1;i++)m.box(o,-.18+i*.12,.74,.29,.06,.06,.025,'white',o.activated?[.5,1,.6]:[1,.75,.35],.5);
      if(o.kind===0)for(const x of[-.14,.14]){const p=m.transform(o,[x,.8,.3]);m.sphere(...p,.08,.08,.025,[.8,.83,.75],6,8);}
      if(o.kind===1)m.box(o,0,o.activated?.76:.68,.32,.07,.16,.08,'wood',[.85,.55,.3]);
      if(o.kind===2)m.box(o,0,.25,o.activated?.32:.27,.54,.3,o.activated?.15:.04,'wood',[.65,.57,.42]);
      if(o.kind===3){const p=m.transform(o,[0,.8,.32]);m.sphere(...p,.1,.1,.07,[.9,.65,.3],6,10);}
      m.panel(o,.08,.55,.48,.265,'device-'+o.kind);m.box(o,0,.6,.29,.3,.06,.05,'wood');return true;
    }

    const w=o.width,d=o.depth,wood=[.37,.34,.28],teal=[.29,.35,.33],terra=[.36,.33,.29];
    const globe=(x,y,z,rx,ry,rz,color)=>{const p=m.transform(o,[x,y,z]);m.sphere(...p,rx,ry,rz,color,7,10);};
    if(o.type==='column'){m.box(o,0,0,0,w,o.bodyHeight,d,'wood',wood);return true;}
    if(o.type==='pergola'){
      for(const z of[-d/2,d/2])m.box(o,0,2.78,z,w+.4,.18,.2,'wood',wood);
      for(let x=-w/2;x<=w/2;x+=.45)m.box(o,x,2.96,0,.12,.1,d+.45,'wood',wood);
      return true;
    }
    if(o.type==='planter'||o.type==='tree'){
      m.box(o,0,0,0,w,.57,d,'wall1',terra);m.box(o,0,.57,0,w+.08,.1,d+.08,'wall1',[.46,.43,.36]);m.box(o,0,.675,0,w-.1,.015,d-.1,'metal',[.12,.14,.11]);
      if(o.type==='tree'){
        m.box(o,0,.68,0,.18,1.7,.18,'wood',[.48,.38,.25]);
        for(const side of[-1,1]){m.box(o,side*.23,1.8,0,.5,.06,.07,'wood',[.3,.28,.23]);m.box(o,side*.42,1.8,0,.045,.55,.045,'wood',[.3,.28,.23]);}
      }else{
        for(let i=0;i<5;i++){const x=(i/4-.5)*w*.7;m.box(o,x,.68,Math.sin(i)*d*.2,.025,.2+(i%3)*.12,.025,'wood',[.3,.28,.2]);}
      }return true;
    }
    if(o.type==='well'){
      for(const x of[-w/2+.16,w/2-.16])m.box(o,x,0,0,.32,.9,d,'wall1');
      for(const z of[-d/2+.16,d/2-.16])m.box(o,0,0,z,w-.4,.9,.32,'wall1');
      m.box(o,0,.9,0,w-.4,.05,d-.4,'metal',[.32,.33,.28]);
      for(const x of[-w/2,w/2])m.box(o,x,0,0,.13,2.3,.13,'wood');m.box(o,0,2.3,0,w+.3,.16,.18,'wood');return true;
    }
    if(o.type==='table'||o.type==='chair'){
      const seat=o.type==='chair'?.46:.76;
      for(const x of[-w*.37,w*.37])for(const z of[-d*.37,d*.37])m.box(o,x,0,z,.075,seat,.075,'wood',wood);
      m.box(o,0,seat,0,w,.07,d,'wood');
      if(o.type==='chair')m.box(o,0,seat+.07,-d*.43,w,.46,.09,'white',teal);
      else{m.box(o,.18,seat+.07,.05,.14,.16,.14,'white',[.9,.87,.7]);m.box(o,-.18,seat+.07,-.1,.28,.012,.2,'white',[.92,.86,.7]);}
      return true;
    }
    if(o.type==='stall'){
      m.box(o,0,0,0,w,1,d,'metal',[.57,.6,.54]);m.box(o,0,1,0,w+.2,.08,d+.12,'metal',[.42,.43,.38]);
      for(const x of[-w/2,w/2])m.box(o,x,0,-d/2,.12,2.75,.12,'metal',wood);
      m.box(o,0,2.65,-d/2,w,.14,.18,'metal',[.4,.42,.36]);
      for(let x=-w/2+.15;x<w/2;x+=.32)m.box(o,x,1.08,-d/2,.035,1.57,.035,'metal',[.25,.29,.28]);
      for(let i=0;i<5;i++)m.box(o,-1.35+i*.55,1.08,0,.13,.2,.13,'metal',[.45,.39,.29]);return true;
    }
    if(o.type==='board'){
      for(const x of[-w*.32,w*.32])m.box(o,x,0,0,.09,1,.09,'wood',wood);
      m.box(o,0,.9,0,w,1.2,d,'wood',wood);m.panel(o,.96,w-.1,1.08,d/2+.008,'board-'+o.id.replace('scene-',''));return true;
    }
    if(o.type==='memory'){
      for(const x of[-.3,.3])m.box(o,x,0,0,.08,.88,.45,'wood',wood);m.box(o,0,.88,0,w,.07,d,'wood');
      if(o.kind==='watering'){
        m.box(o,-.13,.95,0,.24,.3,.24,'white',teal);m.box(o,.08,1.05,0,.26,.045,.06,'white',teal);m.box(o,-.25,1.05,0,.07,.18,.04,'white',teal);
        globe(.25,1.08,0,.1,.13,.1,o.activated?[.91,.68,.44]:[.44,.6,.36]);
      }else if(o.kind==='radio'){
        m.box(o,0,.95,0,.58,.36,.22,'wood',[.58,.41,.25]);m.box(o,-.12,1.02,.12,.23,.2,.012,'white',[.27,.34,.28]);
        m.box(o,.13,1.12,.12,.16,.07,.02,'white',o.activated?[.73,.86,.58]:[.65,.68,.49]);m.box(o,.2,1.31,0,.018,.37,.018,'metal');
      }else{
        m.box(o,-.1,.95,0,.38,.012,.3,'white',[.96,.91,.76]);m.box(o,.22,.95,0,.14,.08,.14,'white',teal);m.box(o,.22,1.03,0,.06,.14,.06,'wood');
      }
      m.box(o,0,.3,d/2+.01,.45,.23,.015,'white',o.activated?[.57,.78,.51]:[.85,.67,.39]);return true;
    }
    return false;
  }
  courtyardDetails(m){
    const scale=DUST2_LAYOUT.scale;
    for(const contour of DUST2_LAYOUT.contours)for(let i=1;i<contour.length;i++){
      const a=contour[i-1],b=contour[i],dx=(b[0]-a[0])*scale,dz=(b[1]-a[1])*scale,length=Math.hypot(dx,dz);if(length<7)continue;
      let nx=-dz/length,nz=dx/length;
      for(let t=2;t<length-1;t+=4.5){
        const x=a[0]*scale+dx*t/length,z=a[1]*scale+dz*t/length;
        if(WZ.solid(x+nx*.25,z+nz*.25)){nx=-nx;nz=-nz;}
        const ground=WZ.groundHeight(x+nx*.3,z+nz*.3);if(ground===null)continue;
        const o={x:x+nx*.04,y:z+nz*.04,baseY:ground,angle:Math.atan2(nz,nx)};
        m.box(o,0,2.55,0,1.25,1.6,.12,'metal',[.45,.47,.41]);m.box(o,0,2.63,.08,1.08,1.44,.08,'white',[.045,.055,.052]);
        for(const side of[-1,0,1])m.box(o,side*.36,2.64,.14,.035,1.42,.035,'metal',[.5,.51,.43]);m.box(o,0,3.3,.14,1.05,.05,.035,'metal',[.5,.51,.43]);m.box(o,0,2.5,.11,1.45,.12,.38,'wall0');
        if(Math.floor(t/4.5)%3===0){m.box(o,0,2.15,.1,.32,.13,.12,'metal');m.box(o,0,2.17,.18,.25,.075,.035,'white',[.8,.11,.035],.9);WardAtmosphere.light(this,o.x+nx*.3,ground+2.22,o.y+nz*.3,[.68,.075,.025],4.2);}
      }
    }
    for(const[letter,x,y]of[['A',729,126],['B',172,177]]){
      const wx=x*scale,wz=y*scale,h=WZ.groundHeight(wx,wz)+.012,r=1.65;
      m.quad([[wx-r,h,wz-r],[wx+r,h,wz-r],[wx+r,h,wz+r],[wx-r,h,wz+r]],[0,1,0],'mark-'+letter,[1,1,1],.15);
    }
  }
  buildWorld(g){
    const m=new WardMesh(this.tiles),ceiling=2.6;this.lights=[];this.lightEye=null;
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
    for(const o of g.objects)if(!o.label&&o.type!=='gate')this.object(m,o,!!o.taken,g.power);
    if(WZ.levelIndex===0){this.courtyardDetails(m);this.buildAnnex(m);this.buildCourtyardRooms(m);WardAtmosphere.dress(m,this,g);}
    for(const sign of this.signs)m.panel(sign,1.55,1.3,.4,0,sign.tile,[1,1,1],.1);
    this.world=this.upload(m,this.world);this.staticLevel=WZ.levelIndex;
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
        if(DUST2_ANNEX.contains((x+xx)/2,(z+zz)/2)||DUST2_ROOMS.contains((x+xx)/2,(z+zz)/2))continue;
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
  buildCourtyardRooms(m){
    for(const r of [...DUST2_ROOMS.rooms,...DUST2_ROOMS.passages]){
      const rects=[r.box,r.entry,...r.links||[]],x1=Math.min(...rects.map(b=>b[0])),x2=Math.max(...rects.map(b=>b[2])),z1=Math.min(...rects.map(b=>b[1])),z2=Math.max(...rects.map(b=>b[3])),h=r.base,top=h+3.2;
      const inside=(x,z)=>rects.some(b=>DUST2_ROOMS.inBox(x,z,b));
      for(let z=z1;z<z2;z+=.5)for(let x=x1;x<x2;x+=.5){
        if(!inside(x+.25,z+.25))continue;
        const floor=[[x,h+.008,z],[x+.5,h+.008,z],[x+.5,h+.008,z+.5],[x,h+.008,z+.5]];
        for(const i of[0,1,2,0,2,3])m.vertex(floor[i],[0,1,0],[0,0],r.color,-2);
        m.quad(floor.map(p=>[p[0],top,p[2]]),[0,-1,0],'ceiling',[.65,.70,.66]);
        for(const[dx,dz]of[[-1,0],[1,0],[0,-1],[0,1]]){
          const nx=x+.25+dx*.5,nz=z+.25+dz*.5;if(inside(nx,nz)||!WZ.solid(nx,nz))continue;
          const xx=x+(dx>0?.5:0),zz=z+(dz>0?.5:0),p=dx?[[xx,h,z],[xx,h,z+.5],[xx,top,z+.5],[xx,top,z]]:[[x,h,zz],[x+.5,h,zz],[x+.5,top,zz],[x,top,zz]];
          m.quad(p,[-dx,0,-dz],'wall0',[.9,.93,.86]);
          m.quad(p.map(p=>[p[0]-dx*.008,p[1]===h?h:h+.65,p[2]-dz*.008]),[-dx,0,-dz],'metal',r.color.map(v=>v*.62));
        }
      }
      const cx=(r.box[0]+r.box[2])/2,cz=(r.box[1]+r.box[3])/2;
      // Physical lamp and its pool of light are installed by WardAtmosphere.
      if(!r.door)continue;
      const walls=[[r.box[0]+.03,cz,0],[r.box[2]-.03,cz,Math.PI],[cx,r.box[1]+.03,Math.PI/2],[cx,r.box[3]-.03,-Math.PI/2]];
      walls.sort((a,b)=>Math.hypot(b[0]-r.door[0],b[1]-r.door[1])-Math.hypot(a[0]-r.door[0],a[1]-r.door[1]));
      const[x,y,angle]=walls[0];m.panel({x,y,angle,baseY:h},1.8,1.4,.8,.01,'room-sign-'+r.id);
    }
  }
  buildAnnex(m){
    const a=DUST2_ANNEX,step=.5,h=a.base,top=h+3.8,{x1,y1,x2,y2}=a.bounds;
    // Merge each row of floor/ceiling cells, then add matching perimeter walls.
    for(let z=y1;z<y2;z+=step)for(let x=x1;x<x2;){
      if(!a.contains(x+.25,z+.25)){x+=step;continue;}
      const start=x;while(x<x2&&a.contains(x+.25,z+.25))x+=step;
      const points=[[start,h+.004,z],[x,h+.004,z],[x,h+.004,z+step],[start,h+.004,z+step]];for(const i of[0,1,2,0,2,3])m.vertex(points[i],[0,1,0],[0,0],[1,1,1],-2);
      const roofStart=Math.max(start,112);if(roofStart<x)m.quad([[roofStart,top,z+step],[x,top,z+step],[x,top,z],[roofStart,top,z]],[0,-1,0],'ceiling');
    }
    for(let z=y1;z<y2;z+=step)for(let x=x1;x<x2;x+=step){
      if(!a.contains(x+.25,z+.25))continue;
      for(const[dx,dz]of[[-1,0],[1,0],[0,-1],[0,1]]){
        const nx=x+.25+dx*step,nz=z+.25+dz*step;
        if(a.contains(nx,nz)||!WZ.solid(nx,nz))continue;
        const xx=x+(dx>0?step:0),zz=z+(dz>0?step:0);
        const p=dx?[[xx,h,z],[xx,h,z+step],[xx,top,z+step],[xx,top,z]]:[[x,h,zz],[x+step,h,zz],[x+step,top,zz],[x,top,zz]];
        const room=a.roomAt(x+.25,z+.25),color=room?.color||[.83,.85,.77];
        m.quad(p,[-dx,0,-dz],'wall0',[.9,.93,.86]);
        const trim=p.map(q=>[q[0]-dx*.009,q[1]===h?h:q[1]-3.3,q[2]-dz*.009]);m.quad(trim,[-dx,0,-dz],'metal',color.map(v=>v*.7));
      }
    }
    // Flush ceiling panels and wall-mounted records avoid unsupported props.
    for(const [index,p]of a.maze.entries()){
      if(index%3===0)WardAtmosphere.fixture(m,this,p.x,p.y,h,3.62,index%2===0);
      else m.box({x:p.x,y:p.y,baseY:h,angle:Math.PI/2},0,3.65,0,1,.08,.2,'metal',[.28,.3,.27]);
      const o={x:p.x,y:p.y,baseY:h,angle:Math.PI/2};m.box(o,0,.01,0,.18,.01,.5,'white',[.62,.72,.6]);
      const wall=[[-1,0],[1,0],[0,-1],[0,1]].find(([dx,dz])=>!a.contains(p.x+dx*2,p.y+dz*2));
      if(wall){const[dx,dz]=wall;const plate={x:p.x+dx*1.485,y:p.y+dz*1.485,baseY:h,angle:Math.atan2(-dz,-dx)};m.panel(plate,1.6,1.1,.35,.01,'annex-number');}
    }
    for(const [i,sign]of a.signs.entries()){
      const o={...sign,baseY:h};for(const x of[-1.1,1.1])m.box(o,x,3.1,0,.035,.7,.035,'metal',[.39,.57,.5]);m.box(o,0,2.5,0,3.1,.6,.08,'metal',[.39,.57,.5]);m.panel(o,2.52,3,.56,.05,'annex-sign-'+i);
    }
    m.panel({x:130,y:51.02,baseY:h,angle:Math.PI/2},2.5,1.5,.65,.01,'annex-clock');
    for(const [x,y]of[[126,44],[127,59],[156,85]])WardAtmosphere.fixture(m,this,x,y,h,3.6);
    for(const room of a.rooms){const[x1,z1,x2,z2]=room.box,x=(x1+x2)/2,z=(z1+z2)/2;
      WardAtmosphere.fixture(m,this,x,z,h,3.6,room.id==='observation');
      // Colored threshold stripe ties the overhead room number to the map.
      m.quad([[x1+.2,h+.015,z1+.2],[x2-.2,h+.015,z1+.2],[x2-.2,h+.015,z1+.5],[x1+.2,h+.015,z1+.5]],[0,1,0],'white',room.color);
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
    for(const[location,size]of this.attributes){gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,size,gl.FLOAT,false,52,offset*4);offset+=size;}
    gl.drawArrays(gl.TRIANGLES,0,mesh.count);
  }
  light(){return .85;}
  drawCues(g,time,eye){
    if(g.mode!=='playing'||g.player.hidden||!g.nearby?.length)return;
    const m=new WardMesh(this.tiles);
    for(const {object:o}of g.nearby){
      if(o.taken||o.activated||o.read)continue;
      const pt=WZ.interactionPoint(g.player,o),dx=eye[0]-pt.x,dz=eye[2]-pt.y,len=Math.hypot(dx,dz)||1;
      const facing={x:pt.x+dx/len*.07,y:pt.y+dz/len*.07,baseY:o.baseY,angle:Math.atan2(dz,dx)};
      const height=Math.min(1.4,o.bodyHeight||1.2),size=.42+.035*Math.sin(time*1.8);
      m.panel(facing,height-size/2,size,size,0,'cue',o.cue==='locked'?[1,.63,.3]:[1,.96,.76],1);
    }
    this.cueMesh=this.upload(m,this.cueMesh);this.gl.depthMask(false);this.draw(this.cueMesh,this.identity());this.gl.depthMask(true);
  }
  render(g,time){
    const gl=this.gl,home=g.mode==='home',p=g.player,key=WZ.levelIndex+':'+g.objects.map(o=>o.taken||o.activated?'1':'0').join('')+':'+g.power;
    if(key!==this.worldKey){
      if(this.staticLevel!==WZ.levelIndex)this.buildWorld(g);
      const dynamic=new WardMesh(this.tiles);for(const o of g.objects)if(o.label||o.type==='gate')this.object(dynamic,o,!!o.taken,g.power);
      this.interactives=this.upload(dynamic,this.interactives);this.worldKey=key;
    }
    const source=home?WZ.level.start:p,angle=home?source.angle+Math.sin(time*.08)*.035:p.angle,pitch=home?-.03:p.pitch;
    const eye=[source.x,(home?(WZ.groundHeight(source.x,source.y)??0):(p.eyeElevation??p.elevation??WZ.groundHeight(p.x,p.y)??0))+(home?1.63:p.hidden?1.3:p.crouch?1.05:1.63)+(home||p.hidden?0:Math.sin(g.walkPhase)*g.moveAmount*.012),source.y],camera=this.camera(eye,angle,pitch);
    const fog=[.025,.035,.038],lights=WardAtmosphere.nearest(this,eye);
    gl.clearColor(...fog,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.program);gl.uniformMatrix4fv(this.uniform.uVP,false,camera.vp);gl.uniform3fv(this.uniform.uEye,eye);gl.uniform3fv(this.uniform.uForward,camera.forward);gl.uniform3fv(this.uniform.uFog,fog);gl.uniform1f(this.uniform.uTorch,p.torch?1:0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.texture);gl.uniform1i(this.uniform.uAtlas,0);
    gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,this.surface.texture);gl.uniform1i(this.uniform.uSurfaces,1);gl.uniform4fv(this.uniform['uLights[0]'],lights.pos);gl.uniform3fv(this.uniform['uLightColors[0]'],lights.colors);
    this.draw(this.world,this.identity());this.draw(this.interactives,this.identity());
    if(WZ.settings.grisly&&this.stains)this.draw(this.stains,this.identity());
    if(!home){
      WardPursuer.draw(this,g,time);
      this.drawCues(g,time,eye);
      if(!p.hidden){gl.clear(gl.DEPTH_BUFFER_BIT);this.draw(this.hand,camera.inverse);}
    }
  }
  drawMap(g,focus){this.assets.drawMap(g,focus);}
}
