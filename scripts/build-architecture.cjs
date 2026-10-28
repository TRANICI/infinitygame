"use strict";
// Convert NAV measurements into solid architectural floors and explicit stair treads.
// Raw navigation polygons contain prop tops and cannot be used as visible scenery.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=path.resolve(__dirname,'..'),context=vm.createContext({});
for(const file of ['dust2-layout.js','dust2-scene.js','dust2-terrain-data.js','terrain.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),context);
const architecture=vm.runInContext(`(()=>{
 const source=new WardTerrain(),pixels=2,step=pixels*DUST2_LAYOUT.scale,w=Math.ceil(820/pixels),h=Math.ceil(805/pixels),count=w*h;
 const low=new Float32Array(count).fill(NaN),upper=new Float32Array(count).fill(NaN),inside=new Uint8Array(count),queue=[];
 const isFloor=(x,y)=>{const row=DUST2_LAYOUT.rows[Math.floor(y)],px=Math.floor(x);return row&&row.some((v,i)=>i%2===0&&px>=v&&px<row[i+1]);};
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const px=(x+.5)*pixels,py=(y+.5)*pixels,id=y*w+x;if(!isFloor(px,py))continue;inside[id]=1;
   const surfaces=source.surfaces(px*DUST2_LAYOUT.scale,py*DUST2_LAYOUT.scale,.9);
   if(surfaces.length){low[id]=surfaces[0].height;queue.push(id);}
   // The bridge over CT is a real second storey. Other raised NAV patches are cover.
   if(px>470&&px<573&&py>120&&py<224&&surfaces.length>1&&surfaces.at(-1).height-surfaces[0].height>1.8)upper[id]=surfaces.at(-1).height;
 }
 // Extend the nearest floor to every visible boundary, never across a map void.
 for(let head=0;head<queue.length;head++){
   const id=queue[head],x=id%w,y=Math.floor(id/w);
   for(const[dx,dy]of[[-1,0],[1,0],[0,-1],[0,1]]){
     const xx=x+dx,yy=y+dy,n=yy*w+xx;if(xx<0||xx>=w||yy<0||yy>=h||!inside[n]||Number.isFinite(low[n]))continue;
     low[n]=low[id];queue.push(n);
   }
 }
 // Remove walkable prop tops from the terrain. Furniture is rendered separately.
 for(const[cx,cy,pw,pd,,a,type]of DUST2_SCENE.structures){
   if(type!=='crate')continue;const sn=Math.sin(a),cs=Math.cos(a),samples=[];
   for(const[dx,dy]of[[-pw/2-4,0],[pw/2+4,0],[0,-pd/2-4],[0,pd/2+4]]){
     const x=Math.floor((cx+dx*sn+dy*cs)/pixels),y=Math.floor((cy-dx*cs+dy*sn)/pixels),value=low[y*w+x];if(Number.isFinite(value))samples.push(value);
   }
   if(!samples.length)continue;const base=Math.min(...samples),radius=Math.max(pw,pd)+8;
   for(let y=Math.max(0,Math.floor((cy-radius)/pixels));y<Math.min(h,(cy+radius)/pixels);y++)for(let x=Math.max(0,Math.floor((cx-radius)/pixels));x<Math.min(w,(cx+radius)/pixels);x++){
     const dx=(x+.5)*pixels-cx,dy=(y+.5)*pixels-cy,side=dx*sn-dy*cs,front=dx*cs+dy*sn;
     if(Math.abs(side)<pw/2+2&&Math.abs(front)<pd/2+2&&inside[y*w+x])low[y*w+x]=base;
   }
 }

 // Architectural landings and straight flights, measured from the NAV plateaus.
 // This intentionally replaces inclined source ground with stairs for the playtest.
 const rect=(x1,y1,x2,y2,value)=>{
   for(let y=Math.max(0,Math.floor(y1/pixels));y<Math.min(h,Math.ceil(y2/pixels));y++)for(let x=Math.max(0,Math.floor(x1/pixels));x<Math.min(w,Math.ceil(x2/pixels));x++){
     const id=y*w+x;if(inside[id])low[id]=typeof value==='function'?value((x+.5)*pixels,(y+.5)*pixels):value;
   }
 };
 const lerp=(v,a,b,from,to)=>from+(to-from)*Math.max(0,Math.min(1,(v-a)/(b-a)));
 for(let i=0;i<count;i++)if(Number.isFinite(low[i])){
   const levels=[1.62,4.68,5.58,7.2,7.92],near=levels.reduce((a,b)=>Math.abs(low[i]-a)<Math.abs(low[i]-b)?a:b);
   if(Math.abs(near-low[i])<.36)low[i]=near;
 }
 rect(74,710,414,784,7.92);rect(151,618,303,710,7.92);rect(151,610,221,634,7.92);
 rect(96,604,151,710,(x,y)=>lerp(y,604,710,4.68,7.92));
 rect(414,706,474,805,(x,y)=>lerp(x,414,474,7.92,4.68));
 rect(102,498,251,604,4.68);rect(160,418,188,498,(x,y)=>lerp(y,418,498,5.58,4.68));
 rect(78,335,251,418,5.58);rect(103,267,130,335,(x,y)=>lerp(y,267,335,4.68,5.58));
 rect(79,150,232,268,4.68);rect(87,20,232,150,4.86);
 rect(240,175,367,216,(x,y)=>lerp(x,240,367,4.68,1.62));
 rect(250,313,378,355,1.62);rect(379,215,426,350,1.62);
 rect(378,350,428,464,(x,y)=>lerp(y,350,464,1.62,4.68));
 rect(340,464,615,706,4.68);rect(430,313,567,351,4.68);
 rect(516,300,566,314,4.68);rect(516,270,566,300,(x,y)=>lerp(y,270,300,7.2,4.68));
 rect(516,222,566,270,7.2);
 rect(566,88,760,175,7.2);rect(653,35,760,88,7.2);
 rect(695,175,764,224,(x,y)=>lerp(y,175,224,7.2,4.68));
 rect(694,224,795,450,4.68);rect(560,370,694,450,4.68);
 rect(699,450,759,496,(x,y)=>lerp(y,450,496,4.68,1.44));rect(699,496,759,558,1.44);
 for(let i=0;i<count;i++)if(Number.isFinite(upper[i]))upper[i]=7.2;
 const quantum=.18,encode=array=>{
   const rows=[];for(let y=0;y<h;y++){
     const runs=[];let previous=-999,count=0;
     for(let x=0;x<w;x++){const f=array[y*w+x],value=Number.isFinite(f)?Math.round(f/quantum):-1;
       if(value!==previous&&count){runs.push(count,previous);count=0;}previous=value;count++;}
     runs.push(count,previous);rows.push(runs);
   }return rows;
 };
 return {width:w,height:h,pixels,stepHeight:quantum,lower:encode(low),upper:encode(upper)};
})()`,context);
const output='"use strict";\nconst DUST2_ARCHITECTURE='+JSON.stringify(architecture)+';\n';
fs.writeFileSync(path.join(root,'dust2-architecture.js'),output);
console.log(`Architectural floors: ${architecture.width} x ${architecture.height}, ${output.length} bytes`);
