// Teste estático das telas: renderização das rotas sem navegador/servidor.
const vm=require('node:vm'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const base=path.join(__dirname,'..');
let src=fs.readFileSync(path.join(base,'app','app.js'),'utf8');src=src.replace(/render\(\);\n\}\)\(\);\s*$/,'window.__test={routes,state,render};render();\n})();');
let html='';const el={'#app':{set innerHTML(s){html=s},get innerHTML(){return html}},'#toast':{innerHTML:''}};
const UP={icon:(n)=>'<svg>'+n+'</svg>',hydrate:()=>{}};
const context={window:{UP,UPLogic:require('../app/logic.js'),addEventListener(){},scrollTo(){}},UP,document:{querySelector:s=>el[s]||null,querySelectorAll:()=>[],addEventListener(){}},location:{hash:''},localStorage:{getItem:()=>null,setItem(){}},console,setTimeout,clearTimeout,Intl,Date,URL,Blob};
vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(base,'app/charts.js'),'utf8'),context);vm.runInContext(src,context);
assert.match(html,/Acesse sua conta/);
const {routes,state}=context.window.__test;state.signed=true;
for(const [route,fn] of Object.entries(routes)){const output=fn();assert.ok(output.length>200,`${route}: tela vazia`);assert.match(output,/Software UP|Kit|Raio-X|Diagnóstico|Histórico|Conta|Ajuda|Gestão|Painel|Não/);}
state.entitlements.kit=true;
for(const route of ['ledger','scripts','offers','plan','procedures'])assert.ok(routes[route]().length>1600,route);
state.diagnostics.push({id:1,created:'2026-10-26',result:{mediaRadar:5.5,mediaRoda:6,cuidados:['Família'],gargalo:'Finanças',roda:Object.fromEntries(['Comunhão com Deus','Família','Saúde e energia','Propósito e clareza','Finanças pessoais','Negócio','Relacionamentos','Contribuição e serviço'].map(n=>[n,{score:6}])),radar:Object.fromEntries(['Vendas','Pessoas','Processos','Finanças'].map(n=>[n,{score:5}]))}});
assert.match(routes['diagnostic-result'](),/Média Radar/);
console.log('PASS: '+Object.keys(routes).length+' rotas, cinco ferramentas do Kit, resultado do Diagnóstico.');
