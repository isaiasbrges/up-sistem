'use strict';
const {Client}=require('pg');
function connectionUrl(base,name,password){const url=new URL(base);url.username=name;url.password=password;return url.toString();}
async function provisionRoles({ownerUrl,appPassword,internalPassword,appName='up_runtime',internalName='up_service',rotate=false}){
  for(const name of [appName,internalName])if(!/^[a-z][a-z0-9_]{1,62}$/.test(name)||['postgres','up_app','up_internal'].includes(name)||name.startsWith('pg_'))throw Error('Nome de credencial inválido.');
  if(appName===internalName)throw Error('As credenciais devem ser distintas.');
  if([appPassword,internalPassword].some(value=>typeof value!=='string'||value.length<32))throw Error('Use senhas aleatórias com pelo menos 32 caracteres.');
  const client=new Client({connectionString:ownerUrl});await client.connect();
  try{
    for(const [name,password,group]of [[appName,appPassword,'up_app'],[internalName,internalPassword,'up_internal']]){
      const {rows:[role]}=await client.query('SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=$1',[name]);
      if(role?.rolsuper||role?.rolbypassrls)throw Error('Não é permitido reutilizar uma credencial privilegiada.');
      const template=role?'ALTER ROLE %I LOGIN PASSWORD %L':'CREATE ROLE %I LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD %L';
      if(!role||rotate){const {rows:[sql]}=await client.query('SELECT format($1::text,$2::text,$3::text) AS value',[template,name,password]);await client.query(sql.value);}
      const {rows:[grant]}=await client.query("SELECT format('GRANT %I TO %I',$1::text,$2::text) AS value",[group,name]);await client.query(grant.value);
    }
  }finally{await client.end();}
  return {appUrl:connectionUrl(ownerUrl,appName,appPassword),internalUrl:connectionUrl(ownerUrl,internalName,internalPassword)};
}
if(require.main===module){
  require('dotenv').config({path:process.env.UP_MIGRATION_ENV_FILE||'.env.migration',quiet:true});
  provisionRoles({ownerUrl:process.env.MIGRATION_DATABASE_URL,appPassword:process.env.APP_DATABASE_PASSWORD,internalPassword:process.env.INTERNAL_DATABASE_PASSWORD,rotate:process.argv.includes('--rotate')})
    .then(()=>console.log('Credenciais da aplicação preparadas. As senhas não foram exibidas.'))
    .catch(error=>{console.error('Não foi possível preparar as credenciais.',error.code||'Verifique a configuração privada.');process.exitCode=1;});
}
module.exports={provisionRoles,connectionUrl};
