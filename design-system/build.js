'use strict';
const fs=require('node:fs'),path=require('node:path');
const base=__dirname;
const css=value=>String(value).replace(/\{([\w-]+)\}/g,'var(--$1)');
function generate(model){
 const declarations=items=>items.map(x=>`  --${x.name}: ${css(x.value)};`).join('\n');
 const light=[...model.color.tokens,...model.shadow.tokens,...model.material.tokens];
 const dark=Object.entries(model.color.dark).map(([name,value])=>({name,value}));
 const units=['spacing','radius','size','borderWidth','breakpoint','zIndex','duration','easing'].flatMap(key=>model[key].tokens);
 let text='/* Gerado por design-system/build.js a partir de tokens.json. */\n';
 text+=':root, :root[data-theme="light"] {\n  color-scheme: light;\n'+declarations(light)+'\n}\n';
 text+=':root[data-theme="dark"] {\n  color-scheme: dark;\n'+declarations(dark)+'\n}\n';
 text+=':root {\n'+declarations(units)+`\n  --font-display: ${model.type.families.display};\n  --font-text: ${model.type.families.text};\n}\n`;
 for(const font of model.type.fonts)text+=`@font-face { font-family:"${font.family}"; src:url("${font.file}") format("woff"); font-style:${font.style}; font-weight:${font.weight}; font-display:swap; }\n`;
 for(const group of model.type.groups)for(const style of group.styles){
  text+=`.${style.name} { font-family:var(--font-${group.family}); font-size:${style.fontSize}; line-height:${style.lineHeight}; font-weight:${style.fontWeight};${style.letterSpacing?' letter-spacing:'+style.letterSpacing+';':''} }\n`;
 }
 return text;
}
if(require.main===module){
 const generated=generate(JSON.parse(fs.readFileSync(path.join(base,'tokens.json'),'utf8'))),target=path.join(base,'tokens.css');
 if(process.argv.includes('--check')){if(fs.readFileSync(target,'utf8')!==generated){console.error('Tokens CSS divergentes. Execute npm run design:build.');process.exitCode=1;}}
 else{fs.writeFileSync(target,generated);console.log('Tokens canônicos gerados.');}
}
module.exports={generate};
