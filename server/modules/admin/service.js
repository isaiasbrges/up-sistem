'use strict';
const S=require('../../shared/schemas');
const {fail}=require('../../shared/errors');
const {normalizeEmail,validEmail}=require('../identity/service');
const {idempotent}=require('../resources/repository');
const {mappingSchema,durationSchema}=require('../billing/service');
const {accessExpiresAt}=require('../../shared/access-duration');
const UUID=S.z.uuid();
const reasonSchema=S.text(1000).min(5);
const product=S.z.enum(['front','essencial','kit']);
const link=S.z.union([S.z.literal(''),S.z.url().max(2048).refine(v=>{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password;},'Use um endereço HTTPS sem credenciais.')]);
const settingKeys=['kit.purchase_url','support.url','support.email','kiwify.fields','access.duration.front','access.duration.essencial','access.duration.kit'];
function createAdmin({db,billing,now=Date.now}){
  async function run(actorId,adminOnly,work){return db.internal(async client=>{
    const {rows:[actor]}=await client.query("SELECT platform_role FROM up.users WHERE id=$1 AND status='active'",[actorId]);
    if(!actor||!['admin','suporte'].includes(actor.platform_role)||(adminOnly&&actor.platform_role!=='admin'))fail(403,'STAFF_REQUIRED','Esta operação é restrita à equipe autorizada.');
    return work(client,actor.platform_role);
  });}
  const audit=(client,actorId,action,targetType,targetId,reason,metadata={})=>client.query('INSERT INTO up_private.audit_events(actor_id,action,target_type,target_id,reason,metadata) VALUES($1,$2,$3,$4,$5,$6)',[actorId,action,targetType,targetId,reason,JSON.stringify(metadata)]);
  async function overview(actorId){return run(actorId,true,async client=>{
    const {rows:[students]}=await client.query("SELECT count(*)::integer AS total FROM up.users WHERE platform_role='aluno' AND status='active'");
    const {rows:accesses}=await client.query("SELECT product_code,count(DISTINCT user_id)::integer AS users FROM up.entitlements WHERE status='active' AND activated_at<=now() AND (expires_at IS NULL OR expires_at>now()) GROUP BY product_code");
    const {rows:[events]}=await client.query("SELECT count(*)::integer AS received,count(*) FILTER(WHERE status='review')::integer AS review,count(*) FILTER(WHERE status='failed')::integer AS failed FROM up_private.webhook_events");
    const {rows:[jobs]}=await client.query("SELECT count(*) FILTER(WHERE status='failed')::integer AS failed,count(*) FILTER(WHERE status IN ('pending','running'))::integer AS pending FROM up_private.jobs");
    return {students:students.total,accesses,events,jobs};
  });}
  async function students(actorId,{search='',limit=25,offset=0}={}){return run(actorId,false,async client=>{
    const query=S.parse(S.text(254),search),size=Math.min(100,Math.max(1,Number(limit)||25)),skip=Math.max(0,Number(offset)||0);
    if(!Number.isInteger(size)||!Number.isInteger(skip)||skip>1000000)fail(400,'INVALID_PAGE','Página inválida.');
    const {rows}=await client.query(`SELECT u.id,u.name,u.email,u.status,u.created_at,
      coalesce((SELECT jsonb_agg(jsonb_build_object('id',e.id,'product',e.product_code,'status',e.status,'origin',e.origin,'orderId',e.order_id,'expiresAt',e.expires_at,'active',e.status='active' AND e.activated_at<=now() AND (e.expires_at IS NULL OR e.expires_at>now()))) FROM up.entitlements e WHERE e.user_id=u.id),'[]') AS accesses
      FROM up.users u WHERE u.platform_role='aluno' AND ($1='' OR u.email ILIKE $2 OR u.name ILIKE $2)
      ORDER BY u.created_at DESC,u.id LIMIT $3 OFFSET $4`,[query,'%'+query+'%',size+1,skip]);
    return {items:rows.slice(0,size),nextOffset:rows.length>size?skip+size:null};
  });}
  async function grant(actorId,input,key){
    const data=S.parse(S.z.strictObject({email:S.text(254),name:S.text(120).min(2).default('Aluno UP'),product,duration:durationSchema,reason:reasonSchema}),input);
    data.email=normalizeEmail(data.email);if(!validEmail(data.email))fail(400,'INVALID_EMAIL','Informe um e-mail válido.');
    return run(actorId,false,client=>idempotent(client,actorId,'admin.grant',key,data,async()=>{
      await client.query('INSERT INTO up.users(email,name) VALUES($1,$2) ON CONFLICT(email) DO NOTHING',[data.email,data.name]);
      const {rows:[student]}=await client.query("SELECT id,status,platform_role FROM up.users WHERE email=$1 FOR UPDATE",[data.email]);
      if(student.platform_role!=='aluno'||student.status!=='active')fail(409,'ACCOUNT_UNAVAILABLE','Esta conta não pode receber uma liberação de aluno.');
      const expires=accessExpiresAt(data.duration,now());
      const source='manual:'+actorId+':'+key;
      const {rows:[row]}=await client.query("INSERT INTO up.entitlements(user_id,product_code,status,origin,source_ref,activated_at,expires_at) VALUES($1,$2,'active','manual',$3,$4,$5) RETURNING id,user_id,product_code,status,expires_at",[student.id,data.product,source,new Date(now()),expires]);
      await client.query("INSERT INTO up_private.jobs(job_key,kind,payload) VALUES($1,'email',$2) ON CONFLICT(job_key) DO NOTHING",[source,JSON.stringify({userId:student.id,template:'access',product:data.product})]);
      await audit(client,actorId,'access.grant','entitlement',row.id,data.reason,{userId:student.id,product:data.product,duration:data.duration});return row;
    }));
  }
  async function revoke(actorId,grantId,input){
    S.parse(UUID,grantId);const data=S.parse(S.z.strictObject({reason:reasonSchema}),input);
    return run(actorId,false,async client=>{
      const {rows:[row]}=await client.query("UPDATE up.entitlements e SET status='revoked',ended_at=$2,updated_at=$2 WHERE e.id=$1 AND EXISTS(SELECT 1 FROM up.users u WHERE u.id=e.user_id AND u.platform_role='aluno') RETURNING e.id,e.user_id,e.product_code",[grantId,new Date(now())]);
      if(!row)fail(404,'NOT_FOUND','Acesso não encontrado.');
      await audit(client,actorId,'access.revoke','entitlement',grantId,data.reason,{userId:row.user_id,product:row.product_code});return {ok:true};
    });
  }
  async function correctEmail(actorId,studentId,input){
    S.parse(UUID,studentId);const data=S.parse(S.z.strictObject({email:S.text(254),reason:reasonSchema}),input);data.email=normalizeEmail(data.email);
    if(!validEmail(data.email))fail(400,'INVALID_EMAIL','Informe um e-mail válido.');
    try{return await run(actorId,false,async client=>{
      const {rows:[student]}=await client.query("SELECT id,email FROM up.users WHERE id=$1 AND platform_role='aluno' AND status='active' FOR UPDATE",[studentId]);
      if(!student)fail(404,'NOT_FOUND','Aluno não encontrado.');
      await client.query('UPDATE up.users SET email=$2,updated_at=now() WHERE id=$1',[studentId,data.email]);
      await client.query('DELETE FROM up_private.login_codes WHERE user_id=$1',[studentId]);
      await client.query('UPDATE up_private.sessions SET revoked_at=$2 WHERE user_id=$1 AND revoked_at IS NULL',[studentId,new Date(now())]);
      await audit(client,actorId,'student.correct_email','user',studentId,data.reason);return {ok:true};
    });}catch(error){if(error.code==='23505')fail(409,'EMAIL_ALREADY_USED','Este e-mail já pertence a outra conta. As contas não foram mescladas.');throw error;}
  }
  async function productMap(actorId){return run(actorId,true,async client=>(await client.query('SELECT kiwify_product_id,product_code,enabled FROM up_private.kiwify_product_map ORDER BY product_code,kiwify_product_id')).rows);}
  async function saveProduct(actorId,input){
    const data=S.parse(S.z.strictObject({externalId:S.text(254).min(1),product,enabled:S.z.boolean().default(true),reason:reasonSchema}),input);
    return run(actorId,true,async client=>{await client.query('INSERT INTO up_private.kiwify_product_map(kiwify_product_id,product_code,enabled) VALUES($1,$2,$3) ON CONFLICT(kiwify_product_id) DO UPDATE SET product_code=EXCLUDED.product_code,enabled=EXCLUDED.enabled,updated_at=now()',[data.externalId,data.product,data.enabled]);await audit(client,actorId,'product.map','product',data.externalId,data.reason,{product:data.product,enabled:data.enabled});return {ok:true};});
  }
  async function events(actorId,{limit=50,offset=0}={}){return run(actorId,true,async client=>{
    const size=Math.min(100,Math.max(1,Number(limit)||50)),skip=Math.max(0,Number(offset)||0);if(!Number.isInteger(size)||!Number.isInteger(skip)||skip>1000000)fail(400,'INVALID_PAGE','Página inválida.');
    const {rows}=await client.query('SELECT id,order_id,event_type,status,received_at,processed_at,error_code FROM up_private.webhook_events ORDER BY received_at DESC,id LIMIT $1 OFFSET $2',[size+1,skip]);return {items:rows.slice(0,size),nextOffset:rows.length>size?skip+size:null};
  });}
  async function reprocess(actorId,eventId,input){S.parse(UUID,eventId);const data=S.parse(S.z.strictObject({reason:reasonSchema}),input);await run(actorId,true,async()=>{});if(!billing)fail(503,'WEBHOOK_UNAVAILABLE','Recebimento de eventos indisponível.');return billing.reprocess(eventId,actorId,data.reason);}
  async function settings(actorId){return run(actorId,true,async client=>Object.fromEntries((await client.query('SELECT key,value FROM up_private.settings WHERE key=ANY($1::text[]) ORDER BY key',[settingKeys])).rows.map(r=>[r.key,r.value])));}
  async function saveSettings(actorId,input){
    const data=S.parse(S.z.strictObject({kitPurchaseUrl:link,supportUrl:link,supportEmail:S.z.union([S.z.literal(''),S.z.email()]),kiwifyFields:mappingSchema,
      access:S.z.strictObject({front:durationSchema,essencial:durationSchema,kit:durationSchema}),reason:reasonSchema}),input);
    for(const field of Object.values(data.kiwifyFields))if(!/^[A-Za-z0-9_]+(\.[A-Za-z0-9_]+){0,7}$/.test(field)||field.split('.').some(x=>['__proto__','constructor','prototype'].includes(x)))fail(400,'INVALID_MAPPING','Confira os nomes dos campos do webhook.');
    return run(actorId,true,async client=>{
      const pairs=[['kit.purchase_url',data.kitPurchaseUrl],['support.url',data.supportUrl],['support.email',data.supportEmail],['kiwify.fields',data.kiwifyFields],...Object.entries(data.access).map(([p,value])=>['access.duration.'+p,value])];
      for(const [key,value]of pairs)await client.query('INSERT INTO up_private.settings(key,value,updated_by) VALUES($1,$2,$3) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,version=up_private.settings.version+1,updated_by=EXCLUDED.updated_by,updated_at=now()',[key,JSON.stringify(value),actorId]);
      await audit(client,actorId,'settings.update','settings',null,data.reason);return {ok:true};
    });
  }
  async function publicInfo(){return db.internal(async client=>{const rows=(await client.query("SELECT key,value FROM up_private.settings WHERE key IN ('kit.purchase_url','support.url','support.email')")).rows;const values=Object.fromEntries(rows.map(r=>[r.key,r.value]));const safe=(schema,value)=>{const result=schema.safeParse(value);return result.success?result.data:'';};return {kitPurchaseUrl:safe(link,values['kit.purchase_url']),supportUrl:safe(link,values['support.url']),supportEmail:safe(S.z.email(),values['support.email'])};});}
  return {overview,students,grant,revoke,correctEmail,productMap,saveProduct,events,reprocess,settings,saveSettings,publicInfo};
}
module.exports={createAdmin};
