"use strict";
const M4={
  identity:()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
  mul(a,b){const r=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r0=0;r0<4;r0++)for(let k=0;k<4;k++)r[c*4+r0]+=a[k*4+r0]*b[c*4+k];return r;},
  translate(x,y,z){const m=this.identity();m[12]=x;m[13]=y;m[14]=z;return m;},
  rotate(a,axis){const c=Math.cos(a),s=Math.sin(a);return axis===0?[1,0,0,0,0,c,s,0,0,-s,c,0,0,0,0,1]:axis===1?[c,0,-s,0,0,1,0,0,s,0,c,0,0,0,0,1]:[c,s,0,0,-s,c,0,0,0,0,1,0,0,0,0,1];},
  pose(x,y,z,rx=0,ry=0,rz=0){return this.mul(this.translate(x,y,z),this.mul(this.rotate(ry,1),this.mul(this.rotate(rx,0),this.rotate(rz,2))));},
  perspective(fov,aspect,near=.04,far=210){const f=1/Math.tan(fov/2);return[f/aspect,0,0,0,0,f,0,0,0,0,(far+near)/(near-far),-1,0,0,2*far*near/(near-far),0];},
  look(eye,target){const unit=v=>{const l=Math.hypot(...v);return v.map(n=>n/l);},cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],z=unit(eye.map((v,i)=>v-target[i])),x=unit(cross([0,1,0],z)),y=cross(z,x),dot=v=>-v.reduce((n,k,i)=>n+k*eye[i],0);return[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,dot(x),dot(y),dot(z),1];},
  ortho(s,n,f){return[1/s,0,0,0,0,1/s,0,0,0,0,-2/(f-n),0,0,0,-(f+n)/(f-n),1];},
  point(m,p,w=1){return[0,1,2].map(i=>m[i]*p[0]+m[i+4]*p[1]+m[i+8]*p[2]+m[i+12]*w);}
};
class DustMesh{
  constructor(){this.data=[];this.matrix=M4.identity();}
  quad(p,n,color,material=0){for(const i of[0,1,2,0,2,3])this.data.push(...M4.point(this.matrix,p[i]),...M4.point(this.matrix,n,0),...color,material);}
  box(x,y,z,w,h,d,c,mat=0){const l=x-w/2,r=x+w/2,b=y,t=y+h,k=z-d/2,f=z+d/2;for(const[p,n]of[
    [[[l,b,f],[r,b,f],[r,t,f],[l,t,f]],[0,0,1]],[[[r,b,k],[l,b,k],[l,t,k],[r,t,k]],[0,0,-1]],
    [[[r,b,f],[r,b,k],[r,t,k],[r,t,f]],[1,0,0]],[[[l,b,k],[l,b,f],[l,t,f],[l,t,k]],[-1,0,0]],
    [[[l,t,f],[r,t,f],[r,t,k],[l,t,k]],[0,1,0]],[[[l,b,k],[r,b,k],[r,b,f],[l,b,f]],[0,-1,0]]])this.quad(p,n,c,mat);}
  cylinder(x,y,z,r,h,c,mat=2,sides=10){for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2,b=(i+1)/sides*Math.PI*2,p=[x+Math.cos(a)*r,z+Math.sin(a)*r],q=[x+Math.cos(b)*r,z+Math.sin(b)*r];this.quad([[p[0],y,p[1]],[q[0],y,q[1]],[q[0],y+h,q[1]],[p[0],y+h,p[1]]],[Math.cos((a+b)/2),0,Math.sin((a+b)/2)],c,mat);this.quad([[x,y+h,z],[p[0],y+h,p[1]],[q[0],y+h,q[1]],[x,y+h,z]],[0,1,0],c,mat);}}
}
class ArenaRenderer{
  constructor(canvas,map){
    this.canvas=canvas;this.map=map;const gl=this.gl=canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'high-performance'});if(!gl)throw Error('此浏览器未启用 WebGL，请使用支持 3D 加速的浏览器。');
    this.program=this.compile(`attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aColor;attribute float aMaterial;
      uniform mat4 uVP;uniform mat4 uLight;varying vec3 vWorld;varying vec3 vNormal;varying vec3 vColor;varying float vMaterial;varying vec4 vShadow;
      void main(){vWorld=aPosition;vNormal=aNormal;vColor=aColor;vMaterial=aMaterial;vShadow=uLight*vec4(aPosition,1.0);gl_Position=uVP*vec4(aPosition,1.0);}`,`precision highp float;
      varying vec3 vWorld;varying vec3 vNormal;varying vec3 vColor;varying float vMaterial;varying vec4 vShadow;
      uniform sampler2D uDepth;uniform vec3 uEye;uniform float uShadow;uniform float uTexel;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float depth(vec2 p){return dot(texture2D(uDepth,p).rgb,vec3(1.0,1.0/255.0,1.0/65025.0));}
      void main(){vec3 n=normalize(vNormal),sun=normalize(vec3(-.45,.85,-.6));vec3 light=vec3(.52,.57,.61)*(0.85+max(n.y,0.0)*.15);float shadow=1.0;
        if(uShadow>.5){vec3 s=vShadow.xyz/vShadow.w*.5+.5;if(s.x>0.0&&s.x<1.0&&s.y>0.0&&s.y<1.0){shadow=0.0;for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)shadow+=step(s.z-max(.0012,.003*(1.0-max(0.0,dot(n,sun)))),depth(s.xy+vec2(float(x),float(y))*uTexel))/9.0;}}
        light+=vec3(.69,.59,.43)*max(dot(n,sun),0.0)*shadow;
        vec3 c=vColor;vec2 plane=abs(n.y)>.5?vWorld.xz:abs(n.x)>.5?vWorld.zy:vWorld.xy;
        if(vMaterial<1.5){float grain=hash(floor(plane*65.0));c*=.96+grain*.075;if(vMaterial>.5){vec2 tile=fract(plane*vec2(.5,.7));float joint=step(.985,tile.x)+step(.985,tile.y);c*=1.0-joint*.07;}else{c*=.96+.04*sin(plane.x*.6+sin(plane.y*.9));}}
        if(vMaterial>2.5&&vMaterial<3.5){c*=.8+.2*step(.055,fract(plane.x*3.0));}
        c*=light;if(vMaterial>1.5&&vMaterial<2.5)c+=vec3(.22)*pow(max(0.0,dot(n,normalize(sun+normalize(uEye-vWorld)))),32.0);
        if(vMaterial>3.5)c=vColor;
        float fog=1.0-exp(-max(0.0,length(uEye-vWorld)-25.0)*.004);c=mix(c,vec3(.74,.79,.8),fog*uShadow);gl_FragColor=vec4(c,1.0);}`);
    this.shadowProgram=this.compile('attribute vec3 aPosition;uniform mat4 uVP;void main(){gl_Position=uVP*vec4(aPosition,1.0);}',`precision highp float;void main(){vec3 c=fract(gl_FragCoord.z*vec3(1.0,255.0,65025.0));c-=c.yzz*vec3(1.0/255.0,1.0/255.0,0.0);gl_FragColor=vec4(c,1.0);}`);
    this.light=M4.mul(M4.ortho(85,1,260),M4.look([5,105,-10],[57,3,57]));this.world=this.upload(this.buildWorld());this.dynamic=gl.createBuffer();this.shadowSize=matchMedia('(pointer:coarse)').matches?1024:2048;this.makeShadow();gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);this.resize();document.addEventListener('arenaviewportchange',()=>this.resize());
  }
  compile(v,f){const gl=this.gl,p=gl.createProgram();for(const[type,source]of[[gl.VERTEX_SHADER,v],[gl.FRAGMENT_SHADER,f]]){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));gl.attachShader(p,s);}gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));return p;}
  resize(){const{width,height}=ArenaViewport.size,r=Math.min(devicePixelRatio||1,1.5,1600/width);this.canvas.width=Math.round(width*r);this.canvas.height=Math.round(height*r);}
  upload(mesh){const gl=this.gl,b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh.data),gl.STATIC_DRAW);return{buffer:b,count:mesh.data.length/10};}
  bind(buffer,program){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,buffer);for(const[n,size,offset]of[['aPosition',3,0],['aNormal',3,12],['aColor',3,24],['aMaterial',1,36]]){const a=gl.getAttribLocation(program,n);if(a>=0){gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,size,gl.FLOAT,false,40,offset);}}}
  makeShadow(){const gl=this.gl,n=this.shadowSize;this.depth=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,this.depth);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,n,n,0,gl.RGBA,gl.UNSIGNED_BYTE,null);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    const fb=gl.createFramebuffer(),rb=gl.createRenderbuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,this.depth,0);gl.bindRenderbuffer(gl.RENDERBUFFER,rb);gl.renderbufferStorage(gl.RENDERBUFFER,gl.DEPTH_COMPONENT16,n,n);gl.framebufferRenderbuffer(gl.FRAMEBUFFER,gl.DEPTH_ATTACHMENT,gl.RENDERBUFFER,rb);if(gl.checkFramebufferStatus(gl.FRAMEBUFFER)!==gl.FRAMEBUFFER_COMPLETE)throw Error('无法建立阴影缓冲区');
    gl.viewport(0,0,n,n);gl.enable(gl.DEPTH_TEST);gl.clearColor(1,1,1,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.useProgram(this.shadowProgram);gl.uniformMatrix4fv(gl.getUniformLocation(this.shadowProgram,'uVP'),false,this.light);this.bind(this.world.buffer,this.shadowProgram);gl.drawArrays(gl.TRIANGLES,0,this.world.count);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.deleteFramebuffer(fb);gl.deleteRenderbuffer(rb);
  }
  buildWorld(){const m=new DustMesh(),a=this.map.terrain.architecture,{width,height,step,quantum}=a;
    for(const[layer,deck]of[[a.lower,false],[a.upper,true]]){
      for(let z=0;z<height;z++)for(let x=0;x<width;){const v=layer[z*width+x];if(v<0){x++;continue;}const start=x;while(x<width&&layer[z*width+x]===v)x++;const y=v*quantum,p=[[start*step,y,z*step],[x*step,y,z*step],[x*step,y,(z+1)*step],[start*step,y,(z+1)*step]];m.quad(p,[0,1,0],[.67,.62,.5],1);if(deck)m.quad(p.map(p=>[p[0],p[1]-.4,p[2]]),[0,-1,0],[.57,.54,.46]);}
      for(let z=0;z<height;z++)for(let x=0;x<width;x++){const v=layer[z*width+x];if(v<0)continue;const y=v*quantum;for(const[dx,dz]of[[-1,0],[1,0],[0,-1],[0,1]]){const nx=x+dx,nz=z+dz,n=nx<0||nz<0||nx>=width||nz>=height?-1:layer[nz*width+nx];if(n>=v)continue;const b=deck?Math.max(y-.4,n>=0?n*quantum:y-.4):n>=0?n*quantum:-.4,xx=(x+(dx>0?1:0))*step,zz=(z+(dz>0?1:0))*step;const p=dx?[[xx,b,z*step],[xx,b,(z+1)*step],[xx,y,(z+1)*step],[xx,y,z*step]]:[[x*step,b,zz],[(x+1)*step,b,zz],[(x+1)*step,y,zz],[x*step,y,zz]];m.quad(p,[dx,0,dz],[.65,.57,.43]);}}
    }
    // Only the original B tunnel footprint gets a roof; open streets remain clear.
    for(let z=Math.ceil(44.52/step);z<Math.floor(82.6/step);z++)for(let x=Math.ceil(11.2/step);x<Math.floor(40.6/step);){const v=a.lower[z*width+x];if(v<0){x++;continue;}const start=x;while(x<Math.floor(40.6/step)&&a.lower[z*width+x]===v)x++;m.box((start+x)*step/2,v*quantum+4.4,(z+.5)*step,(x-start)*step,.25,step,[.62,.57,.46]);}
    for(const contour of DUST2_LAYOUT.contours)for(let i=1;i<contour.length;i++){
      const p=contour[i-1].map(v=>v*this.map.scale),q=contour[i].map(v=>v*this.map.scale),dx=q[0]-p[0],dz=q[1]-p[1],len=Math.hypot(dx,dz);if(!len)continue;
      let nx=-dz/len,nz=dx/len;if(this.map.solid((p[0]+q[0])/2+nx*.3,(p[1]+q[1])/2+nz*.3)){nx=-nx;nz=-nz;}
      const heights=[];for(let t=0;t<=len;t+=.5)for(const s of this.map.terrain.surfaces(p[0]+dx*t/len+nx*.45,p[1]+dz*t/len+nz*.45))heights.push(s.height);
      const ground=heights.length?Math.max(...heights):5,top=ground+5.2,c=i%4===0?[.69,.68,.59]:[.81,.73,.58];m.quad([[p[0],-.4,p[1]],[q[0],-.4,q[1]],[q[0],top,q[1]],[p[0],top,p[1]]],[nx,0,nz],c);
      m.matrix=M4.pose((p[0]+q[0])/2,0,(p[1]+q[1])/2,0,-Math.atan2(dz,dx));m.box(0,top,0,len,.18,.32,[.91,.84,.68]);m.matrix=M4.identity();
      for(let t=2.3;t<len-1;t+=5.5){const x=p[0]+dx*t/len+nx*.04,z=p[1]+dz*t/len+nz*.04,h=this.map.terrain.height(x+nx*.4,z+nz*.4);if(h===null)continue;m.matrix=M4.pose(x,h,z,0,Math.atan2(nx,nz));m.box(0,2.5,0,1.05,1.55,.06,[.28,.35,.34]);m.box(0,2.58,.045,.86,1.37,.04,[.13,.22,.22]);for(const xx of[-.3,0,.3])m.box(xx,2.58,.075,.035,1.37,.04,[.32,.39,.35]);m.box(0,2.42,.1,1.2,.1,.25,[.78,.72,.58]);m.matrix=M4.identity();}
    }
    for(const o of this.map.objects){m.matrix=M4.pose(o.x,o.baseY,o.y,0,Math.PI/2-o.angle);const wood=o.type==='crate'||o.type==='door',c=wood?[.47,.37,.23]:[.75,.66,.49];m.box(0,0,0,o.width,o.bodyHeight,o.depth,c,wood?3:0);if(wood){for(const y of[.12,o.bodyHeight-.2])m.box(0,y,0,o.width+.025,.085,o.depth+.025,[.25,.27,.25],2);for(const x of[-o.width*.4,o.width*.4])m.box(x,0,0,.065,o.bodyHeight,o.depth+.03,[.33,.29,.21],2);}m.matrix=M4.identity();}
    // Geometric paint marks identify the original A/B sites without adding obstructions.
    for(const[letter,x,z]of[['A',99,21],['B',26,20]]){const y=(this.map.terrain.height(x,z)||0)+.018,c=[.7,.29,.13];m.matrix=M4.translate(x,y,z);for(const d of[-1,1]){m.box(d*1.65,0,0,.06,.008,3.3,c);m.box(0,0,d*1.65,3.3,.008,.06,c);}if(letter==='A'){for(const side of[-1,1]){m.matrix=M4.mul(M4.translate(x+side*.38,y,z),M4.rotate(-side*.24,1));m.box(0,0,0,.17,.01,1.9,c);}m.matrix=M4.translate(x,y,z);m.box(0,0,.1,1,.01,.14,c);}else{m.box(-.5,0,0,.17,.01,1.9,c);for(const zz of[-.87,0,.87])m.box(0,0,zz,1,.01,.16,c);for(const zz of[-.43,.43])m.box(.45,0,zz,.17,.01,.78,c);}m.matrix=M4.identity();}
    return m;
  }
  soldier(m,a,time){const team=a.team===0?[.23,.43,.59]:[.73,.4,.2],gear=[.16,.19,.2],skin=[.62,.49,.35],base=M4.pose(a.x,a.elevation,a.y,0,-a.angle-Math.PI/2),stride=a.moving>0?Math.sin(time*10+a.id)*.48:0;m.matrix=base;
    m.box(0,.85,0,.49,.58,.28,team);m.box(0,.91,-.17,.44,.46,.13,gear);for(const x of[-.14,.14])m.box(x,1.03,-.26,.12,.18,.06,[.23,.25,.24]);m.box(0,1.44,0,.28,.28,.28,skin);m.box(0,1.62,0,.35,.15,.34,gear);m.box(0,1.52,-.15,.3,.08,.045,[.07,.12,.14],2);m.box(0,1.4,-.15,.3,.12,.06,team);
    for(const s of[-1,1]){m.matrix=M4.mul(base,M4.mul(M4.translate(s*.14,.86,0),M4.rotate(s*stride,0)));m.box(0,-.68,0,.19,.7,.23,gear);m.box(0,-.84,-.07,.22,.18,.36,[.1,.12,.12]);m.matrix=M4.mul(base,M4.pose(s*.31,1.3,0,-.85,0,s*.15));m.box(0,-.42,0,.18,.46,.18,team);m.box(0,-.48,0,.16,.13,.2,gear);}
    m.matrix=M4.mul(base,M4.pose(.12,1.13,-.29,-a.pitch));m.box(0,0,-.2,.11,.13,.58,[.12,.15,.17],2);m.box(0,.04,-.61,.045,.05,.3,[.1,.11,.12],2);if(a.flash>0)m.box(0,.025,-.8,.12,.13,.18,[1,.8,.3],4);
    if(a.team===0){m.matrix=M4.translate(a.x,a.elevation+2.03,a.y);m.box(0,0,0,.12,.12,.12,[.33,.78,1],4);}m.matrix=M4.identity();
  }
  knife(m,pose,handleAngle=0,bladeAngle=0,handPose=pose){const dark=[.09,.13,.16],metal=[.62,.74,.76],edge=[.82,.92,.92],gold=[.84,.59,.24];
    m.matrix=M4.mul(pose,M4.rotate(bladeAngle,2));const shape=[[-.028,0,0],[.035,0,0],[.044,.22,0],[-.009,.38,0],[-.04,.18,0]];
    for(const side of[-1,1]){const pts=shape.map(p=>[p[0],p[1],side*.009]);for(let i=1;i<pts.length-1;i++)m.quad([pts[0],pts[i],pts[i+1],pts[0]],[0,0,side],side===1?metal:edge,2);}m.box(.029,.015,.011,.008,.19,.007,edge,2);
    for(const side of[-1,1]){m.matrix=M4.mul(pose,M4.mul(M4.translate(side*.04,0,0),M4.rotate(side===1?handleAngle:0,2)));m.box(0,-.35,0,.057,.35,.047,dark,2);for(const xx of[-.025,.025])m.box(xx,-.35,.025,.007,.35,.007,gold,2);for(let i=0;i<5;i++){m.box(0,-.07-i*.053,.026,.023,.025,.004,[.025,.04,.045]);}m.box(0,-.35,0,.065,.025,.06,gold,2);m.matrix=M4.mul(m.matrix,M4.rotate(Math.PI/2,0));m.cylinder(0,0,0,.024,.032,gold);}
    m.matrix=handPose;m.box(-.04,-.25,-.04,.12,.18,.09,[.17,.2,.2]);for(let i=0;i<3;i++)m.box(-.04,-.1-i*.04,.03,.095,.032,.04,[.24,.29,.28]);m.box(-.06,-.38,-.06,.17,.17,.15,[.22,.26,.27]);m.box(-.07,-.57,-.05,.17,.24,.17,[.32,.38,.39]);
  }
  viewmodel(a,inspection,time){const m=new DustMesh(),bob=a.moving>0?Math.sin(time*11)*.012:0,reload=a.reloading>0?Math.sin(Math.PI*a.reloading/WEAPONS[a.weapon].reload):0;
    if(a.weapon==='knife'){let x=.34,y=-.22+bob,z=-.95,rx=.12,ry=-.22,rz=-.35,handle=0,blade=0;const hand=M4.pose(x,y,z,rx,ry,rz);
      if(inspection){const t=inspection.time/inspection.duration,s=Math.sin(Math.PI*t);if(inspection.index===0){rz+=Math.sin(t*Math.PI*4)*.55;handle=Math.sin(t*Math.PI*6)*2.7;blade=Math.sin(t*Math.PI*4)*.35;y+=s*.08;}else if(inspection.index===1){x-=s*.14;rz+=t*Math.PI*4;ry+=s*.55;handle=Math.sin(t*Math.PI*4)*2.3;}else{y+=Math.sin(t*Math.PI)*.25;x-=s*.12;rz+=t*Math.PI*6;ry+=s*.8;handle=Math.sin(t*Math.PI*4)*Math.PI;}}
      if(a.cooldown>0){const s=Math.sin(Math.PI*(1-a.cooldown/.55));x-=s*.28;y+=s*.07;rz-=s*1.5;z-=s*.1;}
      this.knife(m,M4.pose(x,y,z,rx,ry,rz),handle,blade,inspection&&inspection.index>0?hand:M4.pose(x,y,z,rx,ry,rz));
    }else{const rifle=a.weapon==='rifle',ads=a.aiming?1:0,pose=M4.pose(.27*(1-ads),-.29+bob-reload*.22+ads*.1,-.9+a.recoil*.7,Math.sin(time*16)*a.recoil+reload*.7,-reload*.2,0);m.matrix=pose;
      const metal=[.13,.17,.19],grip=[.22,.26,.25],accent=[.69,.51,.29];m.box(0,0,-.19,rifle?.12:.09,.13,rifle?.5:.27,metal,2);m.box(0,-.18,-.06,.085,.2,.1,grip);m.box(0,.13,-.15,.065,.035,rifle?.42:.24,[.22,.27,.29],2);m.box(0,.17,-.07,.08,.045,.04,metal,2);m.box(0,.17,rifle?-.4:-.28,.018,.04,.025,metal,2);
      if(rifle){m.box(0,-.19,-.28,.08,.22,.13,[.23,.28,.29],2);m.box(0,.025,-.54,.09,.095,.23,grip);for(let i=0;i<5;i++)m.box(0,.04,-.46-i*.038,.095,.025,.012,[.09,.12,.13]);m.box(0,.045,-.77,.04,.045,.25,metal,2);m.box(0,-.04,.15,.09,.17,.24,grip);m.box(.065,.05,-.12,.012,.035,.12,accent,2);}else m.box(0,.02,-.34,.04,.06,.09,metal,2);
      m.box(.005,-.2,.015,.13,.13,.15,[.18,.23,.23]);m.box(.05,-.41,.08,.16,.23,.17,[.31,.38,.39]);if(rifle){m.box(-.09,-.05,-.5,.13,.13,.17,[.18,.23,.23]);m.box(-.17,-.24,-.44,.14,.23,.15,[.31,.38,.39]);}if(a.flash>0)m.box(0,.025,rifle?-.93:-.42,.09,.1,.19,[1,.81,.35],4);
    }m.matrix=M4.identity();return m;
  }
  drawBuffer(buffer,count,vp,eye,shadow){const gl=this.gl,p=this.program;gl.useProgram(p);gl.uniformMatrix4fv(gl.getUniformLocation(p,'uVP'),false,vp);gl.uniformMatrix4fv(gl.getUniformLocation(p,'uLight'),false,this.light);gl.uniform3fv(gl.getUniformLocation(p,'uEye'),eye);gl.uniform1f(gl.getUniformLocation(p,'uShadow'),shadow);gl.uniform1f(gl.getUniformLocation(p,'uTexel'),1/this.shadowSize);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,this.depth);gl.uniform1i(gl.getUniformLocation(p,'uDepth'),0);this.bind(buffer,p);gl.drawArrays(gl.TRIANGLES,0,count);}
  drawDynamic(mesh,vp,eye,shadow=1){const gl=this.gl;gl.bindBuffer(gl.ARRAY_BUFFER,this.dynamic);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(mesh.data),gl.DYNAMIC_DRAW);this.drawBuffer(this.dynamic,mesh.data.length/10,vp,eye,shadow);}
  render(match,time){const gl=this.gl,a=match.player?match.view():{x:46.76,y:102.76,elevation:7.92,eyeElevation:7.92,angle:-2.8+Math.sin(time*.07)*.1,pitch:-.05},eye=[a.x,(a.eyeElevation??a.elevation)+1.58,a.y],pitch=a.pitch+(a.recoil||0),dir=[Math.cos(a.angle)*Math.cos(pitch),Math.sin(pitch),Math.sin(a.angle)*Math.cos(pitch)];const proj=M4.perspective((a.aiming?54:78)*Math.PI/180,this.canvas.width/this.canvas.height),vp=M4.mul(proj,M4.look(eye,eye.map((v,i)=>v+dir[i])));this.vp=vp;this.eye=eye;
    gl.viewport(0,0,this.canvas.width,this.canvas.height);gl.clearColor(.63,.76,.82,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);this.drawBuffer(this.world.buffer,this.world.count,vp,eye,1);
    const m=new DustMesh();for(const b of match.actors)if(b.alive&&b!==a)this.soldier(m,b,time);for(const e of match.effects){const d=e.to.map((v,i)=>v-e.from[i]),len=Math.hypot(...d),mid=e.from.map((v,i)=>(v+e.to[i])/2);m.matrix=M4.pose(...mid,-Math.asin(d[1]/len),Math.atan2(d[0],d[2]));m.box(0,0,0,.015,.015,len,e.team===0?[.68,.87,1]:[1,.72,.32],4);}m.matrix=M4.identity();for(const hit of match.impacts||[]){const [x,y,z]=hit.point;m.box(x,y-.025,z,.05,.05,.05,hit.time>2.9?[1,.7,.3]:[.22,.2,.17],hit.time>2.9?4:0);}this.drawDynamic(m,vp,eye);
    if(match.player&&a.alive){gl.clear(gl.DEPTH_BUFFER_BIT);this.drawDynamic(this.viewmodel(a,match.inspection,time),M4.perspective(65*Math.PI/180,this.canvas.width/this.canvas.height,.025,4),[0,0,0],0);}
  }
}
