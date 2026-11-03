'use strict';
require('dotenv').config({quiet:true});
const {loadMailConfig}=require('../config');
const {createMailer}=require('../integrations/mail');
async function main(){
  let mailer;
  try{
    const config=loadMailConfig();
    if(config.localInbox){console.error('Desative DEV_MAILBOX para verificar o SMTP real.');process.exitCode=1;return;}
    mailer=createMailer({config,appOrigin:process.env.APP_ORIGIN||'http://localhost'});
    await mailer.verify();
    console.log('Conexão e autenticação SMTP verificadas. Nenhum e-mail foi enviado.');
  }catch(error){
    console.error(error.code==='CONFIGURATION_ERROR'?error.publicMessage:error.code==='EAUTH'?'A autenticação SMTP falhou. Confira a caixa e a senha no arquivo privado.':'Não foi possível verificar o SMTP. Confira servidor, porta, conexão e certificado.');
    process.exitCode=1;
  }finally{mailer?.close();}
}
if(require.main===module)main();
module.exports={main};
