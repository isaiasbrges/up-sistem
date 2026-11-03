'use strict';
const {migrate}=require('../server/db/migrate');
const {provisionRoles}=require('../server/db/provision');
async function initialize(env=process.env){
  await migrate(env.MIGRATION_DATABASE_URL);
  await provisionRoles({ownerUrl:env.MIGRATION_DATABASE_URL,appPassword:env.APP_DATABASE_PASSWORD,internalPassword:env.INTERNAL_DATABASE_PASSWORD});
  console.log('Banco exclusivo do UP preparado. Nenhuma conta ou documento fictício foi criado.');
}
if(require.main===module)initialize().catch(error=>{console.error('Não foi possível preparar o banco do UP.',error.code||'Confira as configurações privadas.');process.exitCode=1;});
module.exports={initialize};
