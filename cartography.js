"use strict";
// Persistent knowledge, separate from the complete navigation geometry.
class WardCartography{
  static cell=3;
  constructor(state){this.s=state;this.last=null;}
  reset(saved){
    this.columns=Math.ceil(WZ.width/WardCartography.cell);const limit=this.columns*Math.ceil(WZ.height/WardCartography.cell);
    this.s.charted=Array.isArray(saved)?[...new Set(saved.filter(v=>Number.isInteger(v)&&v>=0&&v<limit))]:[];
    this.s.mapSeen=new Set(this.s.charted);this.last=null;
  }
  update(force=false){
    const p=this.s.player,size=WardCartography.cell;
    if(!force&&this.last&&WZ.distance(this.last,p)<1.5&&Math.abs((this.last.elevation||0)-(p.elevation||0))<1)return false;
    this.last={x:p.x,y:p.y,elevation:p.elevation};let changed=false;
    const radius=p.torch?8:5,cx=Math.floor(p.x/size),cy=Math.floor(p.y/size),reach=Math.ceil(radius/size);
    for(let y=cy-reach;y<=cy+reach;y++)for(let x=cx-reach;x<=cx+reach;x++){
      if(x<0||y<0||x>=this.columns||y*size>=WZ.height)continue;
      const id=y*this.columns+x;if(this.s.mapSeen.has(id))continue;
      let visible=x===cx&&y===cy;
      for(const[dx,dy]of[[.5,.5],[.2,.2],[.8,.8]]){
        if(visible)break;const q={x:(x+dx)*size,y:(y+dy)*size,elevation:p.elevation};
        if(WZ.distance(p,q)>radius||WZ.solid(q.x,q.y))continue;
        const h=WZ.groundHeight(q.x,q.y,p.elevation);if(h===null||Math.abs(h-p.elevation)>2)continue;
        visible=WZ.lineOfSight(p,q);
      }
      if(visible){this.s.mapSeen.add(id);this.s.charted.push(id);changed=true;}
    }
    return changed;
  }
  static known(g,x,y){return g.mapSeen?.has(Math.floor(y/this.cell)*Math.ceil(WZ.width/this.cell)+Math.floor(x/this.cell))||false;}
  static roomKnown(g,r){const b=r.box;return this.known(g,(b[0]+b[2])/2,(b[1]+b[3])/2)||!!r.door&&this.known(g,r.door[0],r.door[1]);}
}
