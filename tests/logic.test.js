const assert=require('node:assert/strict');const L=require('../app/logic.js');
const D={roda:Object.fromEntries(['Comunhão com Deus','Família','Saúde e energia','Propósito e clareza','Finanças pessoais','Negócio','Relacionamentos','Contribuição e serviço'].map((x,i)=>[x,{score:i+1}])),radar:{Vendas:{score:7},Pessoas:{score:6},Processos:{score:5},Finanças:{score:4}},gargalo:'Finanças'};
let x=L.diagnostic(D);assert.equal(x.mediaRadar,5.5);assert.equal(x.mediaRoda,4.5);assert.equal(x.gargalo,'Finanças');assert.deepEqual(x.cuidados,['Comunhão com Deus']);
const F={revenue:100000,sales:200,variable:{tax:{value:10,unit:'percent'},fees:{value:2000,unit:'currency'},commission:{value:0},material:{value:30000}},fixed:{rent:10000,staff:10000,systems:2000,marketing:3000,other:0},owner:5000,house:4000,separate:'sim',debts:[{scope:'empresa',payment:5000,rate:3,overdue:false}],reserveCompany:30000};
x=L.finance(F);assert.equal(x.cv,42000);assert.equal(x.mc,58000);assert.equal(x.mcPct,.58);assert.equal(x.fixed,25000);assert.equal(x.operating,33000);assert.equal(x.liquid,28000);assert.equal(x.afterDebt,23000);assert.equal(x.ticket,500);assert.equal(x.traffic.after,'verde');assert.equal(x.months,1);assert.ok(Math.abs(x.breakEven-30000/.58)<.001);
x=L.finance({...F,revenue:10000,variable:{material:{value:12000}},fixed:{},debts:[]});assert.equal(x.breakEven,null);assert.ok(x.steps.some(s=>s.includes('gasta')));assert.equal(x.traffic.slack,'indisponivel');
x=L.finance({...F,debts:[{scope:'empresa',payment:30000,rate:8,overdue:true}]});assert.equal(x.traffic.debt,'vermelho');assert.ok(x.steps[0].includes('atraso'));
assert.equal(L.simulateDebt(1000,0,250,0),4);assert.equal(L.simulateDebt(1000,5,20,0),null);
console.log('PASS: Diagnóstico, empate, margens, custos, dívida, semáforo, simulação.');
// Modelos determinísticos: preencher lacunas sem sobrescrever o plano do aluno.
for(const area of ['Finanças','Vendas','Processos','Pessoas']){const template=L.planTemplate(area);for(const key of ['result','decision1','decision2','decision3','decision4','phase1','phase2','phase3'])assert.ok(template[key]?.length>10,`${area}: modelo incompleto`);}
const myPlan={result:'Meu objetivo próprio',decision1:'   ',phase1:'Minha primeira fase',reminder:'sexta-feira'};
const filled=L.applyPlanTemplate(myPlan,'Finanças');assert.equal(filled.result,myPlan.result);assert.equal(filled.phase1,myPlan.phase1);assert.equal(filled.reminder,myPlan.reminder);assert.ok(filled.decision1.trim());assert.equal(myPlan.decision1,'   ');assert.ok(L.planTemplate('desconhecido').result);
console.log('PASS: modelos fixos por gargalo e preservação dos textos do aluno.');
