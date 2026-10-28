"use strict";
// The same sealed mask is used on the physical actor and the contact close-up.
class WardRelief {
  static mask(ctx,size=128){
    ctx.save();ctx.scale(size/128,size/128);ctx.clearRect(0,0,128,128);
    const shape=()=>{ctx.beginPath();ctx.moveTo(43,5);ctx.bezierCurveTo(70,-1,96,12,102,37);ctx.lineTo(99,79);ctx.bezierCurveTo(94,104,73,126,59,122);ctx.bezierCurveTo(37,117,23,86,24,59);ctx.lineTo(28,25);ctx.closePath();};
    shape();const ivory=ctx.createLinearGradient(22,0,105,25);ivory.addColorStop(0,'#595d53');ivory.addColorStop(.3,'#b1b09a');ivory.addColorStop(.65,'#c3bea5');ivory.addColorStop(1,'#686e61');ctx.fillStyle=ivory;ctx.fill();ctx.save();ctx.clip();
    // A second, displaced facial impression beneath a sealed hospital mask.
    ctx.strokeStyle='#74796a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(39,29);ctx.bezierCurveTo(29,64,41,100,61,112);ctx.bezierCurveTo(83,105,90,78,88,39);ctx.stroke();
    ctx.fillStyle='#919480';ctx.beginPath();ctx.moveTo(66,37);ctx.lineTo(54,72);ctx.lineTo(68,76);ctx.lineTo(61,64);ctx.closePath();ctx.fill();
    // One sloping blind seam: no separate cartoon eyes or mouth.
    ctx.strokeStyle='#363e36';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(27,45);ctx.bezierCurveTo(50,47,76,38,101,35);ctx.stroke();ctx.strokeStyle='#101b1a';ctx.lineWidth=2;ctx.stroke();
    ctx.fillStyle='#bdb69c';ctx.save();ctx.translate(80,41);ctx.rotate(-.15);ctx.fillRect(-4,-12,8,25);ctx.restore();
    ctx.strokeStyle='#7f806d';ctx.lineWidth=1;for(const [a,b,c,d]of[[36,14,41,31],[41,31,37,38],[95,68,88,84],[88,84,91,94],[47,99,58,104]]){ctx.beginPath();ctx.moveTo(a,b);ctx.lineTo(c,d);ctx.stroke();}
    ctx.fillStyle='#777967';ctx.font='6px monospace';ctx.fillText('02:17',52,101);ctx.restore();shape();ctx.strokeStyle='#555f52';ctx.lineWidth=2;ctx.stroke();ctx.restore();
  }
  // Rings are [height, half-width, half-depth, centre-x, centre-z]. Flat normals
  // keep the tailored cloth faceted without using a stack of disconnected boxes.
  static loft(mesh,rings,color,tile='white',sides=8){
    const ring=r=>Array.from({length:sides},(_,i)=>{const a=(i+.5)*WZ.TAU/sides;return[(r[3]||0)+Math.sin(a)*r[1],r[0],(r[4]||0)+Math.cos(a)*r[2]];});
    const rows=rings.map(ring);
    const face=points=>{const a=points[0],b=points[1],c=points[2],u=b.map((v,i)=>v-a[i]),v=c.map((v,i)=>v-a[i]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...n)||1;mesh.quad(points,n.map(v=>v/len),tile,color);};
    for(let j=0;j<rows.length-1;j++)for(let i=0;i<sides;i++)face([rows[j][i],rows[j][(i+1)%sides],rows[j+1][(i+1)%sides],rows[j+1][i]]);
    for(const [j,flip]of[[0,true],[rows.length-1,false]]){const r=rings[j],center=[r[3]||0,r[0],r[4]||0];for(let i=0;i<sides;i++){const p=[center,rows[j][i],rows[j][(i+1)%sides],center];face(flip?p.reverse():p);}}
  }
  static meshes(renderer){
    const parts={},mesh=()=>new WardMesh(renderer.tiles),o={x:0,y:0,angle:Math.PI/2};
    const cloth=[.115,.15,.142],edge=[.075,.105,.1],skin=[.23,.27,.225],dark=[.035,.055,.052];
    const body=mesh();
    this.loft(body,[[.65,.29,.15,0,-.025],[.96,.25,.145],[1.34,.235,.17,0,.015],[1.64,.32,.205,-.025,.005],[1.82,.34,.18,-.045,-.025],[1.91,.18,.12,-.015,.005]],cloth);
    // Split overlapping coat tails, lapels, stitched hem and a worn belt.
    for(const side of[-1,1]){
      this.loft(body,[[.54+side*.045,.145,.12,side*.15,.015],[.79,.15,.15,side*.14],[1.15,.13,.13,side*.12,.03]],side<0?cloth:edge);
      body.quad([[side*.03,1.43,.181],[side*.19,1.74,.19],[side*.12,1.87,.13],[side*.01,1.73,.215]],[0,0,1],'white',[.2,.24,.21]);
      body.box(o,side*.19,1.13,.148,.13,.015,.012,'white',[.46,.44,.35]);
    }
    body.box(o,0,1.28,.173,.46,.055,.022,'white',edge);body.box(o,.08,1.286,.19,.045,.042,.015,'white',[.5,.46,.33]);
    for(let i=0;i<4;i++)body.box(o,.025,1.34+i*.105,.188,.018,.018,.012,'white',[.5,.48,.37]);
    this.loft(body,[[1.84,.09,.09,0,.035],[1.99,.075,.08,.015,.08]],skin);
    body.box(o,-.22,1.59,.17,.11,.09,.018,'white',[.57,.51,.36]);body.box(o,-.22,1.625,.185,.08,.012,.008,'white',dark);
    parts.body=renderer.upload(body);
    const head=mesh();this.loft(head,[[0,.075,.095],[.09,.14,.13,0,.015],[.31,.17,.14,-.015],[.46,.12,.12,-.03,-.025],[.49,.055,.07,-.04,-.03]],dark);
    // Curved mask surface; atlas alpha cuts out its silhouette.
    const uv=renderer.tiles['relief-mask'];
    for(let y=0;y<10;y++)for(let x=0;x<8;x++){
      const point=(u,v)=>[(u-.5)*.43,v*.53-.015,.135+.055*Math.max(0,1-4*(u-.5)**2)];
      const corners=[[x/8,y/10],[(x+1)/8,y/10],[(x+1)/8,(y+1)/10],[x/8,(y+1)/10]];
      for(const i of[0,1,2,0,2,3]){const [u,v]=corners[i],n=[.44*(u-.5),0,1],len=Math.hypot(...n);head.vertex(point(u,v),n.map(n=>n/len),[uv[0]+u*(uv[2]-uv[0]),uv[1]+v*(uv[3]-uv[1])],[.36,.38,.35],0);}
    }
    parts.head=renderer.upload(head);
    const tags=mesh();
    for(const side of[-1,1])tags.quad([[side*.065,.03,0],[side*.075,.03,0],[side*.025,-.25,.07],[side*.015,-.25,.07]],[0,0,1],'white',[.4,.33,.23]);
    for(let i=0;i<3;i++){const badge={...o,x:(i%2)*.035-.01};tags.box(badge,0,-.29-i*.14,.082+i*.012,.14,.19,.014,'white',[.19,.2,.16]);tags.panel(badge,-.28-i*.14,.125,.17,.093+i*.012,'staff-badge',[.45,.43,.35]);}
    parts.tags=renderer.upload(tags);
    for(const side of[-1,1]){
      const arm=mesh();this.loft(arm,[[-.59,.07,.075,side*.055,.025],[-.25,.085,.095,side*.04,-.025],[0,.115,.13],[.06,.075,.09]],cloth);
      this.loft(arm,[[-.62,.075,.08,side*.055,.025],[-.54,.08,.085,side*.055,.025]],[.21,.24,.2]);parts['arm'+side]=renderer.upload(arm);
      const forearm=mesh();this.loft(forearm,[[-.46,.047,.05,side*.025,.085],[-.25,.055,.06,side*.025,.025],[0,.061,.065]],skin);
      this.loft(forearm,[[-.59,.065,.028,side*.025,.09],[-.43,.06,.04,side*.025,.085]],skin);
      for(let f=0;f<4;f++){const x=side*.025+(f-1.5)*.03,length=.14+(1-Math.abs(f-1.5)/2)*.06;this.loft(forearm,[[-.58-length,.009,.012,x,.13],[-.63,.013,.014,x,.104],[-.56,.014,.016,x,.09]],skin, 'white',5);}
      this.loft(forearm,[[-.59,.018,.02,-side*.055,.13],[-.49,.022,.025,-side*.055,.09]],skin, 'white',5);parts['forearm'+side]=renderer.upload(forearm);
      const leg=mesh();this.loft(leg,[[-.83,.06,.065,0,.01],[-.48,.065,.08,0,-.035],[-.12,.095,.095],[0,.105,.105]],edge);
      this.loft(leg,[[-.91,.087,.16,0,.065],[-.83,.087,.16,0,.065],[-.77,.065,.08,0,.015]],dark);parts['leg'+side]=renderer.upload(leg);
    }
    return parts;
  }
  static transform(x=0,y=0,z=0,pitch=0,yaw=0,roll=0){
    const a=Math.cos(pitch),b=Math.sin(pitch),c=Math.cos(yaw),d=Math.sin(yaw),e=Math.cos(roll),f=Math.sin(roll);
    return[c*e+d*b*f,a*f,-d*e+c*b*f,0,-c*f+d*b*e,a*e,d*f+c*b*e,0,d*a,-b,c*a,0,x,y,z,1];
  }
  static draw(renderer,g,time){
    if(!g.pursuerEnabled||g.mode==='home'||g.mode==='chapter'||g.levelElapsed<12)return;
    const e=g.enemy;if(WZ.distance(e,g.player)>60)return;
    if(!renderer.pursuerMeshes)renderer.pursuerMeshes=this.meshes(renderer);
    const moving=e.motion>.1,phase=e.phase||0,chasing=e.mode==='chase',stride=moving?Math.sin(phase):0;
    const root=this.transform(e.x,(e.elevation||0)+Math.abs(stride)*.018,e.y,0,e.angle||0),draw=(name,parent,local)=>renderer.draw(renderer.pursuerMeshes[name],renderer.multiply(parent,local));
    const torso=renderer.multiply(root,this.transform(0,0,0,.045,0,-.025+stride*.012));
    draw('body',torso,this.transform());
    draw('head',torso,this.transform(.015,1.91,.08,chasing?.12:.035,Math.sin(time*.6)*.08,-.14+Math.sin(time*.8)*.025));
    draw('tags',torso,this.transform(-.025,1.76,.23,stride*.09,0,Math.sin(phase-.5)*.06*(moving?1:.12)));
    for(const side of[-1,1]){
      const swing=stride*side,arm=renderer.multiply(torso,this.transform(side*.32,1.78+(side===-1?.03:-.035),0,-swing*.14-(chasing?.16:0),0,side*.045));
      renderer.draw(renderer.pursuerMeshes['arm'+side],arm);
      draw('forearm'+side,arm,this.transform(side*.055,-.59,.025,-.13-swing*.08-(chasing?.18:0)));
      draw('leg'+side,root,this.transform(side*.135,.93+Math.max(0,swing)*.045,0,swing*(chasing?.4:.26)));
    }
  }
}
