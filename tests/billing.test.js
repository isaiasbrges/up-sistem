'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const {startTestDatabase}=require('./helpers/postgres');
const {createBilling}=require('../server/modules/billing/service');
const {createWorker}=require('../server/jobs/worker');
const {createIdentity}=require('../server/modules/identity/service');
const {createHttpApp}=require('../server/http/app');
const {accessExpiresAt}=require('../server/shared/access-duration');

test('Kiwify: assinatura, recebimento durável, concessão e revogação por origem',async t=>{
  const {db,owner}=await startTestDatabase(t);let clock=Date.now();
  const secret='only-test-kiwify-secret-'.repeat(3),key=crypto.randomBytes(32),emails=[];
  const billing=createBilling({db,secret,encryptionKey:key,now:()=>clock});
  const worker=createWorker({db,now:()=>clock,handlers:{kiwify:p=>billing.processEvent(p.eventId),email:async p=>emails.push(p)}});
  const identity=createIdentity({db,authSecret:'only-test-auth-secret-'.repeat(3),sendCode:async()=>{},now:()=>clock});
  const admin=await identity.provision({email:'admin-billing@example.com',role:'admin'});
  async function setting(name,value){await owner.query('INSERT INTO up_private.settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value',[name,JSON.stringify(value)]);}
  await t.test('migração configura 12 meses de calendário para Front, Essencial e Kit',async()=>{
    const {rows}=await owner.query("SELECT key,value FROM up_private.settings WHERE key=ANY($1::text[]) ORDER BY key",[['access.duration.front','access.duration.essencial','access.duration.kit']]);
    assert.equal(rows.length,3);for(const row of rows)assert.deepEqual(row.value,{kind:'months',months:12});
  });
  await setting('kiwify.fields',{email:'Customer.email',name:'Customer.full_name',productId:'Product.product_id'});
  for(const product of ['front','essencial','kit']){
    await owner.query('INSERT INTO up_private.kiwify_product_map(kiwify_product_id,product_code) VALUES($1,$2)',['test-product-'+product,product]);
    await setting('access.duration.'+product,{kind:'lifetime'});
  }
  const payload=(order,type,product='front',email='comprador@example.com')=>({order_id:order,webhook_event_type:type,
    order_status:({order_approved:'paid',order_refunded:'refunded',chargeback:'chargedback'})[type]||'waiting_payment',
    Customer:{email,full_name:'João da Silva'},Product:{product_id:'test-product-'+product}});
  async function deliver(body){const raw=Buffer.from('  '+JSON.stringify(body)+'\n');return billing.receive(raw,crypto.createHmac('sha1',secret).update(raw).digest('hex'));}
  const app=createHttpApp({db,billing,sendCode:async()=>{},authSecret:'http-test-secret-'.repeat(3)}),server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  t.after(()=>new Promise(r=>server.close(r)));const base='http://127.0.0.1:'+server.address().port;

  await t.test('assinatura errada recebe 401 e não cria evento; corpo bruto Unicode é validado',async()=>{
    const raw=Buffer.from('  '+JSON.stringify(payload('signed-order','order_approved'))+'\n');
    const bad=await fetch(base+'/webhooks/kiwify?signature='+'0'.repeat(40),{method:'POST',headers:{'Content-Type':'application/json'},body:raw});assert.equal(bad.status,401);await bad.json();
    assert.equal((await owner.query('SELECT count(*)::integer AS n FROM up_private.webhook_events')).rows[0].n,0);
    const signature=crypto.createHmac('sha1',secret).update(raw).digest('hex');
    const valid=await fetch(base+'/webhooks/kiwify?signature='+signature,{method:'POST',headers:{'Content-Type':'application/json'},body:raw});assert.equal(valid.status,200);assert.deepEqual(await valid.json(),{ok:true});
    const {rows:[event]}=await owner.query('SELECT * FROM up_private.webhook_events WHERE order_id=$1',['signed-order']);
    assert.equal(event.status,'pending');assert.equal(event.payload_encrypted.includes('comprador@example.com'),false);assert.equal(event.payload_encrypted.includes('João'),false);
    assert.equal((await owner.query('SELECT count(*)::integer AS n FROM up.users WHERE email=$1',['comprador@example.com'])).rows[0].n,0);
    await assert.rejects(db.appPool.query('SELECT * FROM up_private.webhook_events'),e=>e.code==='42501');
  });

  let userId;
  await t.test('processamento cria aluno e produto; duplicata registra entrega sem duplicar concessão',async()=>{
    await worker.runOnce();
    const duplicate=await deliver(payload('signed-order','order_approved'));assert.equal(duplicate.duplicate,true);
    await worker.runOnce();
    const {rows:[user]}=await owner.query('SELECT id FROM up.users WHERE email=$1',['comprador@example.com']);userId=user.id;
    const {rows:grants}=await owner.query('SELECT * FROM up.entitlements WHERE user_id=$1',[userId]);assert.equal(grants.length,1);assert.equal(grants[0].status,'active');
    assert.equal((await owner.query('SELECT count(*)::integer AS n FROM up_private.webhook_deliveries WHERE event_id=$1',[duplicate.eventId])).rows[0].n,2);
    assert.equal(emails.length,1);assert.equal(emails[0].template,'welcome');
  });

  await t.test('Pix, boleto e rejeição não concedem acesso',async()=>{
    for(const [i,type]of ['pix_created','billet_created','order_rejected'].entries())await deliver(payload('pending-order-'+i,type,'kit','nao-pago@example.com'));
    await worker.runOnce(20);
    assert.equal((await owner.query('SELECT count(*)::integer AS n FROM up.users WHERE email=$1',['nao-pago@example.com'])).rows[0].n,0);
  });

  await t.test('reembolso do Kit preserva Front e outra compra válida do Kit',async()=>{
    await deliver(payload('kit-first','order_approved','kit'));await deliver(payload('kit-second','order_approved','kit'));await worker.runOnce(20);
    await deliver(payload('kit-first','order_refunded','kit'));await worker.runOnce(20);
    const {rows}=await owner.query('SELECT product_code,status,order_id FROM up.entitlements WHERE user_id=$1',[userId]);
    assert.equal(rows.find(x=>x.order_id==='signed-order').status,'active');
    assert.equal(rows.find(x=>x.order_id==='kit-first').status,'refunded');
    assert.equal(rows.find(x=>x.order_id==='kit-second').status,'active');
    const {rows:[allowed]}=await db.asUser(userId,c=>c.query("SELECT up_private.has_product('kit') AS kit,up_private.has_product('front') AS front"));assert.equal(allowed.kit,true);assert.equal(allowed.front,true);
    await deliver(payload('kit-second','chargeback','kit'));await worker.runOnce(20);
    assert.equal((await db.asUser(userId,c=>c.query("SELECT up_private.has_product('kit') AS kit"))).rows[0].kit,false);
    assert.equal((await db.asUser(userId,c=>c.query("SELECT up_private.has_product('front') AS front"))).rows[0].front,true);
  });

  await t.test('reembolso anterior à aprovação bloqueia a ativação tardia do mesmo pedido',async()=>{
    const refunded=await deliver(payload('out-of-order','order_refunded','front','fora-ordem@example.com'));await billing.processEvent(refunded.eventId);
    const approved=await deliver(payload('out-of-order','order_approved','front','fora-ordem@example.com'));const result=await billing.processEvent(approved.eventId);
    assert.equal(result.status,'refunded');
    assert.equal((await owner.query('SELECT count(*)::integer AS n FROM up.users WHERE email=$1',['fora-ordem@example.com'])).rows[0].n,0);
  });

  await t.test('produto desconhecido e prazo não definido ficam em revisão sem liberar',async()=>{
    const unknown=await deliver(payload('unknown-product','order_approved','unknown'));assert.equal((await billing.processEvent(unknown.eventId)).review,'PRODUCT_UNKNOWN');
    await owner.query("DELETE FROM up_private.settings WHERE key='access.duration.essencial'");
    const pending=await deliver(payload('duration-pending','order_approved','essencial','prazo@example.com'));assert.equal((await billing.processEvent(pending.eventId)).review,'ACCESS_DURATION_UNSET');
    assert.equal((await owner.query('SELECT count(*)::integer AS n FROM up.users WHERE email=$1',['prazo@example.com'])).rows[0].n,0);
    await setting('access.duration.essencial',{kind:'days',days:30});
    await billing.reprocess(pending.eventId,admin.id,'Prazo de acesso configurado para o produto.');await worker.runOnce(20);
    const {rows:[grant]}=await owner.query("SELECT e.* FROM up.entitlements e JOIN up.users u ON u.id=e.user_id WHERE u.email='prazo@example.com'");
    assert.equal(grant.expires_at-grant.activated_at,30*86400000);
    const previous=grant.expires_at.getTime();clock+=86400000;
    await billing.reprocess(pending.eventId,admin.id,'Conferência do processamento sem estender validade.');await worker.runOnce(20);
    assert.equal((await owner.query('SELECT expires_at FROM up.entitlements WHERE id=$1',[grant.id])).rows[0].expires_at.getTime(),previous);
  });

  await t.test('compra aprovada aplica 12 meses, e reprocessamento preserva a data original',async()=>{
    await setting('access.duration.front',{kind:'months',months:12});
    const approved=await deliver(payload('annual-order','order_approved','front','anual@example.com'));
    await billing.processEvent(approved.eventId);
    const {rows:[grant]}=await owner.query("SELECT e.* FROM up.entitlements e JOIN up.users u ON u.id=e.user_id WHERE u.email='anual@example.com'");
    assert.equal(grant.expires_at.toISOString(),accessExpiresAt({kind:'months',months:12},grant.activated_at).toISOString());
    clock+=86400000;await billing.reprocess(approved.eventId,admin.id,'Conferir prazo sem renovar a compra.');await billing.processEvent(approved.eventId);
    assert.equal((await owner.query('SELECT expires_at FROM up.entitlements WHERE id=$1',[grant.id])).rows[0].expires_at.toISOString(),grant.expires_at.toISOString());
  });

  await t.test('token anterior funciona durante a janela e expira sem impedir o token novo',async()=>{
    const old='previous-test-secret-'.repeat(3),until=new Date(clock+86400000);
    const rotating=createBilling({db,secret,previousSecret:old,previousValidUntil:until,encryptionKey:key,now:()=>clock});
    const raw=Buffer.from(JSON.stringify(payload('rotation','pix_created')));
    const oldSignature=crypto.createHmac('sha1',old).update(raw).digest('hex');
    await rotating.receive(raw,oldSignature);clock+=86400001;
    await assert.rejects(rotating.receive(raw,oldSignature),e=>e.status===401);
    await rotating.receive(raw,crypto.createHmac('sha1',secret).update(raw).digest('hex'));
  });
});

