'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {finance,simulateDebt}=require('../server/modules/finance/logic');
const S=require('../server/shared/schemas');

// Valores esperados conferidos pelas fórmulas do PDF, sem reutilizar outro motor.
const cases=[
  {name:'operação saudável com dívida',input:{revenue:'100000',sales:200,variable:{tax:{value:'10',unit:'percent'},fees:{value:'2000'},material:{value:'30000'}},fixed:{rent:'10000',staff:'10000',systems:'2000',marketing:'3000'},owner:'5000',house:'4000',separate:'sim',debts:[{creditor:'Banco',scope:'empresa',balance:'50000',payment:'5000',rate:'3'}],reserveCompany:'30000'},expected:{cv:'42000.00',mc:'58000.00',fixed:'25000.00',operating:'33000.00',liquid:'28000.00',afterDebt:'23000.00',ticket:'500.00',breakEven:'51724.14',months:'1'}},
  {name:'centavos não viram resíduos binários',input:{revenue:'0.30',sales:3,variable:{tax:{value:'0.10'},fees:{value:'0.20'}},separate:'sim'},expected:{cv:'0.30',mc:'0.00',afterDebt:'0.00',ticket:'0.10',breakEven:null}},
  {name:'percentual fracionado e orçamento pessoal',input:{revenue:'100.05',sales:3,variable:{tax:{value:'1.5',unit:'percent'},fees:{value:'0.50'}},fixed:{rent:'20.01'},owner:'10.02',house:'8.01',separate:'sim',debts:[{creditor:'Empresa',scope:'empresa',balance:'100',payment:'5.55',rate:'1'},{creditor:'Pessoal',scope:'pessoal',balance:'10',payment:'2.01',rate:'0'}],reserveCompany:'60.06'},expected:{cv:'2.00',mc:'98.05',operating:'78.04',liquid:'68.02',afterDebt:'62.47',houseLeft:'0.00',ticket:'33.35',breakEven:'30.64',months:'2'}},
  {name:'margem negativa não fabrica ponto de equilíbrio',input:{revenue:'10000',sales:10,variable:{material:{value:'12000'}},fixed:{rent:'1000'},owner:'500',house:'400',separate:'sim'},expected:{mc:'-2000.00',operating:'-3000.00',afterDebt:'-3500.00',breakEven:null,slack:null,mcPct:'-0.2'}},
  {name:'dívida em atraso e no máximo três ações',input:{revenue:'10000',sales:10,variable:{material:{value:'2000'}},fixed:{rent:'4000'},owner:'2000',house:'1900',separate:'nao',debts:[{creditor:'Empresa',scope:'empresa',balance:'20000',payment:'3500',rate:'5',overdue:true},{creditor:'Pessoal',scope:'pessoal',balance:'1000',payment:'300',rate:'1'}],reserveCompany:'6000'},expected:{cv:'2000.00',liquid:'2000.00',afterDebt:'-1500.00',houseLeft:'-200.00',breakEven:'7500.00',slack:'0.25',months:'1'}},
  {name:'divisores zero produzem indisponível',input:{revenue:'0',sales:0,fixed:{rent:'100'},reserveCompany:'100',separate:'sim'},expected:{ticket:null,breakEven:null,mcPct:null,afterPct:null,debtWeight:null,months:'1',afterDebt:'-100.00'}}
];
for(const item of cases)test('financeiro decimal: '+item.name,()=>{
  const result=finance(S.parse(S.finance,item.input));
  for(const [key,value]of Object.entries(item.expected))assert.equal(result[key],value,key);
  assert.ok(result.steps.length<=3);
  if(item.name.includes('atraso')){assert.equal(result.traffic.debt,'vermelho');assert.match(result.steps[0],/atraso/);assert.match(result.steps[1],/Separe/);assert.match(result.steps[2],/gastando/);}
  if(item.name.includes('negativa'))assert.ok(result.warnings.some(x=>x.includes('Cada venda')));
});

test('simulação de dívida arredonda juros por mês e identifica parcela insuficiente',()=>{
  assert.deepEqual(simulateDebt('1000','0','250'),{months:4,totalInterest:'0.00',totalPaid:'1000.00',unpayable:false});
  assert.deepEqual(simulateDebt('1000','1','500'),{months:3,totalInterest:'15.25',totalPaid:'1015.25',unpayable:false});
  assert.equal(simulateDebt('1000','5','50').unpayable,true);
  assert.equal(simulateDebt('1000','1','500','500').months,2);
});

test('validação recusa datas falsas, campos extras, dinheiro fracionado e acesso injetado',()=>{
  const tx={date:'2026-10-28',desc:'Venda',value:'10.10',type:'entrada',category:'vendas',scope:'empresa'};
  assert.equal(S.parse(S.transaction,tx).value,'10.10');
  for(const data of [{...tx,value:'0.001'},{...tx,date:'2026-02-30'},{...tx,value:-1},{...tx,user_id:'outro'},{...tx,entitlements:{kit:true}}])assert.throws(()=>S.parse(S.transaction,data),e=>e.status===400);
  assert.throws(()=>S.parse(S.finance,{variable:{tax:{value:'101',unit:'percent'}}}),e=>e.status===400);
  assert.throws(()=>S.parse(S.finance,{variable:{fees:{value:'0.001',unit:'currency'}}}),e=>e.status===400);
});
