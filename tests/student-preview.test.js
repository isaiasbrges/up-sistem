'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
test('atalho de visualização aparece somente para o administrador',()=>{
 const window={UPAdmin:{snapshot:()=>null}},document={addEventListener(){}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../app/admin-shell.js'),'utf8'),{window,document});
 const render=role=>window.UPAdminShell.render({staffTab:'overview',user:{name:'Equipe UP',role}},'',{active:'admin'});
 assert.match(render('admin'),/data-staff-student-preview/);assert.doesNotMatch(render('suporte'),/data-staff-student-preview/);
});
test('bootstrap de prévia usa dados vazios e não acessa APIs ou contas reais',()=>{
 const listeners={},window={location:{search:'?product=essencial'},addEventListener(){}},document={addEventListener:(name,fn)=>listeners[name]=fn,querySelectorAll:()=>[],documentElement:{}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../app/student-preview-data.js'),'utf8'),{window,document,URLSearchParams,MutationObserver:class{observe(){}},setTimeout:fn=>fn()});
 const state=window.UPPreview();assert.equal(window.UPStudentReadonly,true);assert.equal(state.signed,true);assert.equal(state.entitlements.front,true);assert.equal(state.entitlements.essencial,true);assert.equal(state.entitlements.kit,false);assert.equal(state.diagnostics.length,0);assert.equal(state.finances.length,0);assert.equal(state.kitTransactions.length,0);
 let prevented=0,stopped=0;listeners.submit({preventDefault(){prevented++;},stopImmediatePropagation(){stopped++;}});assert.equal(prevented,1);assert.equal(stopped,1);
});
test('documento da prévia não carrega adaptador de API nem dados ilustrativos anteriores',()=>{
 const html=fs.readFileSync(require.resolve('../server/views/student-preview.html'),'utf8');
 assert.match(html,/student-preview-data\.js/);assert.doesNotMatch(html,/src="[^"\n]*(?:api(?:-v1)?\.js|preview-data\.js)"/);
});
