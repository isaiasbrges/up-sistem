'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
function dashboard(){const window={};vm.runInNewContext(fs.readFileSync(require.resolve('../app/admin-dashboard.js'),'utf8'),{window,Date,Intl,URL,AbortSignal,fetch:async()=>({ok:true,status:200})});return window.UPAdminDashboard;}
test('cadastros agrupam datas reais em São Paulo e preservam dias sem novos alunos',()=>{
 const ui=dashboard(),now=new Date('2026-11-03T15:00:00Z');
 const rows=ui.series([{created_at:'2026-11-03T01:00:00Z'},{created_at:'2026-11-03T12:00:00Z'},{created_at:'2026-09-01T12:00:00Z'}],7,now);
 assert.equal(rows.length,7);assert.equal(rows.at(-1).count,1);assert.equal(rows.at(-2).count,1);assert.equal(rows.reduce((n,r)=>n+r.count,0),2);
});
test('dashboard vazio não inventa crescimento, atividades ou integração saudável',()=>{
 const html=dashboard().render({students:0,accesses:[],events:{received:0,review:0,failed:0},jobs:{failed:0,pending:0},recentStudents:[],recentEvents:[],health:{live:false,ready:false}},30);
 assert.match(html,/Nenhum cadastro|Sem cadastros/);assert.match(html,/Nenhuma atividade/);assert.match(html,/Não verificado/);assert.doesNotMatch(html,/\+12%|\+27%|Conectada|124/);
});
test('atividades escapam nomes externos e gráfico distingue concessões de alunos únicos',()=>{
 const html=dashboard().render({students:1,accesses:[{product_code:'front',users:1},{product_code:'kit',users:1}],events:{received:1,review:1,failed:0},jobs:{failed:0,pending:0},recentStudents:[{id:'u',name:'<script>unsafe</script>',email:'a@example.com',created_at:'2026-11-03T12:00:00Z'}],recentEvents:[],health:{}},30);
 assert.doesNotMatch(html,/<script>unsafe/);assert.match(html,/&lt;script&gt;/);assert.match(html,/concessões|acessos ativos/);
});
test('carregamento usa contratos existentes e interrompe paginação após a janela de 90 dias',async()=>{
 const calls=[],ui=dashboard(),data=await ui.load({request:async path=>{calls.push(path);if(path==='/admin/overview')return {students:1,accesses:[],events:{received:0,review:0},jobs:{failed:0,pending:0}};if(path.startsWith('/admin/students'))return {items:[{id:'u',created_at:'2020-01-01T00:00:00Z'}],nextOffset:100};if(path.startsWith('/admin/events'))return {items:[],nextOffset:null};throw Error(path);}});
 assert.equal(calls.filter(p=>p.startsWith('/admin/students')).length,1);assert.equal(data.recentStudents.length,1);assert.ok(calls.includes('/admin/overview'));
});
