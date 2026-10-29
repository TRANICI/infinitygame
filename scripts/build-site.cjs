"use strict";
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),out=path.join(root,'dist');
const files=['index.html','viewport.js','style.css','dust2-layout.js','dust2-architecture.js','dust2-objects.js','terrain.js','fps-map.js','fps-match.js','fps-audio.js','fps-renderer.js','fps-game.js'];
fs.mkdirSync(out,{recursive:true});
// Remove retired runtime files from the generated directory before publishing.
for(const entry of fs.readdirSync(out,{withFileTypes:true}))if(entry.isFile()&&!files.includes(entry.name)&&entry.name!=='.nojekyll')fs.unlinkSync(path.join(out,entry.name));
for(const file of files)fs.copyFileSync(path.join(root,file),path.join(out,file));
fs.writeFileSync(path.join(out,'.nojekyll'),'');
console.log(`Built ${files.length} static files in dist/ (${files.reduce((n,f)=>n+fs.statSync(path.join(out,f)).size,0)} bytes)`);
