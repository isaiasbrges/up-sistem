'use strict';
const crypto=require('node:crypto');
const S=require('../../shared/schemas');
const {fail}=require('../../shared/errors');
const {normalizeEmail,validEmail}=require('../identity/service');
const {createPayloadCipher}=require('./crypto');
const {durationSchema,accessExpiresAt}=require('../../shared/access-duration');
const mappingSchema=S.z.strictObject({email:S.text(250).min(1),productId:S.text(250).min(1),name:S.text(250).min(1).optional()});
const eventActions={order_approved:{status:'paid',action:'paid'},order_refunded:{status:'refunded',action:'refunded'},chargeback:{status:'chargedback',action:'chargeback'}};
function readPath(value,path) {
  if(typeof path!=='string'||path.length>250)return undefined;
  const keys=path.split('.');
  if(keys.length>8||keys.some(k=>!/^[A-Za-z0-9_]+$/.test(k)||['__proto__','constructor','prototype'].includes(k)))return undefined;
  for(const key of keys){if(!value||typeof value!=='object'||!Object.hasOwn(value,key))return undefined;value=value[key];}
  return typeof value==='string'||typeof value==='number'?String(value):undefined;
}
function bounded(value,max) {return typeof value==='string'&&value.length>0&&value.length<=max&&!/[\x00-\x1f]/.test(value);}

