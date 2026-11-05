'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {startTestDatabase}=require('./helpers/postgres'),{createHttpApp}=require('../server/http/app');
test('contas ativas cadastradas manualmente entram sem compra, mantendo restrições de produto',async t=>{
 const {db,owner}=await startTestDatabase(t),sent=new Map();let clock=Date.now();
 const app=createHttpApp({db,authSecret:'registered-login-test-secret-'.repeat(2),sendCode:async(e,c)=>sent.set(e,c),now:()=>clock});
 const account=await app.locals.identity.provision({email:'manual-login@example.com',products:[]});
 const identity=app.locals.identity;
 const generic=await identity.requestCode('unknown-login@example.com','127.0.0.1');
 assert.deepEqual(await identity.requestCode(account.email,'127.0.0.1'),generic);assert.ok(sent.get(account.email));assert.equal(sent.has('unknown-login@example.com'),false);
 const session=await identity.verifyCode(account.email,sent.get(account.email),'127.0.0.1');
 const me=await identity.authenticate(session.token);assert.equal(me.user.id,account.id);assert.equal(me.user.role,'aluno');assert.equal(Object.values(me.entitlements).some(Boolean),false);
 await assert.rejects(app.locals.resources.list(account.id,'diagnostics'),e=>e.code==='PRODUCT_REQUIRED');
 await identity.provision({email:account.email,products:['front'],expiresAt:new Date(clock-1).toISOString()});clock+=61000;
 await identity.requestCode(account.email,'127.0.0.1');assert.ok((await identity.verifyCode(account.email,sent.get(account.email),'127.0.0.1')).token);
 await owner.query("UPDATE up.users SET status='deleted' WHERE id=$1",[account.id]);clock+=61000;sent.delete(account.email);
 await identity.requestCode(account.email,'127.0.0.1');assert.equal(sent.has(account.email),false);await assert.rejects(identity.authenticate(session.token),e=>e.code==='UNAUTHENTICATED');
});
