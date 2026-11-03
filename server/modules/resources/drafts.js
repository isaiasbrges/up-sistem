'use strict';
const S=require('../../shared/schemas');
const {fail}=require('../../shared/errors');
const {permission}=require('./repository');
function createDrafts({db}) {
  async function load(userId) {
    return db.asUser(userId,async client=>{
      await permission(client,'front');
      const {rows}=await client.query('SELECT resource,data,step,version FROM up.user_drafts WHERE user_id=$1',[userId]);
      return Object.fromEntries(['diagnostic','finance'].map(key=>{const row=rows.find(r=>r.resource===key);return [key,row?{data:row.data,step:row.step,version:row.version}:{data:{},step:0,version:0}];}));
    });
  }
  async function save(userId,resource,input) {
    if(!['diagnostic','finance'].includes(resource))fail(404,'NOT_FOUND','Rascunho não encontrado.');
    const body=S.parse(S.z.strictObject({data:S.z.record(S.z.string(),S.z.unknown()),step:S.z.number().int().min(0).max(resource==='diagnostic'?2:5),version:S.z.number().int().min(0)}),input);
    S.parse(resource==='diagnostic'?S.diagnosticDraft:S.financeDraft,body.data);
    return db.asUser(userId,async client=>{
      await permission(client,'front');
      await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,3))',[userId+':'+resource]);
      const {rows:[old]}=await client.query('SELECT version FROM up.user_drafts WHERE user_id=$1 AND resource=$2 FOR UPDATE',[userId,resource]);
      if((old?.version||0)!==body.version)fail(409,'VERSION_CONFLICT','Este rascunho foi alterado em outra janela. Recarregue antes de salvar.');
      const {rows:[row]}=await client.query(`INSERT INTO up.user_drafts(user_id,resource,data,step) VALUES($1,$2,$3,$4)
        ON CONFLICT(user_id,resource) DO UPDATE SET data=EXCLUDED.data,step=EXCLUDED.step,version=up.user_drafts.version+1,updated_at=now()
        RETURNING version`,[userId,resource,JSON.stringify(body.data),body.step]);
      return {ok:true,version:row.version};
    });
  }
  return {load,save};
}
module.exports={createDrafts};
