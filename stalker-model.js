"use strict";
// The Crawler: a low, broad, four-legged silhouette with a folded carapace.
// No human face, clothes, badges or upright humanoid rig.
class WardStalker{
  static tube(m,a,b,r1,r2,color,sides=7){
    const d=b.map((v,i)=>v-a[i]),len=Math.hypot(...d),n=d.map(v=>v/len),axis=Math.abs(n[1])<.9?[0,1,0]:[1,0,0];
    let u=[n[1]*axis[2]-n[2]*axis[1],n[2]*axis[0]-n[0]*axis[2],n[0]*axis[1]-n[1]*axis[0]],ul=Math.hypot(...u);u=u.map(v=>v/ul);
    const v=[n[1]*u[2]-n[2]*u[1],n[2]*u[0]-n[0]*u[2],n[0]*u[1]-n[1]*u[0]],point=(p,r,t)=>p.map((x,i)=>x+r*(u[i]*Math.cos(t)+v[i]*Math.sin(t)));
    for(let i=0;i<sides;i++){const t=i*WZ.TAU/sides,q=(i+1)*WZ.TAU/sides,normal=u.map((x,j)=>x*Math.cos((t+q)/2)+v[j]*Math.sin((t+q)/2));m.quad([point(a,r1,t),point(a,r1,q),point(b,r2,q),point(b,r2,t)],normal,'white',color);m.quad([b,point(b,r2,t),point(b,r2,q),b],n,'white',color);}
  }
  static matrix(x=0,y=0,z=0,yaw=0,pitch=0){const c=Math.cos(yaw),s=Math.sin(yaw),a=Math.cos(pitch),b=Math.sin(pitch);return[c,0,-s,0,s*b,a,c*b,0,s*a,-b,c*a,0,x,y,z,1];}
  static meshes(renderer){
    const mesh=()=>new WardMesh(renderer.tiles),parts={},shell=[.2,.25,.21],joint=[.12,.17,.145],bone=[.32,.37,.27],voidColor=[.012,.024,.02];
    const body=mesh(),rings=[[-.51,.06,.08,.82],[-.34,.29,.3,.87],[-.08,.34,.4,.9],[.17,.3,.32,.83],[.37,.2,.19,.72]].map(([z,w,h,y])=>Array.from({length:8},(_,i)=>{const a=i*WZ.TAU/8;return[Math.sin(a)*w,y+Math.cos(a)*h,z];}));
    // A closed faceted shell avoids overlapping planes and flickering surfaces.
    for(let j=0;j<rings.length-1;j++)for(let i=0;i<8;i++){
      const q=[rings[j][i],rings[j][(i+1)%8],rings[j+1][(i+1)%8],rings[j+1][i]],u=q[1].map((v,k)=>v-q[0][k]),v=q[2].map((v,k)=>v-q[0][k]),n=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]],len=Math.hypot(...n);
      body.quad(q,n.map(v=>-v/len),'white',i%3===0?shell.map(v=>v*.83):shell);
    }
    for(const j of[0,rings.length-1]){const center=[0,j===0?.82:.72,j===0?-.51:.37];for(let i=0;i<8;i++)body.quad([center,rings[j][i],rings[j][(i+1)%8],center],[0,0,j===0?-1:1],'white',shell);}
    for(const side of[-1,1])for(let i=0;i<3;i++)this.tube(body,[side*.26,.79,-.32+i*.2],[side*.34,.59,-.25+i*.2],.035,.017,bone,5);
    parts.body=renderer.upload(body);
    const head=mesh();head.sphere(0,.12,0,.27,.185,.23,shell,6,10);head.sphere(0,.075,.217,.18,.115,.027,voidColor,5,10);
    // An eyeless, recessed opening framed by uneven plates rather than a face.
    for(let i=0;i<8;i++){const a=i*WZ.TAU/8+.12,x=Math.cos(a)*.185,y=.075+Math.sin(a)*.12;
      this.tube(head,[x,y,.214],[x*.7,.075+(y-.075)*.63,.246],.036,.009,bone,5);
    }
    for(const side of[-1,1]){this.tube(head,[side*.2,.19,-.07],[side*.24,.27,-.23],.065,.022,shell);this.tube(head,[side*.1,.27,.04],[side*.15,.24,-.17],.025,.042,bone,5);}
    parts.head=renderer.upload(head);
    for(const side of[-1,1])for(const fore of[-1,1]){
      const leg=mesh(),knee=[side*.19,-.28,fore*.07],paw=[side*.23,-.67,fore*.19];
      this.tube(leg,[0,0,0],knee,.09,.067,shell);leg.sphere(...knee,.077,.075,.075,joint,4,7);this.tube(leg,knee,paw,.055,.034,bone);
      leg.sphere(paw[0],paw[1],paw[2],.075,.035,.075,joint,4,7);
      for(let toe=0;toe<3;toe++)this.tube(leg,[paw[0]+(toe-1)*.04,paw[1],paw[2]],[paw[0]+(toe-1)*.055,paw[1]-.01,paw[2]+fore*.085],.019,.007,voidColor,5);
      parts['leg'+side+':'+fore]=renderer.upload(leg);
    }
    return parts;
  }
  static draw(renderer,g,time){
    if(!g.pursuerEnabled||g.mode==='home'||g.mode==='chapter'||g.levelElapsed<12)return;
    const e=g.enemy;if(WZ.distance(e,g.player)>60)return;
    if(!renderer.pursuerMeshes)renderer.pursuerMeshes=this.meshes(renderer);
    const moving=e.motion>.1,phase=e.phase||0,root=this.matrix(e.x,e.elevation||0,e.y,e.angle||0),bob=moving?Math.sin(phase*2)*.015:Math.sin(time*1.2)*.008;
    const draw=(name,m)=>renderer.draw(renderer.pursuerMeshes[name],renderer.multiply(root,m));
    draw('body',this.matrix(0,bob,0));draw('head',this.matrix(0,.56+bob,.4,Math.sin(time*.8)*.065,e.mode==='chase'?-.12:.04));
    for(const side of[-1,1])for(const fore of[-1,1]){const stride=moving?Math.sin(phase+(side*fore<0?Math.PI:0)):0;draw('leg'+side+':'+fore,this.matrix(side*.2,.72+Math.max(0,stride)*.07,fore*.25+stride*.065));}
  }
  static face(ctx,size=720){
    ctx.save();ctx.scale(size/720,size/720);ctx.clearRect(0,0,720,720);
    ctx.fillStyle='#101b17';ctx.beginPath();ctx.ellipse(360,345,320,250,0,0,WZ.TAU);ctx.fill();
    ctx.fillStyle='#52604a';ctx.beginPath();ctx.moveTo(55,260);ctx.lineTo(180,110);ctx.lineTo(354,154);ctx.lineTo(541,91);ctx.lineTo(665,250);ctx.lineTo(613,505);ctx.lineTo(352,607);ctx.lineTo(108,489);ctx.closePath();ctx.fill();
    ctx.fillStyle='#07100d';ctx.beginPath();ctx.ellipse(360,393,200,134,.04,0,WZ.TAU);ctx.fill();
    for(let i=0;i<8;i++){const a=i*WZ.TAU/8+.12,x=360+Math.cos(a)*205,y=393+Math.sin(a)*141;ctx.save();ctx.translate(x,y);ctx.rotate(a);ctx.fillStyle=i%2?'#a6ab82':'#7e8e70';ctx.beginPath();ctx.moveTo(25,-28);ctx.lineTo(-62,-14);ctx.lineTo(-70,5);ctx.lineTo(22,26);ctx.closePath();ctx.fill();ctx.restore();}
    ctx.strokeStyle='#2b3c2c';ctx.lineWidth=14;for(const side of[-1,1]){ctx.beginPath();ctx.moveTo(360+side*40,165);ctx.lineTo(360+side*95,254);ctx.lineTo(360+side*225,273);ctx.stroke();}ctx.restore();
  }
}
