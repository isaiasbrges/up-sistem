'use strict';
const {createHash}=require('node:crypto');
const {isIP}=require('node:net');
const S=require('../../shared/schemas');
const {fail}=require('../../shared/errors');
const {requireStaff}=require('../../shared/staff');
const {idempotent}=require('../resources/repository');
const version=S.z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/);
const reason=S.text(1000).min(5);
const hash=body=>createHash('sha256').update(body,'utf8').digest('hex');
const audit=(c,actor,action,meta,why)=>c.query('INSERT INTO up_private.audit_events(actor_id,action,target_type,reason,metadata) VALUES($1,$2,\'legal\',$3,$4)',[actor,action,why,JSON.stringify(meta)]);
function createLegal({db,required=false,now=Date.now}){
  async function status(userId,role='aluno',bodies=true){
    return db.internal(async client=>{
      const {rows:[row]}=await client.query(`SELECT p.terms_version,p.privacy_version,p.published_by,p.revision,c.accepted_at,
        t.title AS terms_title,t.digest AS terms_digest,r.title AS privacy_title,r.digest AS privacy_digest,
        ${bodies?'t.body AS terms_body,r.body AS privacy_body':'NULL::text AS terms_body,NULL::text AS privacy_body'}
        FROM up_private.legal_publication p JOIN up_private.legal_documents t ON t.kind='terms' AND t.version=p.terms_version
        JOIN up_private.legal_documents r ON r.kind='privacy' AND r.version=p.privacy_version
        LEFT JOIN up.consents c ON c.user_id=$1 AND c.terms_version=p.terms_version AND c.privacy_version=p.privacy_version
          AND c.terms_digest=t.digest AND c.privacy_digest=r.digest WHERE p.singleton`,[userId]);
      const available=!!row&&(!required||!!row.published_by),must=role==='aluno'&&(required||!!row);
      return {required:must,available,accepted:!must||(available&&!!row.accepted_at),acceptedAt:row?.accepted_at||null,revision:row?.revision||0,
        documents:available?{terms:{version:row.terms_version,title:row.terms_title,body:row.terms_body,digest:row.terms_digest},privacy:{version:row.privacy_version,title:row.privacy_title,body:row.privacy_body,digest:row.privacy_digest}}:null};
    });
  }
  async function assertAccepted(userId,role){const state=await status(userId,role,false);if(state.required&&!state.available)fail(503,'LEGAL_UNAVAILABLE','Os termos de acesso ainda estão sendo preparados. Consulte o suporte.');if(state.required&&!state.accepted)fail(403,'CONSENT_REQUIRED','Leia e aceite os termos e a política de privacidade para continuar.');}
  async function accept(userId,input,{ip,userAgent}={}){
    const data=S.parse(S.z.strictObject({termsVersion:version,privacyVersion:version,termsAccepted:S.z.literal(true),privacyAccepted:S.z.literal(true)}),input);
    return db.internal(async client=>{
      const {rows:[user]}=await client.query("SELECT id FROM up.users WHERE id=$1 AND status='active'",[userId]);if(!user)fail(401,'UNAUTHENTICATED','Entre novamente para continuar.');
      const {rows:[p]}=await client.query(`SELECT p.*,t.digest AS terms_digest,r.digest AS privacy_digest FROM up_private.legal_publication p
        JOIN up_private.legal_documents t ON t.kind='terms' AND t.version=p.terms_version JOIN up_private.legal_documents r ON r.kind='privacy' AND r.version=p.privacy_version WHERE p.singleton FOR SHARE OF p`);
      if(!p||(required&&!p.published_by))fail(503,'LEGAL_UNAVAILABLE','Os termos de acesso ainda estão sendo preparados.');
      if(p.terms_version!==data.termsVersion||p.privacy_version!==data.privacyVersion)fail(409,'LEGAL_VERSION_CHANGED','Os documentos foram atualizados. Recarregue para ler as versões atuais.');
      const result=await client.query(`INSERT INTO up.consents(user_id,terms_version,privacy_version,terms_digest,privacy_digest,accepted_at,ip,user_agent)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING RETURNING accepted_at`,[userId,p.terms_version,p.privacy_version,p.terms_digest,p.privacy_digest,new Date(now()),isIP(ip||'')?ip:null,String(userAgent||'').slice(0,500)]);
      if(result.rowCount)await audit(client,userId,'legal.accept',{termsVersion:p.terms_version,privacyVersion:p.privacy_version},'Aceite expresso do titular.');
      return {ok:true,termsVersion:p.terms_version,privacyVersion:p.privacy_version};
    });
  }
  async function list(actorId){return db.internal(async c=>{await requireStaff(c,actorId);const documents=(await c.query('SELECT kind,version,title,digest,created_at FROM up_private.legal_documents ORDER BY created_at DESC,kind,version LIMIT 100')).rows;const publication=(await c.query('SELECT terms_version,privacy_version,revision,published_at FROM up_private.legal_publication WHERE singleton')).rows[0]||null;return {documents,publication};});}
  async function save(actorId,input,key){
    const data=S.parse(S.z.strictObject({kind:S.z.enum(['terms','privacy']),version,title:S.text(200).min(1),body:S.z.string().min(1).max(100000).refine(v=>v.trim().length>0),reason}),input);
    try{return await db.internal(async c=>{await requireStaff(c,actorId);return idempotent(c,actorId,'legal.document',key,data,async()=>{
      await c.query('INSERT INTO up_private.legal_documents(kind,version,title,body,digest,created_by) VALUES($1,$2,$3,$4,$5,$6)',[data.kind,data.version,data.title,data.body,hash(data.body),actorId]);
      await audit(c,actorId,'legal.document',{kind:data.kind,version:data.version,digest:hash(data.body)},data.reason);return {kind:data.kind,version:data.version,digest:hash(data.body)};
    });});}catch(error){if(error.code==='23505')fail(409,'LEGAL_VERSION_EXISTS','Esta versão já existe. Crie outra versão para preservar os aceites anteriores.');throw error;}
  }
  async function publish(actorId,input,key){
    const data=S.parse(S.z.strictObject({termsVersion:version,privacyVersion:version,expectedRevision:S.z.number().int().min(0),approved:S.z.literal(true),reason}),input);
    return db.internal(async c=>{await requireStaff(c,actorId);return idempotent(c,actorId,'legal.publish',key,data,async()=>{
      await c.query('SELECT pg_advisory_xact_lock(58024005)');
      const previous=(await c.query('SELECT revision FROM up_private.legal_publication WHERE singleton FOR UPDATE')).rows[0];
      if((previous?.revision||0)!==data.expectedRevision)fail(409,'VERSION_CONFLICT','A publicação mudou em outra sessão. Recarregue antes de publicar.');
      const {rows}=await c.query("SELECT kind,version FROM up_private.legal_documents WHERE (kind='terms' AND version=$1) OR (kind='privacy' AND version=$2)",[data.termsVersion,data.privacyVersion]);
      if(rows.length!==2)fail(400,'LEGAL_DOCUMENT_MISSING','Selecione uma versão existente de cada documento.');
      const {rows:[publication]}=await c.query(`INSERT INTO up_private.legal_publication(terms_version,privacy_version,published_by,published_at) VALUES($1,$2,$3,$4)
        ON CONFLICT(singleton) DO UPDATE SET terms_version=EXCLUDED.terms_version,privacy_version=EXCLUDED.privacy_version,published_by=EXCLUDED.published_by,published_at=EXCLUDED.published_at,revision=up_private.legal_publication.revision+1 RETURNING revision`,[data.termsVersion,data.privacyVersion,actorId,new Date(now())]);
      await c.query('INSERT INTO up_private.legal_publication_history(terms_version,privacy_version,published_by,published_at) VALUES($1,$2,$3,$4)',[data.termsVersion,data.privacyVersion,actorId,new Date(now())]);
      await audit(c,actorId,'legal.publish',{termsVersion:data.termsVersion,privacyVersion:data.privacyVersion,revision:publication.revision},data.reason);return {ok:true,...publication};
    });});
  }
  return {status,assertAccepted,accept,list,save,publish};
}
module.exports={createLegal,hash};
