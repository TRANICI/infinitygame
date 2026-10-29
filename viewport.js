"use strict";
// Rotate the entire game when needed, and invert that rotation for touch input.
// This works without fullscreen or the browser's optional orientation-lock API.
const ArenaViewport=(()=>{
  const coarse=matchMedia('(pointer:coarse)');
  // clientWidth stays stable when a rotated child would otherwise expand the
  // mobile layout viewport during an orientation change.
  const physical=()=>({width:document.documentElement.clientWidth,height:document.documentElement.clientHeight});
  const rotated=()=>{const{width,height}=physical();return coarse.matches&&height>width;};
  const size=()=>{const{width,height}=physical();return rotated()?{width:height,height:width}:{width,height};};
  function update(){
    const {width,height}=size();
    document.body.classList.toggle('mobile-landscape',coarse.matches);
    document.body.classList.toggle('viewport-rotated',rotated());
    document.body.classList.toggle('mobile-compact',coarse.matches&&height<380);
    document.documentElement.style.setProperty('--game-width',width+'px');
    document.documentElement.style.setProperty('--game-height',height+'px');
    document.dispatchEvent(new Event('arenaviewportchange'));
  }
  window.addEventListener('resize',update);coarse.addEventListener('change',update);update();
  return{get rotated(){return rotated();},get size(){return size();},delta(x,y){return rotated()?{x:y,y:-x}:{x,y};}};
})();
