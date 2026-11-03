'use strict';
const express=require('express');
const path=require('node:path');
const crypto=require('node:crypto');
const {createIdentity,SESSION_TTL}=require('../modules/identity/service');
const {createResources,permission}=require('../modules/resources/repository');
const {createDrafts}=require('../modules/resources/drafts');
const {createAdmin}=require('../modules/admin/service');
const {createLegal}=require('../modules/legal/service');
const {createPrivacy}=require('../modules/privacy/service');
const {simulateDebt}=require('../modules/finance/logic');
const S=require('../shared/schemas');
const {AppError,fail}=require('../shared/errors');
const ROOT=path.resolve(__dirname,'../..');
const routes={diagnostics:'/diagnostics',finances:'/finance/snapshots',transactions:'/kit/transactions',bills:'/kit/bills',debts:'/kit/debts',offers:'/kit/offers',plans:'/kit/plans',checkins:'/kit/checkins',procedures:'/kit/procedures'};
function tokenFrom(req) {
  const part=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('up_session='));
  return part?.slice('up_session='.length)||'';
}
function expectedVersion(req) {
  const value=req.get('if-match');return /^"?[1-9]\d*"?$/.test(value||'')?Number(value.replaceAll('"','')):undefined;
}

function createHttpApp({db,sendCode,authSecret,now=Date.now,secure=false,appOrigin='http://localhost:3000',preview=true,trustProxy=false,ipLimit=20,billing,developmentInbox,legalRequired=secure}) {
  const identity=createIdentity({db,sendCode,authSecret,now,ipLimit}),resources=createResources({db}),drafts=createDrafts({db}),admin=createAdmin({db,billing,now});
  const app=express();app.disable('x-powered-by');app.set('trust proxy',trustProxy);
  const legal=createLegal({db,required:legalRequired,now}),privacy=createPrivacy({db,now});
  app.use((req,res,next)=>{
    req.requestId=crypto.randomUUID();
    res.set({'X-Request-ID':req.requestId,'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY',
      'Permissions-Policy':'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'"});
    if(secure)res.set('Strict-Transport-Security','max-age=31536000');
    if(req.path.startsWith('/api/'))res.set('Cache-Control','no-store');next();
  });
  app.get('/health/live',(_req,res)=>res.json({status:'ok'}));
  if(developmentInbox&&!secure)app.get('/__dev/mail',async(req,res)=>{
    if(!['localhost','127.0.0.1','[::1]'].includes(req.hostname)||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress))return res.sendStatus(404);
    res.set('Cache-Control','no-store').type('html').send(await developmentInbox());
  });
  app.get('/health/ready',async(_req,res)=>{
    try{await db.appPool.query('SELECT 1');await db.internalPool.query('SELECT 1');if(legalRequired&&!(await legal.status(null,'admin',false)).available)return res.status(503).json({status:'unavailable'});res.json({status:'ok'});}
    catch{res.status(503).json({status:'unavailable'});}
  });
  app.post('/webhooks/kiwify',express.raw({type:'application/json',limit:'512kb'}),async(req,res)=>{
    if(!billing)fail(503,'WEBHOOK_UNAVAILABLE','Recebimento de eventos indisponível.');
    await billing.receive(req.body,req.query.signature);res.json({ok:true});
  });
  app.use(express.json({limit:'512kb'}));
  const api=express.Router();
  api.use((req,res,next)=>{
    const origin=req.get('origin');
    if(!['GET','HEAD'].includes(req.method)){
      if(origin && origin!==appOrigin)fail(403,'INVALID_ORIGIN','Origem não permitida.');
      if(!req.is('application/json'))fail(415,'JSON_REQUIRED','Envie os dados no formato JSON.');
    }
    next();
  });
  api.post('/auth/request-code',async(req,res)=>res.json(await identity.requestCode(req.body?.email,req.ip)));
  api.post('/auth/verify-code',async(req,res)=>{
    const result=await identity.verifyCode(req.body?.email,req.body?.code,req.ip);
    res.cookie('up_session',result.token,{httpOnly:true,secure,sameSite:'strict',maxAge:SESSION_TTL,path:'/'});
    res.json({ok:true});
  });
  api.post('/auth/logout',async(req,res)=>{
    await identity.logout(tokenFrom(req));res.clearCookie('up_session',{httpOnly:true,secure,sameSite:'strict',path:'/'});res.json({ok:true});
  });
  api.get('/platform',async(_req,res)=>res.json(await admin.publicInfo()));
  api.use(async(req,_res,next)=>{req.identity=await identity.authenticate(tokenFrom(req));req.userId=req.identity.user.id;next();});
  api.get('/me',async(req,res)=>res.json({...req.identity,legal:await legal.status(req.userId,req.identity.user.role)}));
  api.get('/legal',async(req,res)=>res.json(await legal.status(req.userId,req.identity.user.role)));
  api.post('/legal/accept',async(req,res)=>res.json(await legal.accept(req.userId,req.body,{ip:req.ip,userAgent:req.get('user-agent')})));
  api.get('/privacy',async(req,res)=>res.json(await privacy.list(req.userId)));
  api.get('/privacy/export',async(req,res)=>res.attachment('software-up-meus-dados.json').type('json').json(await privacy.exportData(req.userId)));
  api.post('/privacy/deletion-requests',async(req,res)=>res.status(201).json(await privacy.requestDeletion(req.userId,req.body)));
  api.post('/privacy/deletion-requests/:id/cancel',async(req,res)=>res.json(await privacy.cancel(req.userId,req.params.id)));
  api.get('/admin/overview',async(req,res)=>res.json(await admin.overview(req.userId)));
  api.get('/admin/students',async(req,res)=>res.json(await admin.students(req.userId,req.query)));
  api.post('/admin/accesses',async(req,res)=>res.status(201).json(await admin.grant(req.userId,req.body,req.get('idempotency-key'))));
  api.post('/admin/accesses/:id/revoke',async(req,res)=>res.json(await admin.revoke(req.userId,req.params.id,req.body)));
  api.patch('/admin/students/:id/email',async(req,res)=>res.json(await admin.correctEmail(req.userId,req.params.id,req.body)));
  api.get('/admin/products',async(req,res)=>res.json(await admin.productMap(req.userId)));
  api.put('/admin/products',async(req,res)=>res.json(await admin.saveProduct(req.userId,req.body)));
  api.get('/admin/events',async(req,res)=>res.json(await admin.events(req.userId,req.query)));
  api.post('/admin/events/:id/reprocess',async(req,res)=>res.json(await admin.reprocess(req.userId,req.params.id,req.body)));
  api.get('/admin/settings',async(req,res)=>res.json(await admin.settings(req.userId)));
  api.put('/admin/settings',async(req,res)=>res.json(await admin.saveSettings(req.userId,req.body)));
  api.get('/admin/legal',async(req,res)=>res.json(await legal.list(req.userId)));
  api.post('/admin/legal/documents',async(req,res)=>res.status(201).json(await legal.save(req.userId,req.body,req.get('idempotency-key'))));
  api.post('/admin/legal/publish',async(req,res)=>res.json(await legal.publish(req.userId,req.body,req.get('idempotency-key'))));
  api.get('/admin/privacy',async(req,res)=>res.json(await privacy.staffList(req.userId,req.query)));
  api.post('/admin/privacy/:id/start',async(req,res)=>res.json(await privacy.start(req.userId,req.params.id,req.body)));
  api.use(async(req,_res,next)=>{if(req.path!=='/me')await legal.assertAccepted(req.userId,req.identity.user.role);next();});
  api.get('/drafts',async(req,res)=>res.json(await drafts.load(req.userId)));
  api.put('/drafts/:resource',async(req,res)=>res.json(await drafts.save(req.userId,req.params.resource,req.body)));
  api.patch('/me',async(req,res)=>{
    const data=S.parse(S.z.strictObject({name:S.text(120).min(2)}),req.body);
    const {rows:[user]}=await db.asUser(req.userId,client=>client.query('UPDATE up.users SET name=$1 WHERE id=$2 RETURNING id,name,email,phone,platform_role',[data.name,req.userId]));
    res.json({user:{id:user.id,name:user.name,email:user.email,phone:user.phone||'',role:user.platform_role}});
  });
  api.get('/diagnostics/initial',async(req,res)=>res.json((await resources.list(req.userId,'diagnostics',{kind:'initial',limit:1})).items[0]||null));
  for(const [name,url]of Object.entries(routes)){
    api.get(url,async(req,res)=>res.json(await resources.list(req.userId,name,req.query)));
    api.get(url+'/:id',async(req,res)=>res.json(await resources.get(req.userId,name,req.params.id)));
    api.post(url,async(req,res)=>res.status(201).json(await resources.create(req.userId,name,req.body,req.get('idempotency-key'))));
    api.patch(url+'/:id',async(req,res)=>res.json(await resources.update(req.userId,name,req.params.id,req.body,expectedVersion(req))));
    api.delete(url+'/:id',async(req,res)=>res.json(await resources.remove(req.userId,name,req.params.id,expectedVersion(req))));
  }
  api.post('/kit/debt-simulation',async(req,res)=>{
    const data=S.parse(S.z.strictObject({balance:S.money,rate:S.rate,payment:S.money,extra:S.money.default('0.00')}),req.body);
    await db.asUser(req.userId,client=>permission(client,'essencial'));
    res.json(simulateDebt(data.balance,data.rate,data.payment,data.extra));
  });
  api.get('/kit/summary',async(req,res)=>{
    const month=S.parse(S.month,req.query.month);
    const result=await db.asUser(req.userId,async client=>{
      await permission(client,'essencial');
      const {rows:[totals]}=await client.query(`SELECT coalesce(sum(value) FILTER(WHERE type='entrada'),0)::text AS income,
        coalesce(sum(value) FILTER(WHERE type='saida'),0)::text AS expenses,
        coalesce(sum(CASE WHEN type='entrada' THEN value ELSE -value END),0)::text AS balance,
        count(*)::integer AS count FROM up.kit_transactions WHERE user_id=$1 AND deleted_at IS NULL
        AND scope='empresa' AND date >= $2::date AND date < ($2::date + interval '1 month')`,[req.userId,month+'-01']);
      const {rows:[bills]}=await client.query(`SELECT coalesce(sum(value),0)::text AS total,count(*)::integer AS count,
        count(*) FILTER(WHERE due <= (now() AT TIME ZONE 'America/Sao_Paulo')::date+7)::integer AS due_count
        FROM up.kit_bills WHERE user_id=$1 AND NOT paid AND deleted_at IS NULL`,[req.userId]);
      return {month,...totals,bills};
    });res.json(result);
  });
  api.use((_req,_res)=>fail(404,'NOT_FOUND','Recurso não encontrado.'));
  app.use('/api/v1',api);
  // Nenhum adaptador que substitua o estado inteiro é exposto nesta API.
  app.use('/api',(_req,_res)=>fail(404,'NOT_FOUND','Use os contratos da API atual.'));
  app.get('/app/config.js',(_req,res)=>res.type('js').send('window.UP_CONFIG='+JSON.stringify({api:true,apiVersion:1,previewEnabled:preview})+';'));
  if(!preview)app.use(['/app/preview.html','/app/preview-data.js'],(_req,res)=>res.sendStatus(404));
  app.get('/',(_req,res)=>res.sendFile(path.join(ROOT,'index.html')));
  app.get('/entrar',(_req,res)=>res.sendFile(path.join(ROOT,'index.html')));
  for(const dir of ['app','design-system'])app.use('/'+dir,express.static(path.join(ROOT,dir),{dotfiles:'deny'}));
  app.use((err,req,res,_next)=>{
    if(err instanceof AppError){
      if(err.status===429&&err.fields?.retryAfter)res.set('Retry-After',String(err.fields.retryAfter));
      return res.status(err.status).json({error:err.message,code:err.code,...(err.fields?{fields:err.fields}:{})});
    }
    const status=err.type==='entity.too.large'?413:err instanceof SyntaxError&&err.status===400?400:500;
    if(status===500)console.error('Falha na requisição.',{requestId:req.requestId,code:err.code||err.name});
    res.status(status).json({error:status===413?'Os dados excedem o limite permitido.':status===400?'JSON inválido.':'Não foi possível concluir a operação.',code:status===500?'INTERNAL_ERROR':'INVALID_BODY',requestId:req.requestId});
  });
  app.locals.identity=identity;app.locals.resources=resources;app.locals.admin=admin;app.locals.legal=legal;app.locals.privacy=privacy;
  return app;
}
module.exports={createHttpApp,tokenFrom,expectedVersion};
