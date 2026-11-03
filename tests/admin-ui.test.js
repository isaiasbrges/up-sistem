'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(){
  const requests=[];const window={UPBackend:{version:1,request:path=>new Promise((resolve,reject)=>requests.push({path,resolve,reject}))}};
  const context=vm.createContext({window,document:{addEventListener(){}},Intl,Date,crypto:require('node:crypto')});
  vm.runInContext(fs.readFileSync(require.resolve('../app/admin.js'),'utf8'),context);
  const state={signed:true,user:{id:'test-admin',role:'admin'}},h={head:t=>t,kpi:(label,n)=>label+': '+n};
  return {ui:window.UPAdmin,requests,state,h};
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
