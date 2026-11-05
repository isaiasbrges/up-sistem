'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(){
  const requests=[],listeners={},cleared=[];const window={UPForms:{clear:id=>cleared.push(id)},UPBackend:{version:1,request:(path,body)=>new Promise((resolve,reject)=>requests.push({path,body,resolve,reject}))}};
  const context=vm.createContext({window,document:{addEventListener:(name,fn)=>listeners[name]=fn},Intl,Date,crypto:require('node:crypto')});
  vm.runInContext(fs.readFileSync(require.resolve('../app/admin.js'),'utf8'),context);
  const state={signed:true,user:{id:'test-admin',role:'admin'}},h={head:t=>t,kpi:(label,n)=>label+': '+n};
  return {ui:window.UPAdmin,requests,state,h,window,listeners,cleared};
}
test('admin conclui carregamento mesmo quando hashchange provoca outra renderização',async()=>{
  const {ui,requests,state,h}=setup();let oldRenders=0,newRenders=0;
  ui.page(state,h);const first=ui.mount({state,render:()=>oldRenders++,flash(){}});
  ui.page(state,h);await ui.mount({state,render:()=>newRenders++,flash(){}});
  assert.equal(requests.length,1);
  requests[0].resolve({students:12,accesses:[],events:{received:8,review:1},jobs:{failed:0}});await first;
  assert.equal(oldRenders,0);assert.equal(newRenders,1);assert.match(ui.page(state,h),/Alunos ativos: 12/);
});
test('resposta atrasada não sobrescreve outra aba nem outra conta',async()=>{
  const {ui,requests,state,h}=setup();let renders=0;const mounted={state,render:()=>renders++,flash(){}};
  ui.page(state,h);const first=ui.mount(mounted);
  state.staffTab='students';ui.page(state,h);const second=ui.mount(mounted);
  requests[1].resolve({items:[{id:'s',name:'<script>nome</script>',email:'aluno@example.com',status:'active',accesses:[]}],nextOffset:null});await second;
  requests[0].resolve({students:99,accesses:[],events:{received:3,review:0},jobs:{failed:0}});await first;
  assert.equal(renders,1);const html=ui.page(state,h);assert.match(html,/aluno@example.com/);assert.doesNotMatch(html,/<script>nome/);
  const other={signed:true,user:{id:'test-support',role:'suporte'}};
  assert.doesNotMatch(ui.page(other,h),/aluno@example.com|Eventos Kiwify|Configurações/);
});

test('snapshot de notificações não recebe dashboard atrasado de outra conta',async()=>{
 const {ui,state,h,window}=setup(),pending=[];
 window.UPAdminDashboard={load:()=>new Promise(resolve=>pending.push(resolve)),render:()=>''};
 const ctx={state,render(){},flash(){}};
 ui.page(state,h);const first=ui.mount(ctx);
 state.user={id:'other-admin',role:'admin'};ui.page(state,h);const second=ui.mount(ctx);
 pending[1]({students:2});await second;pending[0]({students:99});await first;
 assert.equal(ui.snapshot().students,2);
});

test('seleção global limpa revogação e rascunhos do aluno anterior',async()=>{
 const {ui,state,h,requests,listeners,cleared}=setup();state.staffTab='students';
 const students={items:[{id:'a',name:'Aluno A',email:'a@example.com',status:'active',accesses:[{id:'grant-a',product:'front',active:true}]},{id:'b',name:'Aluno B',email:'b@example.com',status:'active',accesses:[]}],nextOffset:null};
 const ctx={state,render(){ui.page(state,h);},flash(){}};ui.page(state,h);const load=ui.mount(ctx);requests[0].resolve(students);await load;
 const click=(action,id)=>listeners.click({target:{closest:selector=>selector==='[data-staff-action]'?{dataset:{staffAction:action,id}}:null}});
 click('select','a');click('prepare-revoke','grant-a');assert.match(ui.page(state,h),/Confirmar revogação/);
 ui.openStudent('b','b@example.com');const next=ui.mount(ctx);requests[1].resolve(students);await next;
 const html=ui.page(state,h);assert.match(html,/Aluno B · acessos/);assert.doesNotMatch(html,/Confirmar revogação/);
 assert.ok(cleared.filter(id=>id==='staff-email').length>=2);assert.ok(cleared.filter(id=>id==='staff-revoke').length>=2);
});

test('busca global não troca de aluno nem bloqueia o painel durante uma alteração',async()=>{
 const {ui,state,h,requests}=setup();state.staffTab='students';let flashes=0;
 const ctx={state,render(){ui.page(state,h);},flash(){flashes++;}};ui.page(state,h);const load=ui.mount(ctx);requests[0].resolve({items:[],nextOffset:null});await load;
 const grant={email:'a@example.com',name:'Aluno A',product:'front',Kind:'months',Count:'12',reason:'Teste de liberação'};
 const first=ui.submit({id:'staff-grant'},grant);ui.openStudent('b','b@example.com');ui.openEvent('some-event');
 assert.equal(state.staffTab,'students');assert.equal(flashes,2);requests[1].resolve({ok:true});await first;
 const second=ui.submit({id:'staff-grant'},{...grant,email:'c@example.com'});assert.equal(requests.length,3);requests[2].resolve({ok:true});await second;
});
