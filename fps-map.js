"use strict";
const FP={clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),dist:(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),angle:(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b)),rng(seed){return()=>{seed|=0;seed=seed+0x6d2b79f5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}};
class ArenaMap{
  constructor(){
    this.width=115;this.height=113;this.terrain=new DustTerrain();this.scale=DUST2_LAYOUT.scale;
    this.objects=[...DUST2_OBJECTS.structures,...DUST2_OBJECTS.doors.map(p=>[...p,'door'])].map(([x,y,w,d,h,a,type])=>{const o={x:x*this.scale,y:y*this.scale,width:w*this.scale,depth:d*this.scale,bodyHeight:h,angle:a,type};o.baseY=type==='retaining'?4.68:this.terrain.base(o);return o;});
    this.bins=new Map();for(const o of this.objects){const r=Math.hypot(o.width,o.depth)/2;for(let y=Math.floor((o.y-r)/4);y<=Math.floor((o.y+r)/4);y++)for(let x=Math.floor((o.x-r)/4);x<=Math.floor((o.x+r)/4);x++){const k=x+','+y;if(!this.bins.has(k))this.bins.set(k,[]);this.bins.get(k).push(o);}}
    this.zones=[['T 出生区',49,103],['B 点',27,22],['B 通道',23,62],['中路',56,49],['CT 出生区',74,25],['A 点',99,22],['A 大道',103,55],['A 小道',75,40],['大门',82,75]];
  }
  solid(x,y){const row=DUST2_LAYOUT.rows[Math.floor(y/this.scale)],px=Math.floor(x/this.scale);if(!row||px<0)return true;for(let i=0;i<row.length;i+=2)if(px>=row[i]&&px<row[i+1])return false;return true;}
  near(x,y,r=.3){const set=new Set();for(let yy=Math.floor((y-r)/4);yy<=Math.floor((y+r)/4);yy++)for(let xx=Math.floor((x-r)/4);xx<=Math.floor((x+r)/4);xx++)for(const o of this.bins.get(xx+','+yy)||[])set.add(o);return set;}
  hit(o,x,y,r=0){const dx=x-o.x,dy=y-o.y,s=dx*Math.sin(o.angle)-dy*Math.cos(o.angle),f=dx*Math.cos(o.angle)+dy*Math.sin(o.angle);return Math.abs(s)<o.width/2+r&&Math.abs(f)<o.depth/2+r;}
  canStand(x,y,r=.27,elevation){return ![[-r,-r],[r,-r],[-r,r],[r,r]].some(([a,b])=>this.solid(x+a,y+b))&&!Array.from(this.near(x,y,r)).some(o=>(elevation===undefined||elevation+1.7>o.baseY+.05&&elevation<o.baseY+o.bodyHeight-.05)&&this.hit(o,x,y,r));}
  support(x,y,h){let v=this.terrain.height(x,y,h);for(const o of this.near(x,y)){const top=o.baseY+o.bodyHeight;if(top<=h+.46&&this.hit(o,x,y,.26)&&(v===null||top>v))v=top;}return v;}
  move(p,dx,dy){const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.1));const attempt=(x,y)=>{const h=this.support(x,y,p.elevation);if(h===null||!this.canStand(x,y,.27,Math.max(h,p.elevation)))return;p.x=x;p.y=y;if(!(p.vy>0)&&h>=p.elevation-.46){p.elevation=h;p.vy=0;}};for(let i=0;i<steps;i++){attempt(p.x+dx/steps,p.y);attempt(p.x,p.y+dy/steps);}}
  settle(p,dt){const h=this.support(p.x,p.y,p.elevation);if(h===null)return;if(p.elevation>h+.01||p.vy>0){p.vy=(p.vy||0)-18*dt;p.elevation=Math.max(h,p.elevation+p.vy*dt);}else{p.elevation=h;p.vy=0;}const ceiling=this.terrain.surfaces(p.x,p.y).filter(s=>s.height-.4>h+1.7).reduce((v,s)=>Math.min(v,s.height-.4),Infinity);if(p.elevation+1.7>ceiling){p.elevation=Math.max(h,ceiling-1.7);p.vy=Math.min(0,p.vy);}p.eyeElevation+=(p.elevation-p.eyeElevation)*(1-Math.exp(-16*dt));}
  jump(p){const h=this.support(p.x,p.y,p.elevation);if(h!==null&&Math.abs(p.elevation-h)<.05&&!p.vy){p.vy=5.5;p.elevation+=.02;}}
  point(x,y){const nav=this.terrain.navigation||this.terrain.buildNavigation(this);let best=null,d=Infinity;for(const n of nav.nodes){const v=Math.hypot(n.x-x,n.y-y);if(v<d){d=v;best=n;}}return {...best};}
  path(a,b){return this.terrain.path(a,b,this);}
  tunnelCeiling(x,y){if(x<11.2||x>40.6||y<44.52||y>82.6)return Infinity;const h=this.terrain.height(x,y);return h===null?Infinity:h+4.4;}
  blocked(x,h,y){if(this.solid(x,y))return true;const roof=this.tunnelCeiling(x,y);if(h>roof&&h<roof+.25)return true;const surfaces=this.terrain.surfaces(x,y);if(surfaces.some((s,i)=>i===0?h<s.height-.01:h>s.height-.4&&h<s.height))return true;return Array.from(this.near(x,y,0)).some(o=>h>o.baseY&&h<o.baseY+o.bodyHeight&&this.hit(o,x,y));}
  ray(origin,dir,range=100){for(let d=.06;d<=range;d+=.12)if(this.blocked(origin[0]+dir[0]*d,origin[1]+dir[1]*d,origin[2]+dir[2]*d))return d;return range;}
  visible(a,b){const o=[a.x,a.elevation+1.5,a.y],v=[b.x-a.x,b.elevation-a.elevation-.15,b.y-a.y],d=Math.hypot(...v);return this.ray(o,v.map(v=>v/d),d)>=d-.15;}
  area(p){return [...this.zones].sort((a,b)=>Math.hypot(a[1]-p.x,a[2]-p.y)-Math.hypot(b[1]-p.x,b[2]-p.y))[0][0];}
}
