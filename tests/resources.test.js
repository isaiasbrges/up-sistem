'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {startTestDatabase}=require('./helpers/postgres');
const {createIdentity}=require('../server/modules/identity/service');
const {createResources}=require('../server/modules/resources/repository');
const {RODA,RADAR}=require('../server/shared/schemas');
const diagnostic=()=>({roda:Object.fromEntries(RODA.map(k=>[k,{score:6}])),radar:Object.fromEntries(RADAR.map((k,i)=>[k,{score:7-i}])),gargalo:'Finanças'});
test('recursos persistentes: validação, histórico, idempotência e concorrência',async t=>{
  const {db}=await startTestDatabase(t);
  const identity=createIdentity({db,authSecret:'secret-only-in-tests-not-production-'.repeat(2),sendCode:async()=>{}});
  const a=await identity.provision({email:'recurso-a@example.com',products:['front','kit']});
  const b=await identity.provision({email:'recurso-b@example.com',products:['front','kit']});
  const resources=createResources({db});
  const tx={date:'2026-10-28',desc:'Venda teste',value:'0.10',type:'entrada',category:'vendas',scope:'empresa'};
  let saved;
  await t.test('criar com a mesma identidade de operação não duplica e não aceita outros dados',async()=>{
    const key=randomUUID();saved=await resources.create(a.id,'transactions',tx,key);
    assert.deepEqual(await resources.create(a.id,'transactions',tx,key),saved);
    await assert.rejects(resources.create(a.id,'transactions',{...tx,value:'0.20'},key),e=>e.status===409);
    assert.equal((await resources.list(a.id,'transactions')).items.length,1);
    assert.equal(saved.value,'0.10');assert.ok(saved.id);
    await assert.rejects(resources.create(a.id,'transactions',{...tx,user_id:b.id},randomUUID()),e=>e.status===400);
  });
  await t.test('edições concorrentes não se sobrescrevem',async()=>{
    const results=await Promise.allSettled([
      resources.update(a.id,'transactions',saved.id,{desc:'Atualização A'},1),
      resources.update(a.id,'transactions',saved.id,{desc:'Atualização B'},1)
    ]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.code==='VERSION_CONFLICT').length,1);
    const updated=await resources.get(a.id,'transactions',saved.id);assert.equal(updated.value,'0.10');assert.equal(updated.version,2);
    await assert.rejects(resources.get(b.id,'transactions',saved.id),e=>e.status===404);
    await assert.rejects(resources.remove(b.id,'transactions',saved.id,2),e=>e.status===404);
  });
  await t.test('paginação e exclusão afetam só o registro escolhido',async()=>{
    await resources.create(a.id,'transactions',{...tx,desc:'Outra venda'},randomUUID());
    const page=await resources.list(a.id,'transactions',{limit:1});assert.equal(page.items.length,1);assert.ok(page.nextCursor);
    const next=await resources.list(a.id,'transactions',{limit:1,cursor:page.nextCursor});assert.equal(next.items.length,1);assert.notEqual(next.items[0].id,page.items[0].id);assert.equal(next.nextCursor,null);
    await resources.remove(a.id,'transactions',saved.id,2);
    assert.equal((await resources.list(a.id,'transactions')).items.length,1);
    await assert.rejects(resources.get(a.id,'transactions',saved.id),e=>e.status===404);
  });
  await t.test('diagnóstico calcula no servidor e preserva inicial e refeitos',async()=>{
    const initial=await resources.create(a.id,'diagnostics',{input:diagnostic()},randomUUID());
    const repeated=await resources.create(a.id,'diagnostics',{input:diagnostic()},randomUUID());
    assert.equal(initial.kind,'initial');assert.equal(repeated.kind,'repeated');assert.equal(initial.result.mediaRadar,5.5);
    await assert.rejects(resources.update(a.id,'diagnostics',initial.id,{input:diagnostic()},1),e=>e.status===405);
    await assert.rejects(resources.create(a.id,'diagnostics',{input:diagnostic(),result:{mediaRadar:10}},randomUUID()),e=>e.status===400);
    const wrong=diagnostic();wrong.gargalo='Vendas';await assert.rejects(resources.create(a.id,'diagnostics',{input:wrong},randomUUID()),e=>e.status===400);
  });
  await t.test('Raio-X usa centavos exatos, mês único e revisão preservada',async()=>{
    const report=await resources.create(a.id,'finances',{month:'2026-10',input:{revenue:'0.30',sales:3,variable:{fees:{value:'0.10'},tax:{value:'0.20'}}}},randomUUID());
    assert.equal(report.result.afterDebt,'0.00');assert.equal(report.result.cv,'0.30');
    await assert.rejects(resources.create(a.id,'finances',{month:'2026-10',input:{revenue:'1.00'}},randomUUID()),e=>e.status===409);
    const next=await resources.update(a.id,'finances',report.id,{input:{...report.input,revenue:'1.00'}},1);
    assert.equal(next.version,2);assert.equal(next.result.afterDebt,'0.70');
    const {rows}=await db.asUser(a.id,c=>c.query('SELECT * FROM up.finance_snapshot_revisions WHERE snapshot_id=$1',[report.id]));
    assert.equal(rows.length,1);assert.equal(rows[0].result.afterDebt,'0.00');
    await assert.rejects(resources.get(b.id,'finances',report.id),e=>e.status===404);
  });
  await t.test('conta paga preserva o estado ao alterar somente a descrição',async()=>{
    const bill=await resources.create(a.id,'bills',{desc:'Conta',due:'2026-10-30',value:'123.45',paid:true},randomUUID());
    const updated=await resources.update(a.id,'bills',bill.id,{desc:'Conta revisada'},1);
    assert.equal(updated.paid,true);assert.equal(updated.value,'123.45');assert.equal(updated.version,2);
  });
  await t.test('plano, check-in, oferta e procedimento pertencem ao aluno',async()=>{
    const plan=await resources.create(a.id,'plans',{result:'Organizar o negócio'},randomUUID());
    const checkin=await resources.create(a.id,'checkins',{planId:plan.id,answers:['Avancei','','','','']},randomUUID());assert.equal(checkin.planId,plan.id);
    await assert.rejects(resources.create(b.id,'checkins',{planId:plan.id,answers:['Tentativa','','','','']},randomUUID()),e=>e.status===400);
    const offer=await resources.create(a.id,'offers',{name:'Consultoria',audience:'Empresas',promise:'Clareza'},randomUUID());
    const edited=await resources.update(a.id,'offers',offer.id,{name:'Consultoria revisada'},1);assert.equal(edited.audience,'Empresas');assert.equal(edited.promise,'Clareza');
    const procedure=await resources.create(a.id,'procedures',{task:'Conferir caixa',owner:'João',steps:'Conferir extrato\nRegistrar saldo'},randomUUID());
    assert.equal((await resources.get(a.id,'procedures',procedure.id)).steps,'Conferir extrato\nRegistrar saldo');
    await assert.rejects(resources.get(b.id,'procedures',procedure.id),e=>e.status===404);
  });
});
