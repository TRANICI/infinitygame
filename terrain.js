"use strict";
// Source NAV elevations retain overlapping floors (CT under A short), not a heightmap.
class DustTerrain {
  constructor(){
    this.scale=DUST2_LAYOUT.scale;this.bins=new Map();this.triangles=[];this.navigation=null;
    if(typeof DUST2_ARCHITECTURE!=='undefined'){
      const a=DUST2_ARCHITECTURE,decode=rows=>Int16Array.from(rows.flatMap(row=>{const values=[];for(let i=0;i<row.length;i+=2)for(let n=0;n<row[i];n++)values.push(row[i+1]);return values;}));
      this.architecture={width:a.width,height:a.height,step:a.pixels*this.scale,quantum:a.stepHeight,lower:decode(a.lower),upper:decode(a.upper)};return;
    }
    const vertices=DUST2_TERRAIN_DATA.vertices.map(([x,z,y])=>[x*this.scale,y,z*this.scale]);
    const add=(a,b,c)=>{
      const denominator=(b[2]-c[2])*(a[0]-c[0])+(c[0]-b[0])*(a[2]-c[2]);if(Math.abs(denominator)<1e-7)return;
      const t={points:[a,b,c],denominator,minX:Math.min(a[0],b[0],c[0]),maxX:Math.max(a[0],b[0],c[0]),minZ:Math.min(a[2],b[2],c[2]),maxZ:Math.max(a[2],b[2],c[2])};
      const id=this.triangles.push(t)-1;
      for(let z=Math.floor((t.minZ-1)/2);z<=Math.floor((t.maxZ+1)/2);z++)for(let x=Math.floor((t.minX-1)/2);x<=Math.floor((t.maxX+1)/2);x++){
        const key=x+','+z;if(!this.bins.has(key))this.bins.set(key,[]);this.bins.get(key).push(id);
      }
    };
    for(const p of DUST2_TERRAIN_DATA.polygons)for(let i=1;i<p.length-1;i++)add(vertices[p[0]],vertices[p[i]],vertices[p[i+1]]);
  }
  sample(t,x,z){
    const[a,b,c]=t.points,u=((b[2]-c[2])*(x-c[0])+(c[0]-b[0])*(z-c[2]))/t.denominator,
      v=((c[2]-a[2])*(x-c[0])+(a[0]-c[0])*(z-c[2]))/t.denominator,w=1-u-v;
    if(u>=-1e-5&&v>=-1e-5&&w>=-1e-5)return{height:u*a[1]+v*b[1]+w*c[1],distance:0};
    let best={height:0,distance:Infinity};
    for(let i=0;i<3;i++){
      const p=t.points[i],q=t.points[(i+1)%3],dx=q[0]-p[0],dz=q[2]-p[2],f=Math.max(0,Math.min(1,((x-p[0])*dx+(z-p[2])*dz)/(dx*dx+dz*dz)));
      const distance=Math.hypot(x-p[0]-f*dx,z-p[2]-f*dz);
      if(distance<best.distance)best={height:p[1]+(q[1]-p[1])*f,distance};
    }
    return best;
  }
  surfaces(x,z,margin=.72){
    if(this.architecture){
      const a=this.architecture,gx=Math.floor(x/a.step),gz=Math.floor(z/a.step);if(gx<0||gz<0||gx>=a.width||gz>=a.height)return[];
      const id=gz*a.width+gx,out=[];if(a.lower[id]>=0)out.push({height:a.lower[id]*a.quantum,distance:0});if(a.upper[id]>=0)out.push({height:a.upper[id]*a.quantum,distance:0});return out;
    }
    const samples=[];
    for(const id of this.bins.get(Math.floor(x/2)+','+Math.floor(z/2))||[]){
      const t=this.triangles[id];if(x<t.minX-margin||x>t.maxX+margin||z<t.minZ-margin||z>t.maxZ+margin)continue;
      const s=this.sample(t,x,z);if(s.distance<=margin)samples.push(s);
    }
    // Prefer actual surfaces; extrapolate only to fill the NAV's wall clearance.
    samples.sort((a,b)=>a.distance-b.distance);const out=[],nearest=samples[0]?.distance??0;
    for(const sample of samples)if(sample.distance<=nearest+.035&&!out.some(s=>Math.abs(s.height-sample.height)<.2))out.push(sample);
    return out.sort((a,b)=>a.height-b.height);
  }
  height(x,z,hint){
    const surfaces=this.surfaces(x,z);if(!surfaces.length)return null;
    if(hint===undefined)return surfaces[0].height;
    const eligible=surfaces.filter(s=>s.height<=hint+.46);
    return eligible.length?eligible.reduce((a,b)=>Math.abs(a.height-hint)<Math.abs(b.height-hint)?a:b).height:null;
  }
  base(o){
    if(o.label||(this.architecture&&!['wall','door','step'].includes(o.type)))return this.height(o.x,o.y)??0;
    const a=o.angle||0,heights=[];
    // Sample around furniture, so a crate's navigable top is not its foundation.
    for(const[x,z]of[[0,0],[-o.width/2-.4,0],[o.width/2+.4,0],[0,-o.depth/2-.4],[0,o.depth/2+.4]]){
      const wx=o.x+x*Math.sin(a)+z*Math.cos(a),wz=o.y-x*Math.cos(a)+z*Math.sin(a),h=this.height(wx,wz);
      if(h!==null)heights.push(h);
    }
    return heights.length?Math.min(...heights):0;
  }
  buildNavigation(world){
    const step=.56,nw=Math.ceil(world.width/step),nh=Math.ceil(world.height/step),cells=new Map(),nodes=[];
    for(let z=0;z<nh;z++)for(let x=0;x<nw;x++){
      const wx=(x+.5)*step,wz=(z+.5)*step;if(world.solid(wx,wz))continue;
      const ids=[];
      for(const s of this.surfaces(wx,wz,.6))if(world.canStand(wx,wz,.27,s.height)){
        ids.push(nodes.length);nodes.push({x:wx,y:wz,elevation:s.height,cellX:x,cellZ:z});
      }
      if(ids.length)cells.set(z*nw+x,ids);
    }
    return this.navigation={step,nw,nh,nodes,cells,links:new Map()};
  }
  path(a,b,world){
    const nav=this.navigation||this.buildNavigation(world),{step,nw,nodes,cells}=nav;
    const nearest=p=>{
      let best=-1,score=Infinity,px=Math.floor(p.x/step),pz=Math.floor(p.y/step);
      const h=p.elevation??p.baseY??this.height(p.x,p.y);
      for(let z=pz-3;z<=pz+3;z++)for(let x=px-3;x<=px+3;x++)for(const id of cells.get(z*nw+x)||[]){
        const n=nodes[id],dh=Math.abs(n.elevation-h),d=Math.hypot(p.x-n.x,p.y-n.y)+dh*3;
        if(d<score&&dh<.8){score=d;best=id;}
      }return best;
    };
    const start=nearest(a),end=nearest(b);if(start<0||end<0)return[];
    const from=new Int32Array(nodes.length).fill(-1),queue=[start];from[start]=start;
    for(let head=0;head<queue.length;head++){
      const id=queue[head];if(id===end)break;const p=nodes[id];
      if(!nav.links.has(id)){
        const links=[];
        for(const[dx,dz]of[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]])for(const next of cells.get((p.cellZ+dz)*nw+p.cellX+dx)||[]){
          const q=nodes[next],rise=q.elevation-p.elevation;
          if(rise>.5||rise<-1.1)continue;
          if(![.25,.5,.75].every(t=>world.canStand(p.x+(q.x-p.x)*t,p.y+(q.y-p.y)*t,.27,Math.max(p.elevation,q.elevation))))continue;
          links.push(next);
        }nav.links.set(id,links);
      }
      for(const next of nav.links.get(id)){if(from[next]!==-1)continue;from[next]=id;queue.push(next);}

    }
    if(from[end]===-1)return[];const result=[];for(let id=end;;id=from[id]){result.push(nodes[id]);if(id===start)break;}return result.reverse();
  }
}
