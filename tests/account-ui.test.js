'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function setup(){
  const cleared=[],window={UPBackend:{version:1},UPForms:{clear:id=>cleared.push(id)}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../app/account.js'),'utf8'),{window,document:{addEventListener(){}},Date});
  const doc={title:'Documento de teste',version:'v1',digest:'hash-teste',body:'<script>não executar</script>'};
  const state={signed:true,user:{id:'a',role:'aluno'},legal:{required:true,available:true,accepted:false,documents:{terms:{...doc},privacy:{...doc}}},privacy:{requests:[]}};
  return {ui:window.UPAccount,state,cleared,h:{head:t=>t,panel:(t,b)=>t+b}};
}
test('nova versão limpa confirmações anteriores mesmo quando o texto permanece igual',()=>{
  const {ui,state,cleared,h}=setup();ui.legal(state,h);assert.equal(cleared.length,1);ui.legal(state,h);assert.equal(cleared.length,1);
  state.legal.documents.terms.version='v2';ui.legal(state,h);assert.equal(cleared.length,2);
  state.user.id='b';ui.legal(state,h);assert.equal(cleared.length,3);
});
test('documentos e notas são texto seguro; solicitação em atendimento não oferece cancelamento',()=>{
  const {ui,state,h}=setup();const html=ui.legal(state,h);assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);assert.match(html,/name="termsAccepted" type="checkbox" required/);
  state.privacy.requests=[{id:'test',kind:'delete',status:'processing',created_at:'2026-10-28',resolution_note:'<img src=x onerror=alert(1)>'}];
  const profile=ui.panel(state,h);assert.doesNotMatch(profile,/<img|data-account-action="cancel"/);assert.match(profile,/&lt;img/);
  state.user.role='admin';state.legal.required=false;state.legal.accepted=true;
  assert.doesNotMatch(ui.legal(state,h),/Aceite registrado/);assert.doesNotMatch(ui.panel(state,h),/Aceite registrado/);
});
