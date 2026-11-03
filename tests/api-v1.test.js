'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {startTestDatabase}=require('./helpers/postgres');
const {createHttpApp}=require('../server/http/app');
const {seedLegal}=require('./helpers/legal');

test('API v1: login, dados reais, permissões e contratos HTTP',async t=>{
  const {db,owner}=await startTestDatabase(t),sent=new Map();const {actorId,...legalAcceptance}=await seedLegal(owner);
  let clock=Date.now();
  const options={db,authSecret:'only-test-secret-'.repeat(4),sendCode:async(email,code)=>sent.set(email,code),now:()=>clock,secure:true,appOrigin:'https://app.up.test',preview:false};
  const app=createHttpApp(options),server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  t.after(()=>new Promise(r=>server.close(r)));
  const base='http://127.0.0.1:'+server.address().port;
  async function request(url,{body,cookie,method,headers={}}={}) {
    const response=await fetch(base+url,{method:method||(body?'POST':'GET'),headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...headers},body:body?JSON.stringify(body):undefined});
    const type=response.headers.get('content-type')||'';
    return {status:response.status,data:type.includes('application/json')?await response.json():await response.text(),headers:response.headers,cookie:response.headers.get('set-cookie')?.split(';')[0]};
  }
  const a=await app.locals.identity.provision({email:'http-a@example.com',products:['front','kit']});
  await app.locals.identity.provision({email:'http-b@example.com',products:['front']});
  let cookieA,cookieB;
  await t.test('cookie dura 30 dias e é seguro; identidade e produtos vêm do banco',async()=>{
    assert.equal((await request('/api/v1/me')).status,401);
    for(const email of ['http-a@example.com','http-b@example.com']){
      assert.equal((await request('/api/v1/auth/request-code',{body:{email}})).status,200);
      const login=await request('/api/v1/auth/verify-code',{body:{email,code:sent.get(email)}});
      assert.equal((await request('/api/v1/legal/accept',{cookie:login.cookie,body:legalAcceptance})).status,200);
      assert.equal(login.status,200);assert.match(login.headers.get('set-cookie'),/Max-Age=2592000/);
      assert.match(login.headers.get('set-cookie'),/HttpOnly/);assert.match(login.headers.get('set-cookie'),/Secure/);assert.match(login.headers.get('set-cookie'),/SameSite=Strict/);
      if(email==='http-a@example.com')cookieA=login.cookie;else cookieB=login.cookie;
    }
    const me=await request('/api/v1/me',{cookie:cookieA});assert.equal(me.data.user.id,a.id);assert.equal(me.data.entitlements.kit,true);
  });
  let transaction;
  await t.test('operação autenticada não duplica, outro aluno não a acessa e a versão protege a edição',async()=>{
    const body={date:'2026-10-28',desc:'Venda HTTP',value:'0.10',type:'entrada',category:'vendas',scope:'empresa'},key=randomUUID();
    const created=await request('/api/v1/kit/transactions',{cookie:cookieA,body,headers:{'Idempotency-Key':key}});assert.equal(created.status,201);transaction=created.data;
    const replay=await request('/api/v1/kit/transactions',{cookie:cookieA,body,headers:{'Idempotency-Key':key}});assert.equal(replay.data.id,transaction.id);
    assert.equal((await request('/api/v1/kit/transactions/'+transaction.id,{cookie:cookieB})).status,403);
    const changed=await request('/api/v1/kit/transactions/'+transaction.id,{cookie:cookieA,method:'PATCH',body:{value:'0.20'},headers:{'If-Match':'"1"'}});assert.equal(changed.status,200);assert.equal(changed.data.version,2);
    assert.equal((await request('/api/v1/kit/transactions/'+transaction.id,{cookie:cookieA,method:'PATCH',body:{value:'5.00'},headers:{'If-Match':'"1"'}})).status,409);
    assert.equal((await request('/api/v1/kit/transactions/'+transaction.id,{cookie:cookieA,method:'PATCH',body:{value:'5.00'}})).status,428);
  });
  await t.test('resumo soma todos os registros da empresa, independente da página',async()=>{
    await request('/api/v1/kit/transactions',{cookie:cookieA,body:{date:'2026-10-28',desc:'Outra venda',value:'0.10',type:'entrada',category:'vendas',scope:'empresa'},headers:{'Idempotency-Key':randomUUID()}});
    await request('/api/v1/kit/transactions',{cookie:cookieA,body:{date:'2026-10-28',desc:'Casa',value:'999.99',type:'saida',category:'outros',scope:'pessoal'},headers:{'Idempotency-Key':randomUUID()}});
    const page=await request('/api/v1/kit/transactions?month=2026-10&limit=1',{cookie:cookieA});assert.equal(page.data.items.length,1);assert.ok(page.data.nextCursor);
    const summary=await request('/api/v1/kit/summary?month=2026-10',{cookie:cookieA});assert.equal(summary.data.count,2);assert.equal(summary.data.income,'0.30');assert.equal(summary.data.balance,'0.30');
  });
  await t.test('perfil não permite mudar e-mail ou elevar privilégios',async()=>{
    assert.equal((await request('/api/v1/me',{cookie:cookieA,method:'PATCH',body:{name:'Maria Silva'}})).status,200);
    for(const body of [{name:'Maria Silva',email:'other@example.com'},{name:'Maria Silva',role:'admin'}])assert.equal((await request('/api/v1/me',{cookie:cookieA,method:'PATCH',body})).status,400);
  });
  await t.test('origem externa, formato errado e arquivos privados são recusados',async()=>{
    assert.equal((await request('/api/v1/auth/request-code',{body:{email:a.email},headers:{Origin:'https://evil.test'}})).status,403);
    assert.equal((await request('/api/v1/auth/request-code',{body:{email:a.email},headers:{'Content-Type':'text/plain'}})).status,415);
    const invalid=await fetch(base+'/api/v1/auth/request-code',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'});assert.equal(invalid.status,400);
    for(const url of ['/.env','/.git/config','/server/index.js','/app/preview.html','/app/preview-data.js'])assert.equal((await request(url)).status,404,url);
    assert.equal((await request('/api/state',{cookie:cookieA,method:'PUT',body:{entitlements:{kit:true}}})).status,404);
    assert.match((await request('/app/config.js')).data,/"apiVersion":1/);
  });
  await t.test('logout invalida imediatamente a sessão',async()=>{
    assert.equal((await request('/api/v1/auth/logout',{cookie:cookieA,body:{}})).status,200);
    assert.equal((await request('/api/v1/me',{cookie:cookieA})).status,401);
  });
});
