"use strict";
const fs=require('node:fs'),cp=require('node:child_process');
for(const file of [...fs.readdirSync('.').filter(f=>/\.(js|cjs)$/.test(f)),...fs.readdirSync('scripts').filter(f=>f.endsWith('.cjs')).map(f=>'scripts/'+f)]){const result=cp.spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(result.status)process.exit(result.status);}
console.log('All JavaScript syntax checks passed.');