test('tarefas: falhas retomáveis e dois processadores não executam a mesma posse',async t=>{
  const {db,owner}=await startTestDatabase(t);let clock=Date.now(),calls=0;
  await owner.query("INSERT INTO up_private.jobs(job_key,kind,payload,available_at) VALUES('worker-concurrency','example','{}',$1)",[new Date(clock)]);
  const handler=async()=>{calls++;await new Promise(r=>setTimeout(r,30));};
  const a=createWorker({db,now:()=>clock,handlers:{example:handler}}),b=createWorker({db,now:()=>clock,handlers:{example:handler}});
  await Promise.all([a.runOnce(),b.runOnce()]);assert.equal(calls,1);
  await owner.query("INSERT INTO up_private.jobs(job_key,kind,payload,available_at) VALUES('worker-retry','failing','{}',$1)",[new Date(clock)]);
  const retry=createWorker({db,now:()=>clock,maxAttempts:2,handlers:{failing:async()=>{throw Object.assign(Error('private detail must not be saved'),{code:'MAIL_DELIVERY_FAILED'});}}});
  await retry.runOnce();let row=(await owner.query("SELECT * FROM up_private.jobs WHERE job_key='worker-retry'")).rows[0];assert.equal(row.status,'pending');assert.equal(row.error_code,'MAIL_DELIVERY_FAILED');
  clock+=3000;await retry.runOnce();row=(await owner.query("SELECT * FROM up_private.jobs WHERE job_key='worker-retry'")).rows[0];assert.equal(row.status,'failed');assert.equal(row.attempts,2);
});
