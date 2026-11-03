'use strict';
const path=require('node:path');
const assert=require('node:assert/strict');
const {createDatabase}=require(path.join(process.cwd(),'server/db/connection'));
const {createHttpApp}=require(path.join(process.cwd(),'server/http/app'));
(async()=>{
 const db=await createDatabase({appUrl:process.env.DATABASE_URL,internalUrl:process.env.INTERNAL_DATABASE_URL});let server;
 try{
  const app=createHttpApp({db,authSecret:process.env.AUTH_SECRET,secure:true,preview:false,appOrigin:process.env.APP_ORIGIN,
    sendCode:async()=>{throw Error('O teste de imagem não envia e-mails.');}});
  server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
  const base='http://127.0.0.1:'+server.address().port;
  for(const [url,status]of [['/health/live',200],['/',200],['/api/v1/me',401],['/app/preview.html',404],['/data/local-secrets.json',404],['/.env',404]]){
    const response=await fetch(base+url);assert.equal(response.status,status,url);await response.text();
  }
  const {rows:[row]}=await db.internal(c=>c.query("SELECT to_regclass('up.users') AS users,to_regclass('up_private.legal_publication') AS legal,to_regclass('up_private.jobs') AS jobs"));
  assert.ok(row.users&&row.legal&&row.jobs);
  console.log('Imagem, API, isolamento de papéis e bloqueio de arquivos privados conferidos. SMTP e documentos de lançamento continuam pendentes.');
 }finally{if(server)await new Promise(r=>server.close(r));await db.close();}
})().catch(()=>{console.error('A verificação interna do UP falhou.');process.exitCode=1;});
