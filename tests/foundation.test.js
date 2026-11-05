'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {startTestDatabase}=require('./helpers/postgres');
const {createDatabase}=require('../server/db/connection');
const {createIdentity,SESSION_TTL}=require('../server/modules/identity/service');

test('PostgreSQL real: isolamento, acesso por produto e login persistente',async t=>{
  const {db,owner,urls,ownerUrl}=await startTestDatabase(t);
  let clock=Date.now(); const sent=new Map();
  const options={db,authSecret:'test-secret-only-for-automated-tests-'.repeat(2),sendCode:async(email,code)=>sent.set(email,code),now:()=>clock};
  const identity=createIdentity(options);
  const a=await identity.provision({email:'aluno-a@example.com',products:['front','kit']});
  const b=await identity.provision({email:'aluno-b@example.com',products:['front']});
  const noAccess=await identity.provision({email:'sem-acesso@example.com'});
  const rowId=randomUUID();

  await t.test('isolamento no banco protege mesmo sem WHERE e recusa troca de dono',async()=>{
    await db.asUser(a.id,client=>client.query('INSERT INTO up.kit_transactions(id,user_id,date,description,value,type,category,scope) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[rowId,a.id,'2026-10-28','Venda A','10.10','entrada','vendas','empresa']));
    assert.equal((await db.asUser(a.id,c=>c.query('SELECT * FROM up.kit_transactions'))).rowCount,1);
    assert.equal((await db.asUser(b.id,c=>c.query('SELECT * FROM up.kit_transactions'))).rowCount,0);
    assert.equal((await db.appPool.query('SELECT * FROM up.kit_transactions')).rowCount,0);
    await assert.rejects(db.asUser(b.id,c=>c.query('INSERT INTO up.kit_transactions(user_id,date,description,value,type,category,scope) VALUES($1,$2,$3,$4,$5,$6,$7)',[a.id,'2026-10-28','Inválido','1.00','entrada','vendas','empresa'])),e=>e.code==='42501');
    await assert.rejects(db.asUser(a.id,c=>c.query('UPDATE up.kit_transactions SET user_id=$1 WHERE id=$2',[b.id,rowId])),e=>e.code==='42501');
    await assert.rejects(db.asUser(a.id,c=>c.query("INSERT INTO up.entitlements(user_id,product_code,status,origin,source_ref) VALUES($1,'kit','active','manual','forged')",[a.id])),e=>e.code==='42501');
    await assert.rejects(db.internal(c=>c.query('SELECT * FROM up.kit_transactions')),e=>e.code==='42501');
  });

  await t.test('chaves compostas impedem check-in ligado ao plano de outro aluno',async()=>{
    const {rows:[plan]}=await db.asUser(a.id,c=>c.query("INSERT INTO up.plans_90(user_id,data) VALUES($1,'{}') RETURNING id",[a.id]));
    await identity.provision({email:b.email,products:['kit']});
    await assert.rejects(db.asUser(b.id,c=>c.query('INSERT INTO up.weekly_checkins(user_id,plan_id,answers) VALUES($1,$2,$3)',[b.id,plan.id,JSON.stringify(['a','b','c','d','e'])])),e=>e.code==='23503');
  });

  await t.test('contas manuais ativas recebem código sem compra e a resposta continua genérica',async()=>{
    const unknown=await identity.requestCode('desconhecido@example.com','127.0.0.1');
    const inactive=await identity.requestCode(noAccess.email,'127.0.0.1');
    const known=await identity.requestCode(a.email,'127.0.0.1');
    assert.deepEqual(unknown,known); assert.deepEqual(inactive,known);
      assert.equal(sent.has('desconhecido@example.com'),false); assert.equal(sent.has(noAccess.email),true);
    const {rows:[row]}=await owner.query('SELECT * FROM up_private.login_codes WHERE user_id=$1',[a.id]);
    assert.equal(row.code_hash.length,32);assert.notEqual(row.code_hash.toString(),sent.get(a.email));
  });

  let token;
  await t.test('código concorrente é consumido uma vez e sessão dura 30 dias',async()=>{
    const code=sent.get(a.email);
    const results=await Promise.allSettled([identity.verifyCode(a.email,code,'127.0.0.1'),identity.verifyCode(a.email,code,'127.0.0.1')]);
    assert.equal(results.filter(x=>x.status==='fulfilled').length,1);
    assert.equal(results.filter(x=>x.status==='rejected'&&x.reason.status===401).length,1);
    token=results.find(x=>x.status==='fulfilled').value.token;
    const {rows:[session]}=await owner.query('SELECT created_at,expires_at FROM up_private.sessions WHERE user_id=$1',[a.id]);
    assert.equal(session.expires_at-session.created_at,SESSION_TTL);
  });

  await t.test('nova instância da aplicação recupera sessão e logout a revoga',async()=>{
    const reopened=await createDatabase({...urls,max:1});
    try {
      const restarted=createIdentity({...options,db:reopened});
      assert.equal((await restarted.authenticate(token)).user.id,a.id);
      clock+=29*86400000;
      assert.equal((await restarted.authenticate(token)).user.id,a.id);
      await restarted.logout(token);
      await assert.rejects(identity.authenticate(token),e=>e.status===401);
    } finally {await reopened.close();}
    clock=Date.now();
  });

  await t.test('60 segundos de reenvio e três códigos por 15 minutos persistem',async()=>{
    await assert.rejects(identity.requestCode(a.email,'127.0.0.1'),e=>e.status===429);
    clock+=60001;await identity.requestCode(a.email,'127.0.0.1');
    clock+=60001;await identity.requestCode(a.email,'127.0.0.1');
    clock+=60001;await assert.rejects(identity.requestCode(a.email,'127.0.0.1'),e=>e.status===429);
    clock+=900001;await identity.requestCode(a.email,'127.0.0.1');
  });

  await t.test('expiração e cinco erros sobrevivem à recriação do serviço',async()=>{
    let next=createIdentity(options);
    clock+=CODE_WAIT;await next.requestCode(b.email,'127.0.0.1');
    const code=sent.get(b.email);
    for(let i=0;i<5;i++)await assert.rejects(next.verifyCode(b.email,'errado','127.0.0.1'),e=>e.status===401);
    next=createIdentity(options);await assert.rejects(next.verifyCode(b.email,code,'127.0.0.1'),e=>e.status===401);
    clock+=CODE_WAIT;await next.requestCode(b.email,'127.0.0.1');
    clock+=600001;await assert.rejects(next.verifyCode(b.email,sent.get(b.email),'127.0.0.1'),e=>e.status===401);
  });

  await t.test('revogação vale imediatamente no SQL; outra compra válida preserva o produto',async()=>{
    await owner.query("UPDATE up.entitlements SET status='refunded' WHERE user_id=$1 AND product_code='kit'",[a.id]);
    assert.equal((await db.asUser(a.id,c=>c.query('SELECT * FROM up.kit_transactions'))).rowCount,0);
    await owner.query("INSERT INTO up.entitlements(user_id,product_code,status,origin,source_ref) VALUES($1,'kit','active','kiwify','other-valid-order')",[a.id]);
    assert.equal((await db.asUser(a.id,c=>c.query('SELECT * FROM up.kit_transactions'))).rowCount,1);
    await owner.query("UPDATE up.users SET status='deleted' WHERE id=$1",[a.id]);
    assert.equal((await db.asUser(a.id,c=>c.query('SELECT * FROM up.kit_transactions'))).rowCount,0);
  });

  await t.test('API não aceita uma credencial de superusuário',async()=>{
    await assert.rejects(createDatabase({appUrl:ownerUrl,internalUrl:urls.internalUrl}),/permissões incompatíveis/);
  });
});
const CODE_WAIT=60001;
