'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm'),fs=require('node:fs');
const {startTestDatabase}=require('./helpers/postgres');
const {createHttpApp}=require('../server/http/app');
const {RODA,RADAR}=require('../server/shared/schemas');
const {seedLegal}=require('./helpers/legal');

test('interface conectada: formulários atravessam HTTP e persistem em tabelas por aluno',async t=>{
  const {db,owner}=await startTestDatabase(t),sent=new Map();
  const app=createHttpApp({db,authSecret:'client-tests-only-auth-secret-'.repeat(2),sendCode:async(e,c)=>sent.set(e,c)});
  const account=await app.locals.identity.provision({email:'cliente-ui@example.com',products:['front','kit']});
  for(const [key,value]of [['kit.purchase_url','https://checkout.example.test/kit'],['support.url','https://suporte.example.test'],['support.email','suporte@example.test']])await owner.query('INSERT INTO up_private.settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value',[key,JSON.stringify(value)]);
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
  const base='http://127.0.0.1:'+server.address().port;let cookie='';
  function boot(){
    let html='',lastBlob;const downloads=[],listeners={},elements={'#app':{set innerHTML(v){html=v;},get innerHTML(){return html;}},'#toast':{innerHTML:''}};
    const window={UP_CONFIG:{api:true,apiVersion:1},UPLogic:require('../app/logic'),UP:{icon:()=>'',hydrate(){}},addEventListener(k,f){(listeners[k]||=[]).push(f);},dispatchEvent(e){for(const f of listeners[e.type]||[])f(e);},scrollTo(){}};
    class LocalURL extends URL{static createObjectURL(blob){lastBlob=blob;return 'blob:up-test';}static revokeObjectURL(){}}
    const context={window,UP:window.UP,document:{querySelector:q=>elements[q]||null,querySelectorAll:()=>[],addEventListener(){},createElement:()=>({click(){downloads.push({filename:this.download,blob:lastBlob});},remove(){}}),body:{appendChild(){}}},
      location:{hash:''},localStorage:{getItem:()=>null,setItem(){throw Error('Dados da conta não podem ir ao localStorage.');}},
      FormData:class{constructor(form){this.values=form.values;}entries(){return Object.entries(this.values);}},URL:LocalURL,URLSearchParams,Blob,structuredClone,AbortSignal,setTimeout,clearTimeout,console,confirm:()=>true,
      CustomEvent:class{constructor(type,{detail}){this.type=type;this.detail=detail;}},fetch:async(url,options={})=>{const response=await fetch(base+url,{...options,headers:{...options.headers,...(cookie?{Cookie:cookie}:{})}});const set=response.headers.get('set-cookie');if(set)cookie=set.split(';')[0];return response;}};
    vm.createContext(context);for(const file of ['app/charts.js','app/api.js','app/api-v1.js','app/account.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
    const source=fs.readFileSync('app/app.js','utf8').replace(/render\(\);\n\}\)\(\);\s*$/,'window.__test={getState:()=>state,formSubmit,doAction,navigate,routes};render();\n})();');vm.runInContext(source,context);
    return {api:window.__test,backend:window.UPBackend,html:()=>html,downloads};
  }
  const ui=boot(),form=(id,values)=>({id,values,querySelector:()=>({disabled:false})});
  for(let i=0;i<100&&!ui.html().includes('Acesse sua conta');i++)await new Promise(r=>setTimeout(r,10));
  await ui.api.formSubmit(form('login-form',{email:account.email}));
  await ui.api.formSubmit(form('verify-form',{code:sent.get(account.email)}));assert.equal(ui.api.getState().signed,true);

  await t.test('canais configurados no administrador chegam às telas do aluno',async()=>{
    assert.equal(ui.api.getState().admin.kitLink,'https://checkout.example.test/kit');
    const html=ui.api.routes.support();assert.match(html,/https:\/\/suporte\.example\.test/);assert.match(html,/mailto:suporte@example\.test/);
  });

  await t.test('rascunho incompleto mantém textos vazios e a etapa, sem acessar outra conta',async()=>{
    ui.api.getState().diagnosticDraft.roda.Família={score:5,evidence:'Estou organizando a rotina.'};ui.api.getState().diagStep=1;
    ui.backend.save(ui.api.getState());await ui.backend.flush();
    const {rows:[draft]}=await owner.query("SELECT data,step FROM up.user_drafts WHERE user_id=$1 AND resource='diagnostic'",[account.id]);assert.equal(draft.step,1);assert.equal(draft.data.roda.Família.score,5);
  });
  await t.test('diagnóstico final usa o resultado calculado no servidor',async()=>{
    const state=ui.api.getState();state.diagnosticDraft.roda=Object.fromEntries(RODA.map(k=>[k,{score:6}]));state.diagnosticDraft.radar=Object.fromEntries(RADAR.map((k,i)=>[k,{score:7-i}]));
    await ui.api.formSubmit(form('diagnostic-profile',{gargalo:'Finanças',dificuldade:'dinheiro que não fecha',dificuldadeTexto:'',business:'Serviço',age:'3 anos',band:'R$ 20 mil a R$ 50 mil',team:'2'}));
    assert.equal(state.diagnostics.length,1);assert.equal(state.diagnostics[0].result.mediaRadar,5.5);
    assert.equal((await owner.query('SELECT count(*)::integer AS n FROM up.diagnostics WHERE user_id=$1',[account.id])).rows[0].n,1);
  });
  await t.test('lançamentos e contas usam valores decimais e versões do servidor',async()=>{
    await ui.api.formSubmit(form('transaction-form',{date:'2026-10-28',desc:'Venda UI',value:'123.45',type:'entrada',category:'vendas',scope:'empresa'}));
    const state=ui.api.getState(),tx=state.kitTransactions[0];assert.equal(tx.value,'123.45');assert.equal(tx.version,1);
    state.editingTransaction=tx.id;await ui.api.formSubmit(form('transaction-form',{date:'2026-10-28',desc:'Venda UI revisada',value:'150.10',type:'entrada',category:'vendas',scope:'empresa'}));
    assert.equal(state.kitTransactions.length,1);assert.equal(state.kitTransactions[0].version,2);
    await ui.api.formSubmit(form('bill-form',{desc:'Conta UI',due:'2026-10-30',value:'20.10'}));
    await ui.api.doAction({dataset:{action:'toggle-bill',id:state.kitBills[0].id}});assert.equal(state.kitBills[0].paid,true);
  });
  await t.test('oferta preserva provas, condições e CTA; plano e procedimento são salvos',async()=>{
    await ui.api.formSubmit(form('offer-form',{name:'Oferta UI',type:'Prestador de serviço',audience:'Empresas',problem:'Organização',promise:'Clareza',delivery:'Consultoria',proof:'Experiência comprovada',terms:'Condições combinadas',cta:'Agendar conversa'}));
    assert.equal(ui.api.getState().personalOffers[0].proof,'Experiência comprovada');
    await ui.api.formSubmit(form('plan-form',{result:'Organizar financeiro',phase1:'Reunir registros',reminder:'sexta-feira'}));
    await ui.api.formSubmit(form('checkin-form',{q1:'Organizei o caixa',q2:'Mais clareza',q3:'Tempo',q4:'Agenda',q5:'Revisar'}));
    assert.equal(ui.api.getState().checkins[0].planId,ui.api.getState().plan.id);
    await ui.api.formSubmit(form('procedure-form',{task:'Conferir caixa',owner:'João',steps:'Conferir extrato\nRegistrar saldo',goal:'Fechamento',deadline:'Sexta',standard:'Sem diferenças',fallback:'Conferir comprovantes'}));
    assert.equal(ui.api.getState().procedures[0].fallback,'Conferir comprovantes');
  });
  await t.test('conclusão do Raio-X envia os números e recebe os centavos calculados',async()=>{
    const state=ui.api.getState();state.financeDraft={revenue:'100.05',sales:'3',variable:{fees:{value:'0.10',unit:'currency'},tax:{value:'0.20',unit:'currency'}},fixed:{},owner:'0',house:'0',separate:'sim',debts:[],reserveCompany:'0',reservePersonal:'0',month:'2026-10',estimated:true};state.finStep=5;
    ui.api.navigate('finance');await ui.api.doAction({dataset:{action:'fin-next'},isConnected:false});
    assert.equal(state.finances.length,1);assert.equal(state.finances[0].result.cv,'0.30');assert.equal(state.finances[0].result.afterDebt,'99.75');assert.equal(state.finances[0].input.estimates.general,true);
  });
  await t.test('botão de exportação baixa os dados completos do servidor',async()=>{
    await ui.api.doAction({dataset:{action:'export-json'}});assert.equal(ui.downloads.length,1);
    const download=ui.downloads[0];assert.equal(download.filename,'software-up-meus-dados.json');
    const data=JSON.parse(await download.blob.text());assert.equal(data.identity.id,account.id);assert.equal(data.transactions[0].value,'150.10');assert.equal(data.procedures.length,1);
  });
  await t.test('documentos publicados levam ao aceite e o formulário libera as ferramentas',async()=>{
    await seedLegal(owner);const consent=boot();for(let i=0;i<200&&!consent.api.getState().signed;i++)await new Promise(r=>setTimeout(r,10));
    consent.api.navigate('legal');assert.equal(consent.api.getState().legal.accepted,false);assert.equal(consent.api.getState().diagnostics.length,0);assert.match(consent.html(),/Aceitar e continuar/);
    await assert.rejects(consent.api.formSubmit(form('legal-consent-form',{termsAccepted:'on'})),e=>e.status===400);
    await consent.api.formSubmit(form('legal-consent-form',{termsAccepted:'on',privacyAccepted:'on'}));assert.equal(consent.api.getState().legal.accepted,true);assert.equal(consent.api.getState().diagnostics.length,1);
    consent.api.navigate('profile');await consent.api.formSubmit(form('privacy-delete-form',{confirmed:'on',reason:'Solicitação fictícia pela interface'}));
    assert.equal(consent.api.getState().privacy.requests[0].status,'pending');assert.match(consent.html(),/Cancelar solicitação/);
  });
  await t.test('reabrir carrega todos os registros sem gravar a conta no navegador',async()=>{
    const reopened=boot();for(let i=0;i<200&&!reopened.api.getState().signed;i++)await new Promise(r=>setTimeout(r,10));
    const state=reopened.api.getState();assert.equal(state.signed,true);assert.equal(state.personalOffers[0].cta,'Agendar conversa');assert.equal(state.plan.result,'Organizar financeiro');assert.equal(state.checkins.length,1);assert.equal(state.procedures.length,1);assert.equal(state.finances[0].result.afterDebt,'99.75');
    await reopened.backend.logout();await ui.backend.logout();
  });
});
