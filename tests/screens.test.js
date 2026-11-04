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
// Visão geral de primeiro dia: sem diagnóstico nem Raio-X, o painel mostra os passos.
assert.match(routes.dashboard(),/Seu painel ganha vida/);
assert.match(routes.dashboard(),/Fazer meu diagnóstico/);
assert.doesNotMatch(routes.dashboard(),/Evolução financeira/);
state.entitlements.kit=true;
for(const route of ['ledger','scripts','offers','plan','procedures'])assert.ok(routes[route]().length>1600,route);
state.diagnostics.push({id:1,created:'2026-10-26',result:{mediaRadar:5.5,mediaRoda:6,cuidados:['Família'],gargalo:'Finanças',roda:Object.fromEntries(['Comunhão com Deus','Família','Saúde e energia','Propósito e clareza','Finanças pessoais','Negócio','Relacionamentos','Contribuição e serviço'].map(n=>[n,{score:6}])),radar:Object.fromEntries(['Vendas','Pessoas','Processos','Finanças'].map(n=>[n,{score:5}]))}});
assert.match(routes['diagnostic-result'](),/Média Radar/);
// Com diagnóstico e sem Raio-X, o próximo passo é o Raio-X; com Raio-X, volta o painel completo.
assert.match(routes.dashboard(),/Falta um passo/);
assert.match(routes.dashboard(),/Fazer meu Raio-X/);
assert.match(routes.dashboard(),/Seu gargalo/);
const L=context.window.UPLogic;const fin={revenue:20000,sales:40,variable:{},fixed:{rent:2000},owner:3000,house:2000,separate:'sim',debts:[],reserveCompany:5000};
state.finances.push({id:9,created:'2026-10-26',month:'2026-10',input:fin,result:L.finance(fin)});
assert.match(routes.dashboard(),/Evolução financeira/);
assert.doesNotMatch(routes.dashboard(),/Seu painel ganha vida|Falta um passo/);
state.finances.pop();
// Telas do aluno sem anotações internas da equipe.
for(const route of ['scripts','plan'])assert.doesNotMatch(routes[route](),/Bring|aula F\.1|transacional|provisóri/,route);
// Selo da Roda acompanha a média registrada.
assert.match(routes['diagnostic-result'](),/Pede atenção/);
assert.doesNotMatch(routes['diagnostic-result'](),/Vida em equilíbrio/);
// Quem já tem o Kit Completo não recebe a oferta dele.
assert.doesNotMatch(routes['kit-essential'](),/Explorar Kit Completo/);
// Diagnóstico: opção N (não se aplica) nas perguntas e N/A nos resultados.
assert.match(routes.diagnostic(),/data-score-value="na"/);
state.diagnostics.at(-1).result.roda['Família']={score:null};state.diagnostics.at(-1).result.radar['Pessoas']={score:null};
assert.match(routes['diagnostic-result'](),/N\/A/);
const {render}=context.window.__test;
render();assert.doesNotMatch(html,/sidebar-promo/);
state.entitlements.kit=false;state.entitlements.essencial=true;
assert.match(routes['kit-essential'](),/Explorar Kit Completo/);
render();assert.match(html,/sidebar-promo/);
state.entitlements.kit=true;
console.log('PASS: '+Object.keys(routes).length+' rotas, cinco ferramentas do Kit, resultado do Diagnóstico.');
