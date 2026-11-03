'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {randomUUID,createHash}=require('node:crypto');
const {startTestDatabase}=require('./helpers/postgres');
const {createHttpApp}=require('../server/http/app');
const S=require('../server/shared/schemas');
test('documentos versionados e direitos do titular por HTTP, com PostgreSQL real',async t=>{
  const {db,owner}=await startTestDatabase(t),sent=new Map();let clock=Date.now();
  const app=createHttpApp({db,secure:true,now:()=>clock,authSecret:'privacy-test-secret-'.repeat(3),sendCode:async(e,c)=>sent.set(e,c)});
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
  const base='http://127.0.0.1:'+server.address().port,accounts={},cookies={};
  async function req(path,role,body,method='GET',headers={}){
    const r=await fetch(base+'/api/v1'+path,{method:body&&method==='GET'?'POST':method,headers:{...(role?{Cookie:cookies[role]}:{}),...(body?{'Content-Type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});
    return {status:r.status,data:await r.json(),headers:r.headers,cookie:r.headers.get('set-cookie')?.split(';')[0]};
  }
  for(const [key,role,products]of [['a','aluno',['front','kit']],['b','aluno',['front','kit']],['admin','admin',[]],['support','suporte',[]]]){
    const email='privacy-'+key+'@example.test';accounts[key]=await app.locals.identity.provision({email,role,products});
    await req('/auth/request-code',null,{email});cookies[key]=(await req('/auth/verify-code',null,{email,code:sent.get(email)})).cookie;
  }
  const headers=()=>({'Idempotency-Key':randomUUID()});
  const text='DOCUMENTO FICTÍCIO DE TESTE. Sem efeito contratual. <script>exemplo literal</script>';
  const acceptance=(v='v1')=>({termsVersion:v,privacyVersion:v,termsAccepted:true,privacyAccepted:true});
  await t.test('produção sem documentos aprovados não fica pronta nem libera ferramentas',async()=>{
    const health=await fetch(base+'/health/ready');assert.equal(health.status,503);await health.json();
    const me=await req('/me','a');assert.equal(me.data.legal.required,true);assert.equal(me.data.legal.available,false);
    assert.equal((await req('/kit/transactions','a')).data.code,'LEGAL_UNAVAILABLE');
    assert.equal((await req('/privacy/export','a')).status,200);
  });
  await t.test('somente admin salva versões imutáveis e publica o par revisado',async()=>{
    for(const kind of ['terms','privacy']){
      const body={kind,version:'v1',title:kind==='terms'?'Termos de teste':'Privacidade de teste',body:text,reason:'Conteúdo fictício de teste'},key=headers();
      assert.equal((await req('/admin/legal/documents','support',body,'POST',key)).status,403);
      assert.equal((await req('/admin/legal/documents','admin',body,'POST',key)).status,201);
      assert.equal((await req('/admin/legal/documents','admin',body,'POST',key)).status,201);
      assert.equal((await req('/admin/legal/documents','admin',{...body,body:'Texto alterado'},'POST',headers())).status,409);
    }
    await assert.rejects(db.internal(c=>c.query("UPDATE up_private.legal_documents SET body='alterado' WHERE kind='terms'")),{code:'42501'});
    const publication={termsVersion:'v1',privacyVersion:'v1',approved:true,expectedRevision:0,reason:'Aprovação fictícia de teste'},key=headers();
    assert.equal((await req('/admin/legal/publish','admin',{...publication,approved:false},'POST',headers())).status,400);
    assert.equal((await req('/admin/legal/publish','admin',publication,'POST',key)).status,200);
    assert.equal((await req('/admin/legal/publish','admin',publication,'POST',key)).status,200);
    assert.equal((await req('/admin/legal/publish','admin',publication,'POST',headers())).status,409);
    assert.equal((await owner.query('SELECT count(*)::integer AS n FROM up_private.legal_publication_history')).rows[0].n,1);
    assert.equal((await req('/admin/legal','support')).status,403);
    const health=await fetch(base+'/health/ready');assert.equal(health.status,200);await health.json();
  });
  await t.test('aceite exige as duas confirmações e as versões vigentes; recibo preserva hash e data',async()=>{
    assert.equal((await req('/kit/transactions','a')).data.code,'CONSENT_REQUIRED');
    assert.equal((await req('/legal/accept','a',{...acceptance(),privacyAccepted:false})).status,400);
    assert.equal((await req('/legal/accept','a',acceptance('antiga'))).status,409);
    for(const role of ['a','b'])assert.equal((await req('/legal/accept',role,acceptance(), 'POST',{'User-Agent':'UP-Test'})).status,200);
    clock+=1000;await req('/legal/accept','a',acceptance());
    const {rows}=await owner.query('SELECT * FROM up.consents WHERE user_id=$1',[accounts.a.id]);assert.equal(rows.length,1);
    assert.equal(rows[0].terms_digest,createHash('sha256').update(text).digest('hex'));assert.equal(rows[0].user_agent,'UP-Test');assert.equal(rows[0].ip,'127.0.0.1');
    await assert.rejects(db.asUser(accounts.a.id,c=>c.query("INSERT INTO up.consents(user_id,terms_version,privacy_version) VALUES($1,'inventado','inventado')",[accounts.a.id])),{code:'42501'});
    assert.equal((await req('/me','a')).data.legal.accepted,true);
  });
  await t.test('exportação inclui todos os recursos e mais de uma página, mantendo valores e titularidade',async()=>{
    await owner.query("INSERT INTO up.kit_transactions(user_id,date,description,value,type,category,scope,deleted_at) SELECT $1,current_date,'Registro '||n,0.10,'entrada','vendas','empresa',CASE WHEN n=75 THEN now() ELSE NULL END FROM generate_series(1,75) n",[accounts.a.id]);
    await owner.query("INSERT INTO up.kit_transactions(user_id,date,description,value,type,category,scope) VALUES($1,current_date,'SEGREDO-OUTRO-ALUNO',999.99,'entrada','vendas','empresa')",[accounts.b.id]);
    const finance=await req('/finance/snapshots','a',{month:'2026-10',input:{revenue:'100.05',sales:3}},'POST',headers());assert.equal(finance.status,201);
    assert.equal((await req('/finance/snapshots/'+finance.data.id,'a',{input:{revenue:'110.10',sales:3}},'PATCH',{'If-Match':'"1"'})).status,200);
    const diagnostic={roda:Object.fromEntries(S.RODA.map(k=>[k,{score:6}])),radar:Object.fromEntries(S.RADAR.map(k=>[k,{score:5}])),gargalo:'Vendas'};
    assert.equal((await req('/diagnostics','a',{input:diagnostic},'POST',headers())).status,201);
    assert.equal((await req('/kit/debts','a',{creditor:'Credor de teste',scope:'empresa',balance:'100.05',payment:'10.00',rate:'1.1'},'POST',headers())).status,201);
    assert.equal((await req('/kit/offers','a',{name:'Oferta de teste'},'POST',headers())).status,201);
    const plan=await req('/kit/plans','a',{result:'Organizar o caixa'},'POST',headers());assert.equal(plan.status,201);
    assert.equal((await req('/kit/checkins','a',{planId:plan.data.id,answers:['Revisei o caixa','','','','']},'POST',headers())).status,201);
    assert.equal((await req('/kit/procedures','a',{task:'Fechar caixa',owner:'Titular',steps:'Conferir extrato'},'POST',headers())).status,201);
    const page=await req('/kit/transactions?limit=1','a');assert.equal(page.data.items.length,1);assert.ok(page.data.nextCursor);
    const exported=await req('/privacy/export?userId='+accounts.b.id,'a');assert.equal(exported.status,200);assert.match(exported.headers.get('content-disposition'),/attachment/);
    const data=exported.data;assert.equal(data.identity.id,accounts.a.id);assert.equal(data.transactions.length,75);assert.equal(data.transactions[0].value,'0.10');
    for(const key of ['diagnostics','financialSnapshots','financialRevisions','debts','offers','plans','checkins','procedures','consents'])assert.equal(data[key].length,1,key);
    assert.equal(data.financialSnapshots[0].revenue,'110.10');assert.equal(data.debts[0].balance,'100.05');assert.ok(data.loginEvents.length>=2);
    assert.doesNotMatch(JSON.stringify(data),/SEGREDO-OUTRO-ALUNO|code_hash|token_hash|payload_encrypted|SMTP_PASSWORD/);
  });
  await t.test('exportar dados próprios continua possível com o produto vencido, sem abrir tabelas ao suporte',async()=>{
    await owner.query('UPDATE up.entitlements SET expires_at=$2 WHERE user_id=$1',[accounts.a.id,new Date(clock-1000)]);
    assert.equal((await req('/kit/transactions','a')).data.code,'PRODUCT_REQUIRED');
    assert.equal((await db.asUser(accounts.a.id,c=>c.query('SELECT count(*)::integer AS n FROM up.kit_transactions'))).rows[0].n,0);
    const exported=await req('/privacy/export','a');assert.equal(exported.status,200);assert.equal(exported.data.transactions.length,75);
    const {rows:[role]}=await owner.query("SELECT rolcanlogin,rolsuper,rolbypassrls FROM pg_roles WHERE rolname='up_exporter'");assert.deepEqual(role,{rolcanlogin:false,rolsuper:false,rolbypassrls:false});
    await assert.rejects(db.internal(c=>c.query('SELECT * FROM up.kit_transactions')),{code:'42501'});
    assert.equal((await req('/privacy/export','a')).status,429);
    const ownSupport=await req('/privacy/export?userId='+accounts.a.id,'support');assert.equal(ownSupport.data.identity.id,accounts.support.id);assert.equal(ownSupport.data.transactions.length,0);
  });
  await t.test('novo par publicado pede novo aceite e preserva o recibo anterior',async()=>{
    for(const kind of ['terms','privacy'])assert.equal((await req('/admin/legal/documents','admin',{kind,version:'v2',title:'Versão de teste 2',body:text,reason:'Nova versão fictícia'},'POST',headers())).status,201);
    assert.equal((await req('/admin/legal/publish','admin',{termsVersion:'v2',privacyVersion:'v2',approved:true,expectedRevision:1,reason:'Publicação fictícia nova'},'POST',headers())).status,200);
    assert.equal((await req('/me','a')).data.legal.accepted,false);assert.equal((await req('/kit/transactions','a')).data.code,'CONSENT_REQUIRED');
    assert.equal((await req('/legal/accept','a',acceptance('v2'))).status,200);
    assert.equal((await owner.query('SELECT count(*)::integer AS n FROM up.consents WHERE user_id=$1',[accounts.a.id])).rows[0].n,2);
  });
  await t.test('solicitação de exclusão é única, pode ser cancelada e tem atendimento restrito',async()=>{
    const body={confirmed:true,reason:'Solicitação fictícia do titular'};
    assert.equal((await req('/privacy/deletion-requests','a',{confirmed:false})).status,400);
    const results=await Promise.all([req('/privacy/deletion-requests','a',body),req('/privacy/deletion-requests','a',body)]);assert.equal(results[0].data.id,results[1].data.id);const id=results[0].data.id;
    assert.equal((await req('/privacy/deletion-requests/'+id+'/cancel','b',{})).status,404);
    assert.equal((await req('/privacy/deletion-requests/'+id+'/cancel','a',{})).status,200);
    const next=await req('/privacy/deletion-requests','a',body);assert.notEqual(next.data.id,id);
    assert.equal((await req('/admin/privacy','a')).status,403);
    const pending=await req('/admin/privacy','support');assert.equal(pending.status,200);assert.doesNotMatch(JSON.stringify(pending.data),/finance|transactions|100\.05|SEGREDO/);
    assert.equal((await req('/admin/privacy/'+next.data.id+'/start','support',{reason:'Atendimento fictício iniciado'})).status,200);
    assert.equal((await req('/privacy/deletion-requests/'+next.data.id+'/cancel','a',{})).status,409);
    assert.equal((await req('/privacy','a')).data.requests[0].status,'processing');
    assert.equal((await owner.query('SELECT count(*)::integer AS n FROM up.kit_transactions WHERE user_id=$1',[accounts.a.id])).rows[0].n,75);
  });
});
