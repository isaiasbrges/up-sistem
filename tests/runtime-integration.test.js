'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const net=require('node:net');
const crypto=require('node:crypto');
const {startTestDatabase}=require('./helpers/postgres');
const {run}=require('../server/run');
const {bootstrapAdmin}=require('../server/commands/bootstrap-admin');
async function freePort(){const server=net.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));return port;}
test('new entry point starts HTTP with real PostgreSQL and isolated runtime roles',async t=>{
 const {urls,owner}=await startTestDatabase(t),port=await freePort();
 const env={NODE_ENV:'development',PORT:String(port),HOST:'127.0.0.1',APP_ORIGIN:'http://127.0.0.1:'+port,
  DATABASE_URL:urls.appUrl,INTERNAL_DATABASE_URL:urls.internalUrl,DEV_MAILBOX:'true',
  AUTH_SECRET:crypto.randomBytes(32).toString('hex'),KIWIFY_WEBHOOK_SECRET:crypto.randomBytes(32).toString('hex'),PAYLOAD_ENCRYPTION_KEY:crypto.randomBytes(32).toString('base64')};
 const runtime=await run({env});t.after(()=>runtime.stop());
 const response=await fetch(env.APP_ORIGIN+'/health/live');assert.equal(response.status,200);assert.equal((await response.json()).status,'ok');
 const me=await fetch(env.APP_ORIGIN+'/api/v1/me');assert.equal(me.status,401);await me.json();
 await t.test('explicit admin bootstrap is idempotent and never promotes an existing student',async()=>{
  const a=await bootstrapAdmin({env,email:'admin-runtime@example.test',name:'Runtime test'});
  const b=await bootstrapAdmin({env,email:'admin-runtime@example.test',name:'Runtime test'});assert.equal(a.id,b.id);assert.equal(a.platform_role,'admin');
  await owner.query("INSERT INTO up.users(email,name,platform_role) VALUES('student-runtime@example.test','Student','aluno')");
  await assert.rejects(bootstrapAdmin({env,email:'student-runtime@example.test'}),{code:'ROLE_CONFLICT'});
  const {rows:[student]}=await owner.query("SELECT platform_role FROM up.users WHERE email='student-runtime@example.test'");assert.equal(student.platform_role,'aluno');
 });
 await runtime.stop();await runtime.stop();
 assert.equal(runtime.server.listening,false);
});
