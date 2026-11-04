// Opção N (não se aplica) no Diagnóstico UP: score:null fica fora das médias, dos cuidados e do gargalo.
const {test}=require('node:test');
const assert=require('node:assert/strict');
const L=require('../app/logic.js');
const S=require('../server/shared/schemas.js');
const C=require('../app/charts.js');

const RODA=['Comunhão com Deus','Família','Saúde e energia','Propósito e clareza','Finanças pessoais','Negócio','Relacionamentos','Contribuição e serviço'];
const input=(roda,radar,gargalo)=>({roda:Object.fromEntries(RODA.map((k,i)=>[k,{score:roda[i]}])),radar:{Vendas:{score:radar[0]},Pessoas:{score:radar[1]},Processos:{score:radar[2]},Finanças:{score:radar[3]}},gargalo});

test('N fica fora das médias, dos pontos de cuidado e do gargalo',()=>{
 const r=L.diagnostic(input([null,2,5,0,3,8,8,7],[4,null,0,2],'Processos'));
 assert.equal(r.mediaRoda,4.7);           // (2+5+0+3+8+8+7)/7
 assert.equal(r.mediaRadar,2);             // (4+0+2)/3
 assert.deepEqual(r.cuidados,['Propósito e clareza']);
 assert.equal(r.gargalo,'Processos');
 const low=L.diagnostic(input([null,null,6,6,6,6,6,6],[null,null,null,3],'Finanças'));
 assert.deepEqual(low.cuidados,RODA.slice(2));
 assert.equal(low.gargalo,'Finanças');
 assert.equal(low.mediaRadar,3);
});

test('cada parte precisa de pelo menos uma nota de 0 a 10',()=>{
 assert.throws(()=>L.diagnostic(input(Array(8).fill(null),[1,2,3,4],'Vendas')),/incompletas/);
 assert.throws(()=>L.diagnostic(input(Array(8).fill(5),[null,null,null,null],'Vendas')),/incompletas/);
});

test('o servidor aceita N, recusa gargalo marcado como N e exige uma nota real',()=>{
 const ok=S.diagnostic.safeParse(input([null,2,5,0,3,8,8,7],[4,null,0,2],'Processos'));
 assert.equal(ok.success,true,JSON.stringify(ok.error?.issues));
 assert.equal(S.diagnostic.safeParse(input([1,2,3,4,5,6,7,8],[4,null,3,2],'Pessoas')).success,false);
 assert.equal(S.diagnostic.safeParse(input(Array(8).fill(null),[4,5,3,2],'Finanças')).success,false);
 assert.equal(S.diagnostic.safeParse(input([1,2,3,4,5,6,7,8],[null,null,null,null],'Vendas')).success,false);
 assert.equal(S.diagnostic.safeParse(input([1,2,3,4,5,6,7,8],[4,11,3,2],'Finanças')).success,false);
 assert.equal(S.diagnosticDraft.safeParse({roda:{Família:{score:null}},radar:{}}).success,true);
});

test('o gráfico da Roda mostra N/A sem marcar o ponto como zero',()=>{
 const svg=C.radar(RODA.map((name,i)=>({name,value:i===3?null:i+1})));
 assert.match(svg,/>N\/A</);
 assert.doesNotMatch(svg,/Propósito e clareza: /);
 assert.equal((svg.match(/<circle class="radar-point/g)||[]).length,7);
});
