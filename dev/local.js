'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const crypto=require('node:crypto');
const {promisify}=require('node:util');
const {execFile}=require('node:child_process');
const {migrate}=require('../server/db/migrate');
const {provisionRoles}=require('../server/db/provision');
const {start}=require('../server/bootstrap/start');
const ROOT=path.resolve(__dirname,'..');
async function local(){
  const dataDir=path.join(ROOT,'data');await fs.mkdir(dataDir,{recursive:true});
  const file=path.join(dataDir,'local-secrets.json');let secrets;
  try{secrets=JSON.parse(await fs.readFile(file,'utf8'));}
  catch(error){if(error.code!=='ENOENT')throw error;
    secrets={version:1,dbPassword:crypto.randomBytes(32).toString('hex'),appPassword:crypto.randomBytes(32).toString('hex'),internalPassword:crypto.randomBytes(32).toString('hex'),authSecret:crypto.randomBytes(32).toString('hex'),webhookSecret:crypto.randomBytes(32).toString('hex'),payloadKey:crypto.randomBytes(32).toString('base64'),dbPort:Number(process.env.LOCAL_POSTGRES_PORT||54328)};
    await fs.writeFile(file,JSON.stringify(secrets,null,2),{encoding:'utf8',mode:0o600,flag:'wx'});
  }
  if(secrets.version!==1)throw Error('Configuração local incompatível.');
  const {default:EmbeddedPostgres}=await import('embedded-postgres');
  const databaseDir=path.join(dataDir,'postgres-local');
  const cluster=new EmbeddedPostgres({databaseDir,port:secrets.dbPort,user:'postgres',password:secrets.dbPassword,authMethod:'scram-sha-256',persistent:true,
    initdbFlags:['--encoding=UTF8','--locale=C'],postgresFlags:['-h','127.0.0.1','-c','max_connections=30','-c','shared_buffers=64MB'],onLog:()=>{},onError:()=>{}});
  let running=false,runtime,stopped=false;
  const platform=process.platform==='win32'?'windows':process.platform;
  const binaries=await import('@embedded-postgres/'+platform+'-'+process.arch);
  const stopDatabase=async()=>{if(!running)return;running=false;await promisify(execFile)(binaries.pg_ctl,['-D',databaseDir,'-w','-m','fast','stop'],{windowsHide:true});};
  // O controlador nativo encerra o PostgreSQL graciosamente, inclusive no Windows.
  cluster.stop=stopDatabase;
  async function stop(){if(stopped)return;stopped=true;await runtime?.stop();await stopDatabase();}
  process.once('SIGINT',()=>stop().then(()=>process.exit(0)).catch(()=>process.exit(1)));
  process.once('SIGTERM',()=>stop().then(()=>process.exit(0)).catch(()=>process.exit(1)));
  try{
    try{await fs.access(path.join(databaseDir,'PG_VERSION'));}catch{await cluster.initialise();}
    await cluster.start();running=true;
    const admin=cluster.getPgClient('postgres','127.0.0.1');await admin.connect();
    try{if(!(await admin.query("SELECT 1 FROM pg_database WHERE datname='up_local'")).rowCount)await admin.query('CREATE DATABASE up_local');}finally{await admin.end();}
    const ownerUrl=`postgresql://postgres:${secrets.dbPassword}@127.0.0.1:${secrets.dbPort}/up_local`;
    await migrate(ownerUrl);
    const urls=await provisionRoles({ownerUrl,appPassword:secrets.appPassword,internalPassword:secrets.internalPassword});
    const port=Number(process.env.PORT||3001),appOrigin='http://127.0.0.1:'+port;
    runtime=await start({env:{NODE_ENV:'development',HOST:'127.0.0.1',PORT:String(port),APP_ORIGIN:appOrigin,
      DATABASE_URL:urls.appUrl,INTERNAL_DATABASE_URL:urls.internalUrl,AUTH_SECRET:secrets.authSecret,
      KIWIFY_WEBHOOK_SECRET:secrets.webhookSecret,PAYLOAD_ENCRYPTION_KEY:secrets.payloadKey,DEV_MAILBOX:'true'}});
    await runtime.app.locals.identity.provision({email:'demo@up.local',name:'Aluno de teste UP',products:['front','kit'],reason:'Conta fictícia do ambiente local de desenvolvimento.'});
    await runtime.app.locals.identity.provision({email:'admin@up.local',name:'Administrador de teste UP',role:'admin',reason:'Administrador fictício do ambiente local de desenvolvimento.'});
    await require('./seed-legal').seedDevelopmentLegal(runtime.db);
    await runtime.db.internal(async client=>{
      await client.query("INSERT INTO up_private.settings(key,value) VALUES('kiwify.fields',$1) ON CONFLICT(key) DO NOTHING",[JSON.stringify({email:'Customer.email',name:'Customer.full_name',productId:'Product.product_id'})]);
      for(const product of ['front','essencial','kit']){
        await client.query("INSERT INTO up_private.kiwify_product_map(kiwify_product_id,product_code) VALUES($1,$2) ON CONFLICT DO NOTHING",['local-'+product,product]);
        await client.query('INSERT INTO up_private.settings(key,value) VALUES($1,$2) ON CONFLICT(key) DO NOTHING',['access.duration.'+product,JSON.stringify({kind:'months',months:12})]);
      }
    });
    console.log('Ambiente local de testes. Conta: demo@up.local. Administração: admin@up.local.');
    console.log('Caixa de e-mails de teste: '+appOrigin+'/__dev/mail');
    return {runtime,stop};
  }catch(error){await stop();throw error;}
}
if(require.main===module)local().catch(error=>{console.error('Não foi possível iniciar o ambiente local.',error.publicMessage||error.code||error.name);process.exitCode=1;});
module.exports={local};
