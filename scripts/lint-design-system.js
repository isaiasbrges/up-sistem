'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {generate}=require('../design-system/build');
const root=path.resolve(__dirname,'..'),config=require('../.design-system-lint.json');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const files=directory=>fs.readdirSync(directory,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(path.join(directory,e.name)):e.isFile()?[path.join(directory,e.name)]:[]);
const model=JSON.parse(read(config.source));
assert.equal(read(config.generatedCss),generate(model),'tokens.css precisa ser regenerado.');
const base=Object.fromEntries(model.color.tokens.map(t=>[t.name,t.value]));
function resolved(name,theme,seen=new Set()){
 assert.ok(!seen.has(name),'Alias circular: '+name);seen.add(name);
 const value=theme[name];assert.equal(typeof value,'string','Token ausente: '+name);
 const alias=value.match(/^\{([\w-]+)\}$/);return alias?resolved(alias[1],theme,seen):value;
}
function luminance(hex){assert.match(hex,/^#[0-9a-f]{6}$/i);const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;}
function contrast(a,b){const x=luminance(a),y=luminance(b);return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
let pairs=0;
const textMinimum=config.minimumTextContrast,graphicMinimum=config.minimumGraphicContrast;
for(const [name,theme]of [['light',base],['dark',{...base,...model.color.dark}]]){
 for(const token of Object.keys(theme))resolved(token,theme);
 for(const [fg,bg,minimum]of [['text-primary','surface',textMinimum],['text-secondary','surface',textMinimum],['text-muted','surface',textMinimum],['app-muted','surface',textMinimum],['primary-text','surface',textMinimum],['on-primary','primary',textMinimum],['on-primary','primary-hover',textMinimum],['on-primary','primary-active',textMinimum],['on-danger','danger',textMinimum],['on-danger','danger-hover',textMinimum],['on-accent','accent',textMinimum],['on-accent','accent-active',textMinimum],['text-on-hero-muted','surface-hero',textMinimum],['chart-primary','surface',graphicMinimum],['chart-highlight','surface',graphicMinimum],['border-control','surface',graphicMinimum],['focus-ring','surface',graphicMinimum]]){
  const ratio=contrast(resolved(fg,theme),resolved(bg,theme));assert.ok(ratio>=minimum,`${name}: ${fg}/${bg}: ${ratio.toFixed(2)} < ${minimum}`);pairs++;
 }
 for(const [fg,bg]of [['staff-text','staff-card'],['staff-muted','staff-card'],['staff-orange-ink','staff-card'],['staff-blue-ink','staff-card'],['staff-success','staff-card'],['up-black','up-orange'],['up-black','up-offwhite'],['staff-warm-muted','up-offwhite'],['staff-warm-success','up-offwhite']]){const ratio=contrast(resolved(fg,theme),resolved(bg,theme));assert.ok(ratio>=textMinimum,`${name}: admin ${fg}/${bg}: ${ratio.toFixed(2)} < ${textMinimum}`);pairs++;}
}
let links=0;
for(const file of files(path.join(root,'design-system')).filter(p=>/\.(html|css)$/.test(p))){
 const content=fs.readFileSync(file,'utf8');
 const refs=[...content.matchAll(/(?:src|href)=["']([^"']+)["']/g)].map(m=>m[1]);
 if(file.endsWith('.css'))refs.push(...[...content.matchAll(/url\(["']?([^"')]+)["']?\)/g)].map(m=>m[1]));
 for(const ref of refs){if(/^(?:#|https?:|data:|mailto:|javascript:)/i.test(ref))continue;const clean=decodeURIComponent(ref.split(/[?#]/)[0]);if(!clean)continue;const target=clean.startsWith('/')?path.join(root,clean):path.resolve(path.dirname(file),clean);assert.ok(fs.existsSync(target),`Referência inexistente: ${path.relative(root,file)} → ${ref}`);links++;}
}
const inventory=JSON.parse(read('design-system/audit/source-inventory.json'));
for(const entry of inventory.files){
 const target=path.join(root,'design-system',entry.destination);assert.ok(fs.existsSync(target),'Arquivo perdido: '+entry.source);
 if(entry.source.endsWith('.html')){const html=fs.readFileSync(target,'utf8');for(const variant of entry.variants)assert.ok(html.includes(variant),'Variante perdida: '+variant+' em '+entry.source);}
 if(/\.(?:png|woff|svg|txt)$/.test(entry.source)){const sha=require('node:crypto').createHash('sha256').update(fs.readFileSync(target)).digest('hex');assert.equal(sha,entry.sourceSha256,'Asset alterado: '+entry.source);}
}
for(const font of JSON.parse(read('design-system/audit/recovered-fonts.json'))){
 const bytes=fs.readFileSync(path.join(root,'design-system',font.file));
 assert.equal(bytes.subarray(0,4).toString(),'wOFF','Fonte inválida: '+font.file);
 assert.equal(require('node:crypto').createHash('sha256').update(bytes).digest('hex'),font.sha256,'Fonte recuperada alterada: '+font.file);
}
for(const directory of config.scan)for(const file of files(path.join(root,directory)).filter(p=>/\.(?:css|js|html)$/.test(p))){
 const content=fs.readFileSync(file,'utf8').toLowerCase();for(const color of config.forbiddenBrandColors)assert.ok(!content.includes(color),`Cor antiga: ${path.relative(root,file)} contém ${color}`);
}
console.log(`PASS design: ${inventory.files.length} arquivos preservados, ${links} caminhos locais, ${pairs} pares de contraste e tokens sincronizados.`);
