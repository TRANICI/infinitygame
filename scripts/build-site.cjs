"use strict";
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
const files=['index.html','style.css','dust2-layout.js','dust2-scene.js','dust2-architecture.js','annex.js','courtyard-rooms.js','terrain.js','core.js','audio.js','renderer.js','atmosphere.js','world3d.js','input.js','cartography.js','scare.js','pursuer.js','interactions.js','investigation.js','game.js'];
fs.mkdirSync(out,{recursive:true});
for(const file of files)fs.copyFileSync(path.join(root,file),path.join(out,file));
fs.writeFileSync(path.join(out,'.nojekyll'),'');
console.log(`Built ${files.length} static files in dist/ (${files.reduce((n,f)=>n+fs.statSync(path.join(out,f)).size,0)} bytes)`);
