'use strict';
const {loadConfig}=require('../config');
const {createDatabase}=require('../db/connection');
const {createHttpApp}=require('../http/app');
const {createMailer}=require('../integrations/mail');
const {createBilling}=require('../modules/billing/service');
const {createWorker}=require('../jobs/worker');
async function start({env=process.env,listen=true}={}){
  const config=loadConfig(env),db=await createDatabase(config.db);let server;
  const mailer=createMailer({config:config.mail,appOrigin:config.appOrigin});
  try{
    await mailer.verify();
    const billing=createBilling({db,...config.billing});
    const worker=createWorker({db,handlers:{kiwify:p=>billing.processEvent(p.eventId),email:async(payload,job)=>{
      const {rows:[user]}=await db.internal(c=>c.query('SELECT id,name,email,status FROM up.users WHERE id=$1',[payload.userId]));
      if(!user||user.status!=='active')return;
      const {rows:[access]}=await db.internal(c=>c.query("SELECT count(*)::integer AS n FROM up.entitlements WHERE user_id=$1 AND status='active' AND activated_at<=now() AND (expires_at IS NULL OR expires_at>now()) AND ($2::text IS NULL OR product_code=$2)",[user.id,payload.product||null]));
      if(!access.n)return;
      await mailer.sendNotice({to:user.email,name:user.name,template:payload.template,product:payload.product,key:job.job_key});
    }}});
    const app=createHttpApp({db,sendCode:mailer.sendCode,authSecret:config.authSecret,secure:config.production,appOrigin:config.appOrigin,preview:config.preview,trustProxy:config.trustProxy,ipLimit:config.ipLimit,billing,developmentInbox:config.mail.localInbox?mailer.inboxPage:undefined});
    if(listen){server=app.listen(config.port,config.host);await new Promise((resolve,reject)=>{server.once('listening',resolve);server.once('error',reject);});worker.start();console.log('Software UP iniciado em '+config.appOrigin+'.');}
    let closed=false;
    async function stop(){if(closed)return;closed=true;if(server)await new Promise(r=>server.close(r));await worker.stop();mailer.close();await db.close();}
    return {app,db,config,mailer,billing,worker,server,stop};
  }catch(error){mailer.close();if(server)server.close();await db.close();throw error;}
}
module.exports={start};
