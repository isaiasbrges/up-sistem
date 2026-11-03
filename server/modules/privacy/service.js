'use strict';
const S=require('../../shared/schemas');
const {fail}=require('../../shared/errors');
const {requireStaff}=require('../../shared/staff');
const {takeLimit}=require('../identity/service');
const audit=(c,actor,action,target,reason)=>c.query('INSERT INTO up_private.audit_events(actor_id,action,target_type,target_id,reason) VALUES($1,$2,\'privacy\',$3,$4)',[actor,action,target,reason]);
function createPrivacy({db,now=Date.now}){
  async function list(userId){return db.asUser(userId,async c=>({requests:(await c.query('SELECT id,kind,status,reason,resolution_note,created_at,completed_at FROM up.privacy_requests WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT 20',[userId])).rows}));}
  async function exportData(userId){
    const limit=await db.internal(c=>takeLimit(c,'privacy:export:'+userId,3,900000,now()));
    if(!limit.allowed)fail(429,'RATE_LIMITED','Aguarde antes de exportar novamente.',{retryAfter:limit.retryAfter});
    const {rows:[row]}=await db.asUser(userId,c=>c.query('SELECT up_private.export_personal_data() AS data'));
    if(!row?.data)fail(401,'UNAUTHENTICATED','Entre novamente para exportar seus dados.');
    await db.internal(c=>audit(c,userId,'privacy.export',userId,'Exportação solicitada pelo titular.'));
    return row.data;
  }
  async function requestDeletion(userId,input){
    const data=S.parse(S.z.strictObject({confirmed:S.z.literal(true),reason:S.text(1000).default('')}),input);
    return db.internal(async c=>{
      const {rows:[user]}=await c.query("SELECT platform_role FROM up.users WHERE id=$1 AND status='active' FOR UPDATE",[userId]);
      if(!user||user.platform_role!=='aluno')fail(403,'STUDENT_REQUIRED','Solicitação disponível para a conta do aluno.');
      const {rows:[existing]}=await c.query("SELECT id,kind,status,reason,created_at FROM up.privacy_requests WHERE user_id=$1 AND kind='delete' AND status IN ('pending','processing')",[userId]);if(existing)return existing;
      const {rows:[row]}=await c.query("INSERT INTO up.privacy_requests(user_id,kind,reason) VALUES($1,'delete',$2) RETURNING id,kind,status,reason,created_at",[userId,data.reason]);
      await audit(c,userId,'privacy.delete_request',row.id,'Solicitação de exclusão feita pelo titular.');return row;
    });
  }
  async function cancel(userId,requestId){
    S.parse(S.z.uuid(),requestId);
    return db.internal(async c=>{
      const {rows:[row]}=await c.query("SELECT status FROM up.privacy_requests WHERE id=$1 AND user_id=$2 AND kind='delete' FOR UPDATE",[requestId,userId]);
      if(!row)fail(404,'NOT_FOUND','Solicitação não encontrada.');
      if(row.status==='cancelled')return {ok:true};
      if(row.status!=='pending')fail(409,'PRIVACY_IN_PROGRESS','O atendimento desta solicitação já começou. Fale com o suporte.');
      await c.query("UPDATE up.privacy_requests SET status='cancelled',completed_at=$2,updated_at=$2,resolution_note='Cancelada pelo titular.' WHERE id=$1",[requestId,new Date(now())]);
      await audit(c,userId,'privacy.cancel',requestId,'Cancelamento solicitado pelo titular.');return {ok:true};
    });
  }
  async function staffList(actorId,{offset=0}={}){return db.internal(async c=>{
    await requireStaff(c,actorId,false);const skip=Number(offset);if(!Number.isInteger(skip)||skip<0||skip>1000000)fail(400,'INVALID_PAGE','Página inválida.');
    const {rows}=await c.query(`SELECT p.id,p.kind,p.status,p.reason,p.resolution_note,p.created_at,p.completed_at,u.name,u.email
      FROM up.privacy_requests p JOIN up.users u ON u.id=p.user_id WHERE u.platform_role='aluno' AND p.kind='delete'
      ORDER BY p.created_at DESC,p.id DESC LIMIT 26 OFFSET $1`,[skip]);return {items:rows.slice(0,25),nextOffset:rows.length>25?skip+25:null};
  });}
  async function start(actorId,requestId,input){
    S.parse(S.z.uuid(),requestId);const data=S.parse(S.z.strictObject({reason:S.text(1000).min(5)}),input);
    return db.internal(async c=>{await requireStaff(c,actorId,false);
      const {rows:[row]}=await c.query("SELECT id,status FROM up.privacy_requests WHERE id=$1 AND kind='delete' FOR UPDATE",[requestId]);
      if(!row)fail(404,'NOT_FOUND','Solicitação não encontrada.');
      if(row.status!=='pending')fail(409,'PRIVACY_NOT_PENDING','Esta solicitação não está mais pendente.');
      await c.query("UPDATE up.privacy_requests SET status='processing',handled_by=$2,updated_at=$3,resolution_note='Solicitação em atendimento pela equipe UP.' WHERE id=$1",[requestId,actorId,new Date(now())]);
      await audit(c,actorId,'privacy.start',requestId,data.reason);return {ok:true};
    });
  }
  return {list,exportData,requestDeletion,cancel,staffList,start};
}
module.exports={createPrivacy};
