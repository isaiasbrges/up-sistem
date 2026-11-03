'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID,randomBytes,createHmac}=require('node:crypto');
const {startTestDatabase}=require('./helpers/postgres');
const {createHttpApp}=require('../server/http/app');
const {createBilling}=require('../server/modules/billing/service');
test('administração: permissões, liberações, correção de e-mail e configuração por HTTP',async t=>{
  const {db,owner}=await startTestDatabase(t),sent=new Map(),secret='admin-webhook-test-'.repeat(3);
  const billing=createBilling({db,secret,encryptionKey:randomBytes(32).toString('base64')});
  const app=createHttpApp({db,billing,sendCode:async(email,code)=>sent.set(email,code),authSecret:'admin-auth-test-'.repeat(4)});
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
  const base='http://127.0.0.1:'+server.address().port;
  async function request(url,cookie,body,method,headers={}){
    const r=await fetch(base+'/api/v1'+url,{method:method||(body?'POST':'GET'),headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});
    return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
  }
  const users={},cookies={};
  for(const [role,products]of [['admin',[]],['suporte',[]],['aluno',['front','kit']]]){
    const email=role+'@admin-test.example';users[role]=await app.locals.identity.provision({email,role,products});
    await request('/auth/request-code',null,{email});cookies[role]=(await request('/auth/verify-code',null,{email,code:sent.get(email)})).cookie;
  }
  await t.test('aluno não administra; suporte só consulta alunos e acessos',async()=>{
    assert.equal((await request('/admin/students')).status,401);
    for(const url of ['/admin/students','/admin/overview','/admin/products','/admin/events','/admin/settings'])assert.equal((await request(url,cookies.aluno)).status,403,url);
    assert.equal((await request('/admin/students',cookies.suporte)).status,200);
    for(const url of ['/admin/overview','/admin/products','/admin/events','/admin/settings'])assert.equal((await request(url,cookies.suporte)).status,403,url);
    assert.equal((await request('/admin/overview',cookies.admin)).status,200);
  });
  let access;
  const key=randomUUID(),grant={email:'novo@admin-test.example',name:'Novo aluno',product:'essencial',duration:{kind:'days',days:30},reason:'Solicitado pelo atendimento'};
  await t.test('liberação explícita é idempotente, auditada e agenda só um aviso',async()=>{
    const headers={'Idempotency-Key':key};
    const a=await request('/admin/accesses',cookies.suporte,grant,'POST',headers);assert.equal(a.status,201);access=a.data;
    const b=await request('/admin/accesses',cookies.suporte,grant,'POST',headers);assert.equal(b.data.id,access.id);
    const changed=await request('/admin/accesses',cookies.suporte,{...grant,product:'kit'},'POST',headers);assert.equal(changed.status,409);
    const {rows:[row]}=await owner.query("SELECT (SELECT count(*) FROM up_private.audit_events WHERE target_id=$1 AND action='access.grant')::integer AS audits,(SELECT count(*) FROM up_private.jobs WHERE job_key=$2)::integer AS emails",[access.id,'manual:'+users.suporte.id+':'+key]);
    assert.deepEqual(row,{audits:1,emails:1});assert.ok(access.expires_at);
    assert.equal((await request('/admin/accesses',cookies.admin,{...grant,duration:undefined},'POST',{'Idempotency-Key':randomUUID()})).status,400);
  });
  await t.test('chaves iguais de operadores distintos não colidem; revogar não remove outra compra',async()=>{
    const other=await request('/admin/accesses',cookies.admin,grant,'POST',{'Idempotency-Key':key});assert.equal(other.status,201);assert.notEqual(other.data.id,access.id);
    assert.equal((await request('/admin/accesses/'+access.id+'/revoke',cookies.suporte,{reason:'Cancelamento solicitado'})).status,200);
    const {rows}=await owner.query('SELECT id,status FROM up.entitlements WHERE id=ANY($1::uuid[])',[ [access.id,other.data.id] ]);
    assert.equal(rows.find(r=>r.id===access.id).status,'revoked');assert.equal(rows.find(r=>r.id===other.data.id).status,'active');
    assert.equal((await request('/admin/accesses',cookies.suporte,{...grant,email:users.admin.email},'POST',{'Idempotency-Key':randomUUID()})).status,409);
    assert.equal((await request('/admin/accesses',cookies.aluno,grant,'POST',{'Idempotency-Key':randomUUID()})).status,403);
  });
  await t.test('equipe não consulta respostas ou valores financeiros dos alunos',async()=>{
    await owner.query("INSERT INTO up.kit_transactions(user_id,date,description,value,type,category,scope) VALUES($1,current_date,'Segredo financeiro',987654.32,'entrada','vendas','empresa')",[users.aluno.id]);
    for(const role of ['admin','suporte']){
      assert.equal((await request('/kit/transactions',cookies[role])).status,403);
      assert.equal((await request('/diagnostics',cookies[role])).status,403);
      const list=await request('/admin/students?search=aluno%40admin-test',cookies[role]);assert.equal(list.status,200);assert.equal(list.data.items.length,1);
      assert.doesNotMatch(JSON.stringify(list.data),/987654|Segredo financeiro|code_hash|token_hash|payload_cipher/);
    }
    await assert.rejects(db.internal(c=>c.query('SELECT * FROM up.kit_transactions')),{code:'42501'});
  });
  await t.test('corrigir e-mail mantém usuário e registros, invalida sessões e não mescla contas',async()=>{
    const student=users.aluno,corrected='corrigido@admin-test.example';
    assert.equal((await request('/admin/students/'+student.id+'/email',cookies.suporte,{email:users.admin.email,reason:'Corrigir cadastro'} ,'PATCH')).status,409);
    assert.equal((await request('/admin/students/'+student.id+'/email',cookies.suporte,{email:corrected,reason:'Correção pedida pelo aluno'},'PATCH')).status,200);
    assert.equal((await request('/me',cookies.aluno)).status,401);
    const {rows:[row]}=await owner.query('SELECT u.id,u.email,(SELECT count(*)::integer FROM up.kit_transactions WHERE user_id=u.id) AS records FROM up.users u WHERE id=$1',[student.id]);
    assert.deepEqual(row,{id:student.id,email:corrected,records:1});
    await request('/auth/request-code',null,{email:corrected});const login=await request('/auth/verify-code',null,{email:corrected,code:sent.get(corrected)});assert.equal(login.status,200);cookies.aluno=login.cookie;
    assert.equal((await request('/admin/students/'+users.admin.id+'/email',cookies.suporte,{email:'troca@example.com',reason:'Tentativa indevida'},'PATCH')).status,404);
  });
  const settings={kitPurchaseUrl:'https://checkout.example.com/kit',supportUrl:'https://suporte.example.com',supportEmail:'suporte@example.com',kiwifyFields:{email:'Customer.email',name:'Customer.full_name',productId:'Product.product_id'},access:{front:{kind:'days',days:365},essencial:{kind:'days',days:180},kit:{kind:'lifetime'}},reason:'Configuração fictícia do teste'};
  await t.test('configuração e mapa de produtos são exclusivos do admin e não publicam segredos',async()=>{
    assert.equal((await request('/admin/settings',cookies.suporte,settings,'PUT')).status,403);
    assert.equal((await request('/admin/settings',cookies.admin,{...settings,supportUrl:'https://login:secret@example.com'},'PUT')).status,400);
    assert.equal((await request('/admin/settings',cookies.admin,settings,'PUT')).status,200);
    assert.equal((await request('/admin/products',cookies.admin,{externalId:'produto-ficticio',product:'front',reason:'Mapa usado em teste'},'PUT')).status,200);
    const config=await request('/admin/settings',cookies.admin);assert.deepEqual(config.data['access.duration.kit'],{kind:'lifetime'});
    await owner.query("INSERT INTO up_private.settings(key,value) VALUES('smtp.password','\"nao-deve-vazar\"')");
    assert.doesNotMatch(JSON.stringify((await request('/admin/settings',cookies.admin)).data),/nao-deve-vazar|smtp.password/);
    const publicInfo=await request('/platform',cookies.aluno);assert.deepEqual(publicInfo.data,{kitPurchaseUrl:settings.kitPurchaseUrl,supportUrl:settings.supportUrl,supportEmail:settings.supportEmail});
    assert.deepEqual((await request('/platform')).data,publicInfo.data);
    await owner.query("UPDATE up_private.settings SET value='\"javascript:alert(1)\"' WHERE key='support.url'");
    assert.equal((await request('/platform')).data.supportUrl,'');
    await owner.query("UPDATE up_private.settings SET value=$1 WHERE key='support.url'",[JSON.stringify(settings.supportUrl)]);
  });
  await t.test('admin revê e reprocessa evento sem receber payload; suporte e aluno não podem',async()=>{
    const raw=Buffer.from(JSON.stringify({order_id:'admin-order',webhook_event_type:'order_approved',order_status:'paid',Customer:{email:'compra@admin-test.example'},Product:{product_id:'desconhecido'}}));
    const event=await billing.receive(raw,createHmac('sha1',secret).update(raw).digest('hex'));await billing.processEvent(event.eventId);
    const list=await request('/admin/events',cookies.admin);assert.equal(list.status,200);assert.equal(list.data.items[0].status,'review');assert.doesNotMatch(JSON.stringify(list.data),/compra@|payload|Customer/);
    assert.equal((await request('/admin/events/'+event.eventId+'/reprocess',cookies.suporte,{reason:'Tentativa do suporte'})).status,403);
    assert.equal((await request('/admin/events/'+event.eventId+'/reprocess',cookies.admin,{reason:'Rever mapeamento'})).status,200);
    assert.equal((await request('/admin/events?offset=1000001',cookies.admin)).status,400);
  });
});
