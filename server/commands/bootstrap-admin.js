'use strict';
const {createDatabase}=require('../db/connection');
const {createIdentity}=require('../modules/identity/service');
async function bootstrapAdmin({env=process.env,email,name='Administrador UP'}={}){
  if(!env.DATABASE_URL||!env.INTERNAL_DATABASE_URL||!env.AUTH_SECRET)throw Error('Configure as conexões privadas e AUTH_SECRET antes de criar o administrador.');
  const db=await createDatabase({appUrl:env.DATABASE_URL,internalUrl:env.INTERNAL_DATABASE_URL});
  try{
    const identity=createIdentity({db,authSecret:env.AUTH_SECRET,sendCode:async()=>{}});
    return await identity.provision({email,name,role:'admin',products:[],reason:'Criação explícita do administrador para publicação do Software UP.'});
  }finally{await db.close();}
}
async function main(){
  require('dotenv').config({path:process.env.UP_ENV_FILE||'.env',quiet:true});
  const args=process.argv.slice(2),values={};
  while(args.length){const key=args.shift();if(!['--email','--name'].includes(key)||!args.length)throw Error('Use --email e, opcionalmente, --name.');values[key.slice(2)]=args.shift();}
  if(!values.email)throw Error('Informe --email para a conta administrativa autorizada.');
  await bootstrapAdmin(values);console.log('Administrador preparado. Nenhum código ou e-mail foi enviado.');
}
if(require.main===module)main().catch(error=>{console.error('Não foi possível preparar o administrador.',error.code==='ROLE_CONFLICT'?error.message:'Confira os argumentos e as configurações privadas.');process.exitCode=1;});
module.exports={bootstrapAdmin,main};
