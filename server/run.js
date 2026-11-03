'use strict';
const {start}=require('./bootstrap/start');
async function run({env=process.env,createRuntime=start,signals=process}={}){
  const runtime=await createRuntime({env});let stopping;
  async function stop(){
    if(!stopping)stopping=Promise.resolve().then(()=>runtime.stop()).finally(()=>{
      signals.removeListener('SIGINT',shutdown);signals.removeListener('SIGTERM',shutdown);
    });
    return stopping;
  }
  function shutdown(){
    const deadline=setTimeout(()=>{console.error('Prazo de encerramento excedido.');signals.exit(1);},25000);deadline.unref();
    stop().catch(()=>{console.error('Falha ao encerrar o Software UP.');signals.exitCode=1;}).finally(()=>clearTimeout(deadline));
  }
  signals.once('SIGINT',shutdown);signals.once('SIGTERM',shutdown);
  return {...runtime,stop};
}
async function main(){
  require('dotenv').config({path:process.env.UP_ENV_FILE||'.env',quiet:true});
  if(!process.env.NODE_ENV)process.env.NODE_ENV='production';
  return run();
}
if(require.main===module)main().catch(error=>{
  console.error('Não foi possível iniciar o Software UP.',error.code==='CONFIGURATION_ERROR'?error.publicMessage:'Confira banco, SMTP e configurações privadas.');process.exitCode=1;
});
module.exports={run,main};
