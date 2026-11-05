'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {startTestDatabase}=require('./helpers/postgres');
const {createHttpApp}=require('../server/http/app');
test('prévia exige administrador e bloqueia rede e formulários no documento isolado',async t=>{
 const {db}=await startTestDatabase(t),sent=new Map();
 const app=createHttpApp({db,authSecret:'student-preview-test-secret-'.repeat(2),sendCode:async(e,c)=>sent.set(e,c),preview:false});
 const admin=await app.locals.identity.provision({email:'preview-admin@example.com',role:'admin'});
 const support=await app.locals.identity.provision({email:'preview-support@example.com',role:'suporte'});
 const student=await app.locals.identity.provision({email:'preview-student@example.com',products:['front']});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));t.after(()=>new Promise(r=>server.close(r)));
 const base='http://127.0.0.1:'+server.address().port;
 assert.equal((await fetch(base+'/app/student-preview.html')).status,401);
 for(const url of ['/app/%73tudent-preview.html','/app/student-preview%2ehtml'])assert.equal((await fetch(base+url)).status,404);
 async function cookie(user){await app.locals.identity.requestCode(user.email,'127.0.0.1');const session=await app.locals.identity.verifyCode(user.email,sent.get(user.email),'127.0.0.1');return 'up_session='+session.token;}
 for(const user of [student,support])assert.equal((await fetch(base+'/app/student-preview.html',{headers:{Cookie:await cookie(user)}})).status,403);
 const response=await fetch(base+'/app/student-preview.html',{headers:{Cookie:await cookie(admin)}});
 assert.equal(response.status,200);assert.equal(response.headers.get('x-frame-options'),'SAMEORIGIN');assert.match(response.headers.get('content-security-policy'),/connect-src 'none'/);assert.match(response.headers.get('content-security-policy'),/form-action 'none'/);assert.equal(response.headers.get('cache-control'),'no-store');assert.match(await response.text(),/student-preview-data/);
 assert.equal((await fetch(base+'/app/preview.html')).status,404);assert.equal((await fetch(base+'/app/preview-data.js')).status,404);
});