function createBilling({db,secret,additionalSecrets=[],previousSecret,previousValidUntil,encryptionKey,now=Date.now}) {
  if(typeof secret!=='string'||!secret.trim())throw Error('Configure KIWIFY_WEBHOOK_SECRET com o token informado pela Kiwify.');
  if(previousSecret&&(!previousValidUntil||!Number.isFinite(new Date(previousValidUntil).getTime())))throw Error('Informe a validade do token anterior da Kiwify.');
  if(!Array.isArray(additionalSecrets)||additionalSecrets.length>20||additionalSecrets.some(value=>typeof value!=='string'||!value.trim()))throw Error('Configure os tokens adicionais da Kiwify como uma lista de strings preenchidas.');
  const cipher=createPayloadCipher(encryptionKey);
  function verify(raw,signature) {
    if(!Buffer.isBuffer(raw)||typeof signature!=='string'||!/^[a-f0-9]{40}$/.test(signature))fail(401,'INVALID_SIGNATURE','Assinatura inválida.');
    const candidate=Buffer.from(signature,'hex');
    const keys=[secret,...additionalSecrets,...(previousSecret&&new Date(previousValidUntil).getTime()>now()?[previousSecret]:[])];
    let valid=false;for(const key of keys)valid=crypto.timingSafeEqual(candidate,crypto.createHmac('sha1',key).update(raw).digest())||valid;
    if(!valid)fail(401,'INVALID_SIGNATURE','Assinatura inválida.');
  }
  async function receive(raw,signature) {
    verify(raw,signature);
    let payload;try{payload=JSON.parse(raw.toString('utf8'));}catch{fail(400,'INVALID_PAYLOAD','JSON inválido.');}
    if(!payload||typeof payload!=='object'||Array.isArray(payload))fail(400,'INVALID_PAYLOAD','Evento inválido.');
    const order=payload.order_id,type=payload.webhook_event_type;
    if(!bounded(order,254)||!bounded(type,100))fail(400,'INVALID_PAYLOAD','Identificação de evento inválida.');
    const digest=crypto.createHash('sha256').update(raw).digest('hex'),encrypted=cipher.encrypt(raw);
    return db.internal(async client=>{
      const inserted=await client.query(`INSERT INTO up_private.webhook_events(order_id,event_type,signature_ok,payload_encrypted,body_digest,received_at)
        VALUES($1,$2,true,$3,$4,$5) ON CONFLICT(order_id,event_type) DO NOTHING RETURNING id`,[order,type,encrypted,digest,new Date(now())]);
      const eventId=inserted.rows[0]?.id||(await client.query('SELECT id FROM up_private.webhook_events WHERE order_id=$1 AND event_type=$2',[order,type])).rows[0].id;
      await client.query('INSERT INTO up_private.webhook_deliveries(event_id,body_digest,payload_encrypted,received_at) VALUES($1,$2,$3,$4)',[eventId,digest,encrypted,new Date(now())]);
      await client.query(`INSERT INTO up_private.jobs(job_key,kind,payload,available_at) VALUES($1,'kiwify',$2,$3) ON CONFLICT(job_key) DO NOTHING`,['kiwify:'+eventId,JSON.stringify({eventId}),new Date(now())]);
      return {ok:true,duplicate:!inserted.rowCount,eventId};
    });
  }
  async function setting(client,key) {return (await client.query('SELECT value FROM up_private.settings WHERE key=$1',[key])).rows[0]?.value;}
  async function processEvent(eventId) {
    return db.internal(async client=>{
      const {rows:[event]}=await client.query('SELECT * FROM up_private.webhook_events WHERE id=$1 FOR UPDATE',[eventId]);
      if(!event)return {missing:true};if(event.status==='processed')return {duplicate:true};
      const payload=JSON.parse(cipher.decrypt(event.payload_encrypted).toString('utf8'));
      const contract=eventActions[event.event_type];
      async function review(code){await client.query("UPDATE up_private.webhook_events SET status='review',error_code=$2 WHERE id=$1",[eventId,code]);return {review:code};}
      async function finish(){await client.query("UPDATE up_private.webhook_events SET status='processed',processed_at=$2,error_code=NULL WHERE id=$1",[eventId,new Date(now())]);}
      if(!contract){await finish();return {ignored:true};}
      if(payload.order_status!==contract.status)return review('ORDER_STATUS_MISMATCH');
      const rawMapping=await setting(client,'kiwify.fields'),parsedMapping=mappingSchema.safeParse(rawMapping);
      if(!parsedMapping.success)return review('PAYLOAD_MAPPING_UNSET');
      const mapping=parsedMapping.data,externalProduct=readPath(payload,mapping.productId);
      if(!bounded(externalProduct,254))return review('PRODUCT_ID_MISSING');
      const {rows:[mapped]}=await client.query('SELECT product_code FROM up_private.kiwify_product_map WHERE kiwify_product_id=$1 AND enabled',[externalProduct]);
      if(!mapped)return review('PRODUCT_UNKNOWN');
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,2))',[event.order_id]);
      const {rows:[existing]}=await client.query('SELECT * FROM up_private.purchase_orders WHERE order_id=$1 FOR UPDATE',[event.order_id]);
      if(existing?.product_code&&existing.product_code!==mapped.product_code)return review('ORDER_PRODUCT_CONFLICT');
      let finalStatus=contract.action;
      if(existing?.status==='chargeback'||(existing?.status==='refunded'&&finalStatus==='paid'))finalStatus=existing.status;
      // Eventos terminais recebidos antes de uma configuração válida também impedem reativação tardia.
      if(finalStatus==='paid'){
        const {rows:terminals}=await client.query("SELECT event_type,payload_encrypted FROM up_private.webhook_events WHERE order_id=$1 AND event_type IN ('order_refunded','chargeback') AND signature_ok",[event.order_id]);
        for(const terminal of terminals){
          const body=JSON.parse(cipher.decrypt(terminal.payload_encrypted).toString('utf8'));
          if(body.order_status===eventActions[terminal.event_type].status&&readPath(body,mapping.productId)===externalProduct){finalStatus=terminal.event_type==='chargeback'?'chargeback':'refunded';if(finalStatus==='chargeback')break;}
        }
      }
      let userId=existing?.user_id;
      if(finalStatus==='paid'){
        const duration=durationSchema.safeParse(await setting(client,'access.duration.'+mapped.product_code));
        if(!duration.success)return review('ACCESS_DURATION_UNSET');
        const email=normalizeEmail(readPath(payload,mapping.email));
        if(!validEmail(email))return review('CUSTOMER_EMAIL_MISSING');
        const {rows:[account]}=await client.query('SELECT id,status FROM up.users WHERE email=$1',[email]);
        if(account&&account.status!=='active')return review('ACCOUNT_INACTIVE');
        if(userId&&account?.id!==userId)return review('ORDER_CUSTOMER_CONFLICT');
        const rawName=mapping.name?readPath(payload,mapping.name):'',name=rawName?.trim().slice(0,120)||'Aluno UP';
        const inserted=await client.query('INSERT INTO up.users(email,name) VALUES($1,$2) ON CONFLICT(email) DO NOTHING RETURNING id',[email,name.length>=2?name:'Aluno UP']);
        const {rows:[user]}=await client.query('SELECT id,status FROM up.users WHERE email=$1',[email]);
        if(user.status!=='active')return review('ACCOUNT_INACTIVE');
        if(userId&&userId!==user.id)return review('ORDER_CUSTOMER_CONFLICT');
        userId=user.id;
        const expires=accessExpiresAt(duration.data,now());
        await client.query(`INSERT INTO up.entitlements(user_id,product_code,status,origin,source_ref,order_id,activated_at,expires_at)
          VALUES($1,$2,'active','kiwify',$3,$3,$4,$5) ON CONFLICT(user_id,product_code,origin,source_ref) DO NOTHING`,[userId,mapped.product_code,event.order_id,new Date(now()),expires]);
        await client.query(`INSERT INTO up_private.jobs(job_key,kind,payload,available_at) VALUES($1,'email',$2,$3) ON CONFLICT(job_key) DO NOTHING`,[
          inserted.rowCount?'email:welcome:'+userId:'email:access:'+event.order_id+':'+mapped.product_code,
          JSON.stringify({userId,template:inserted.rowCount?'welcome':'access',product:mapped.product_code}),new Date(now())]);
      } else {
        await client.query(`UPDATE up.entitlements SET status=$2,ended_at=$3,updated_at=$3
          WHERE origin='kiwify' AND order_id=$1 AND product_code=$4`,[event.order_id,finalStatus,new Date(now()),mapped.product_code]);
      }
      await client.query(`INSERT INTO up_private.purchase_orders(order_id,user_id,product_code,external_product_id,status,first_event_id)
        VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(order_id) DO UPDATE SET user_id=coalesce(EXCLUDED.user_id,up_private.purchase_orders.user_id),
        status=EXCLUDED.status,updated_at=now()`,[event.order_id,userId||null,mapped.product_code,externalProduct,finalStatus,eventId]);
      await client.query("INSERT INTO up_private.audit_events(action,target_type,target_id,metadata) VALUES('kiwify.process','order',$1,$2)",[event.order_id,JSON.stringify({eventId,product:mapped.product_code,status:finalStatus,userId:userId||null})]);
      await finish();return {processed:true,status:finalStatus,userId:userId||null,product:mapped.product_code};
    });
  }
  async function reprocess(eventId,actorId,reason) {
    if(!reason||reason.trim().length<5)fail(400,'REASON_REQUIRED','Informe o motivo do reprocessamento.');
    await db.internal(async client=>{
      const {rowCount}=await client.query("UPDATE up_private.webhook_events SET status='pending',error_code=NULL WHERE id=$1",[eventId]);
      if(!rowCount)fail(404,'NOT_FOUND','Evento não encontrado.');
      await client.query("UPDATE up_private.jobs SET status='pending',attempts=0,available_at=$2,lease_until=NULL,lease_owner=NULL WHERE job_key=$1",['kiwify:'+eventId,new Date(now())]);
      await client.query("INSERT INTO up_private.audit_events(actor_id,action,target_type,target_id,reason) VALUES($1,'kiwify.reprocess','webhook',$2,$3)",[actorId,eventId,reason.trim()]);
    });
    return {ok:true};
  }
  return {receive,processEvent,reprocess,verify};
}
module.exports={createBilling,readPath,mappingSchema,durationSchema};
