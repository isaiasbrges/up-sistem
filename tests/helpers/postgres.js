'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');
const crypto = require('node:crypto');
const {Client} = require('pg');
const {execFile}=require('node:child_process');
const {promisify}=require('node:util');
const {migrate} = require('../../server/db/migrate');
const {createDatabase} = require('../../server/db/connection');

async function freePort() {
  const server=net.createServer();
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
  const port=server.address().port;
  await new Promise(resolve=>server.close(resolve));
  return port;
}

async function startTestDatabase(t) {
  let cluster,folder,ownerUrl;
  const root=path.resolve(__dirname,'../../data');
  if (process.env.TEST_MIGRATION_DATABASE_URL) ownerUrl=process.env.TEST_MIGRATION_DATABASE_URL;
  else {
    const {default:EmbeddedPostgres}=await import('embedded-postgres');
    await fs.mkdir(root,{recursive:true});
    folder=await fs.mkdtemp(path.join(root,'up-pg-test-'));
    const password=crypto.randomBytes(24).toString('hex'),port=await freePort();
    cluster=new EmbeddedPostgres({databaseDir:folder,port,user:'postgres',password,authMethod:'scram-sha-256',persistent:true,
      initdbFlags:['--encoding=UTF8','--locale=C'],postgresFlags:['-h','127.0.0.1','-c','max_connections=20','-c','shared_buffers=32MB'],
      onLog:()=>{},onError:()=>{}});
    await cluster.initialise();
    await cluster.start();
    const platform=process.platform==='win32'?'windows':process.platform;
    const binaries=await import('@embedded-postgres/'+platform+'-'+process.arch);let stopped=false;
    cluster.stop=async()=>{
      if(stopped)return;
      await promisify(execFile)(binaries.pg_ctl,['-D',folder,'-w','-t','10','-m','fast','stop'],{windowsHide:true,timeout:15000});
      stopped=true;
    };
    await cluster.createDatabase('up_test');
    ownerUrl=`postgresql://postgres:${password}@127.0.0.1:${port}/up_test`;
  }
  const owner=new Client({connectionString:ownerUrl});
  await owner.connect();
  let db;
  t.after(async()=>{
    await db?.close();
    await owner.end();
    if (cluster) await cluster.stop();
    if (folder) {
      const resolved=await fs.realpath(folder);
      if (path.dirname(resolved)!==await fs.realpath(root) || !path.basename(resolved).startsWith('up-pg-test-')) throw Error('Diretório temporário fora do destino permitido.');
      await fs.rm(resolved,{recursive:true,force:true,maxRetries:20,retryDelay:100});
    }
  });
  await migrate(ownerUrl);
  await migrate(ownerUrl);
  const suffix=crypto.randomBytes(6).toString('hex');
  const appName='up_test_app_'+suffix,internalName='up_test_internal_'+suffix;
  const appPassword=crypto.randomBytes(24).toString('hex'),internalPassword=crypto.randomBytes(24).toString('hex');
  for(const [name,password,group] of [[appName,appPassword,'up_app'],[internalName,internalPassword,'up_internal']]) {
    const {rows:[row]}=await owner.query("SELECT format('CREATE ROLE %I LOGIN PASSWORD %L IN ROLE %I', $1::text,$2::text,$3::text) AS sql",[name,password,group]);
    await owner.query(row.sql);
  }
  const makeUrl=(name,password)=>{const url=new URL(ownerUrl);url.username=name;url.password=password;return url.toString();};
  const urls={appUrl:makeUrl(appName,appPassword),internalUrl:makeUrl(internalName,internalPassword)};
  db=await createDatabase({...urls,max:2});
  return {db,owner,urls,ownerUrl};
}
module.exports={startTestDatabase};
