'use strict';
const crypto=require('node:crypto');
const S=require('../../shared/schemas');
const {fail}=require('../../shared/errors');
const {UUID}=require('../../db/connection');
const diagnosticLogic=require('../../../app/logic');
const financial=require('../finance/logic');
const stamp=value=>value instanceof Date?value.toISOString():value;
const day=value=>String(stamp(value)).slice(0,10);
const definitions={
  diagnostics:{table:'diagnostics',product:'front',sort:'created_at',schema:S.z.strictObject({input:S.diagnostic}),immutable:true,
    dto:r=>({id:r.id,date:stamp(r.created_at),created:day(r.created_at),kind:r.kind,input:r.input,result:r.result,ruleVersion:r.rule_version})},
  finances:{table:'finance_snapshots',product:'front',sort:'month',schema:S.z.strictObject({month:S.month,input:S.finance}),
    dto:r=>({id:r.id,month:r.month.slice(0,7),date:stamp(r.created_at),created:day(r.created_at),source:r.source,input:r.input,result:r.result,version:r.version})},
  transactions:{table:'kit_transactions',product:'essencial',sort:'date',schema:S.transaction,softDelete:true,
    dto:r=>({id:r.id,date:r.date,desc:r.description,value:r.value,type:r.type,category:r.category,scope:r.scope,version:r.version})},
  bills:{table:'kit_bills',product:'essencial',sort:'due',schema:S.bill,softDelete:true,
    dto:r=>({id:r.id,desc:r.description,value:r.value,due:r.due,paid:r.paid,version:r.version})},
  debts:{table:'debts',product:'essencial',sort:'created_at',schema:S.debt.omit({id:true}),
    dto:r=>({id:r.id,creditor:r.creditor,scope:r.scope,balance:r.balance,payment:r.payment,rate:r.rate,overdue:r.overdue,version:r.version})},
  offers:{table:'offers',product:'kit',sort:'created_at',schema:S.offer,
    dto:r=>({...r.data,id:r.id,saved:day(r.updated_at),version:r.version})},
  plans:{table:'plans_90',product:'kit',sort:'created_at',schema:S.plan,
    dto:r=>({...r.data,id:r.id,created:day(r.created_at),version:r.version})},
  checkins:{table:'weekly_checkins',product:'kit',sort:'created_at',schema:S.checkin.extend({planId:S.z.uuid()}),immutable:true,
    dto:r=>({id:r.id,date:day(r.created_at),answers:r.answers,planId:r.plan_id})},
  procedures:{table:'procedures',product:'kit',sort:'created_at',schema:S.procedure,
    dto:r=>({...r.data,id:r.id,created:day(r.created_at),version:r.version})}
};
const removable=new Set(['transactions','bills','debts','offers','procedures']);

function definition(name) {const d=definitions[name];if(!d)fail(404,'NOT_FOUND','Recurso não encontrado.');return d;}
function id(value) {if(!UUID.test(value||''))fail(404,'NOT_FOUND','Registro não encontrado.');return value;}
function version(value) {const n=Number(value);if(!Number.isSafeInteger(n)||n<1)fail(428,'VERSION_REQUIRED','Recarregue o registro antes de salvar.');return n;}
async function permission(client,product) {
  const {rows:[row]}=await client.query('SELECT up_private.has_product($1) AS allowed',[product]);
  if(!row.allowed)fail(403,'PRODUCT_REQUIRED','Seu acesso não inclui este recurso.');
}
function requestKey(key) {if(typeof key!=='string'||!/^[a-zA-Z0-9_-]{1,128}$/.test(key))fail(400,'IDEMPOTENCY_REQUIRED','Informe uma chave válida para confirmar esta operação.');return key;}
async function idempotent(client,userId,operation,key,data,write) {
  requestKey(key);
  const hash=crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[userId+':'+operation+':'+key]);
  const {rows:[previous]}=await client.query('SELECT request_hash,response FROM up_private.idempotency_keys WHERE user_id=$1 AND operation=$2 AND key=$3',[userId,operation,key]);
  if(previous){if(previous.request_hash!==hash)fail(409,'IDEMPOTENCY_CONFLICT','Esta operação já foi usada com outros dados.');return previous.response;}
  const response=await write();
  await client.query('INSERT INTO up_private.idempotency_keys(user_id,operation,key,request_hash,response) VALUES($1,$2,$3,$4,$5)',[userId,operation,key,hash,JSON.stringify(response)]);
  return response;
}
function translate(error) {
  if(error.code==='23505')fail(409,'ALREADY_EXISTS','Já existe um registro para este período ou finalidade. Recarregue para editar.');
  if(error.code==='23503')fail(400,'INVALID_REFERENCE','O registro relacionado não está disponível para esta conta.');
  if(error.code==='42501')fail(403,'FORBIDDEN','Esta operação não está disponível para sua conta.');
  throw error;
}

function createResources({db}) {
  async function run(userId,product,callback) {
    try {return await db.asUser(userId,async client=>{await permission(client,product);return callback(client);});}
    catch(error){return translate(error);}
  }
  async function list(userId,name,options={}) {
    const d=definition(name),limit=Math.min(100,Math.max(1,Number(options.limit)||50));
    if(!Number.isInteger(limit))fail(400,'INVALID_PAGE','Página inválida.');
    return run(userId,d.product,async client=>{
      const values=[userId];let where='user_id=$1';
      if(d.softDelete)where+=' AND deleted_at IS NULL';
      if(name==='plans')where+=' AND archived_at IS NULL';
      if(options.kind!==undefined){
        if(name!=='diagnostics'||!['initial','repeated'].includes(options.kind))fail(400,'INVALID_FILTER','Filtro inválido.');
        values.push(options.kind);where+=` AND kind=$${values.length}`;
      }
      if(options.month!==undefined){
        if(!['transactions','finances'].includes(name))fail(400,'INVALID_FILTER','Filtro de mês indisponível.');
        const selected=S.parse(S.month,options.month);values.push(selected+'-01');
        const column=name==='transactions'?'date':'month';
        where+=` AND ${column} >= $${values.length}::date AND ${column} < ($${values.length}::date + interval '1 month')`;
      }
      if(options.cursor){
        let cursor;try{if(options.cursor.length>300)throw Error();cursor=JSON.parse(Buffer.from(options.cursor,'base64url').toString());}catch{fail(400,'INVALID_CURSOR','Página inválida.');}
        if(!Array.isArray(cursor)||cursor.length!==2||typeof cursor[0]!=='string'||!UUID.test(cursor[1]||'')||!/^\d{4}-\d{2}-\d{2}(T[\d:.]+Z)?$/.test(cursor[0]))fail(400,'INVALID_CURSOR','Página inválida.');
        values.push(cursor[0],cursor[1]);where+=` AND (${d.sort},id) < ($${values.length-1},$${values.length})`;
      }
      values.push(limit+1);
      const {rows}=await client.query(`SELECT * FROM up.${d.table} WHERE ${where} ORDER BY ${d.sort} DESC,id DESC LIMIT $${values.length}`,values);
      const page=rows.slice(0,limit),last=page.at(-1);
      return {items:page.map(d.dto),nextCursor:rows.length>limit?Buffer.from(JSON.stringify([stamp(last[d.sort]),last.id])).toString('base64url'):null};
    });
  }
  async function get(userId,name,recordId) {
    const d=definition(name);id(recordId);
    return run(userId,d.product,async client=>{
      const {rows:[row]}=await client.query(`SELECT * FROM up.${d.table} WHERE user_id=$1 AND id=$2${d.softDelete?' AND deleted_at IS NULL':''}`,[userId,recordId]);
      if(!row)fail(404,'NOT_FOUND','Registro não encontrado.');return d.dto(row);
    });
  }
  async function create(userId,name,input,key) {
    const d=definition(name),data=S.parse(d.schema,input);
    return run(userId,d.product,client=>idempotent(client,userId,'create:'+name,key,data,async()=>{
      const recordId=crypto.randomUUID();let row;
      if(name==='diagnostics'){
        await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,1))',[userId]);
        const existing=await client.query('SELECT 1 FROM up.diagnostics WHERE user_id=$1 LIMIT 1',[userId]);
        const result=diagnosticLogic.diagnostic(data.input);
        ({rows:[row]}=await client.query('INSERT INTO up.diagnostics(id,user_id,kind,input,result,rule_version) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[recordId,userId,existing.rowCount?'repeated':'initial',JSON.stringify(data.input),JSON.stringify(result),financial.RULE_VERSION]));
      } else if(name==='finances'){
        const result=financial.finance(data.input);
        ({rows:[row]}=await client.query('INSERT INTO up.finance_snapshots(id,user_id,month,input,result,revenue,after_debt,rule_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[recordId,userId,data.month+'-01',JSON.stringify(data.input),JSON.stringify(result),result.revenue,result.afterDebt,financial.RULE_VERSION]));
      } else if(name==='transactions'){
        ({rows:[row]}=await client.query('INSERT INTO up.kit_transactions(id,user_id,date,description,value,type,category,scope) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[recordId,userId,data.date,data.desc,data.value,data.type,data.category,data.scope]));
      } else if(name==='bills'){
        ({rows:[row]}=await client.query('INSERT INTO up.kit_bills(id,user_id,description,value,due,paid,paid_at) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[recordId,userId,data.desc,data.value,data.due,data.paid,data.paid?new Date():null]));
      } else if(name==='debts'){
        ({rows:[row]}=await client.query('INSERT INTO up.debts(id,user_id,creditor,scope,balance,payment,rate,overdue) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[recordId,userId,data.creditor,data.scope,data.balance,data.payment,data.rate,data.overdue]));
      } else if(name==='checkins'){
        ({rows:[row]}=await client.query('INSERT INTO up.weekly_checkins(id,user_id,plan_id,answers) VALUES($1,$2,$3,$4) RETURNING *',[recordId,userId,data.planId,JSON.stringify(data.answers)]));
      } else if(name==='plans'){
        ({rows:[row]}=await client.query('INSERT INTO up.plans_90(id,user_id,data,reminder_day) VALUES($1,$2,$3,$4) RETURNING *',[recordId,userId,JSON.stringify(data),S.DAYS.indexOf(data.reminder)]));
      } else {
        ({rows:[row]}=await client.query(`INSERT INTO up.${d.table}(id,user_id,data) VALUES($1,$2,$3) RETURNING *`,[recordId,userId,JSON.stringify(data)]));
      }
      return d.dto(row);
    }));
  }
  async function update(userId,name,recordId,input,expectedVersion) {
    const d=definition(name);id(recordId);version(expectedVersion);
    if(d.immutable)fail(405,'IMMUTABLE','O histórico deste recurso não pode ser alterado.');
    const parsed=S.parse(d.schema.partial(),input);
    const patch=Object.fromEntries(Object.keys(input).map(key=>[key,parsed[key]]));
    return run(userId,d.product,async client=>{
      const {rows:[old]}=await client.query(`SELECT * FROM up.${d.table} WHERE user_id=$1 AND id=$2${d.softDelete?' AND deleted_at IS NULL':''} FOR UPDATE`,[userId,recordId]);
      if(!old)fail(404,'NOT_FOUND','Registro não encontrado.');
      if(old.version!==Number(expectedVersion))fail(409,'VERSION_CONFLICT','Este registro foi alterado em outra janela. Recarregue antes de salvar.');
      const previous=d.dto(old);
      const current=Object.fromEntries(Object.keys(d.schema.shape).filter(key=>Object.hasOwn(previous,key)).map(key=>[key,previous[key]]));
      const data=S.parse(d.schema,{...current,...patch});
      let fields,values;
      if(name==='finances'){
        if(data.month!==old.month.slice(0,7))fail(400,'IMMUTABLE_MONTH','Para outro mês, crie um novo Raio-X.');
        await client.query('INSERT INTO up.finance_snapshot_revisions(user_id,snapshot_id,version,input,result,rule_version) VALUES($1,$2,$3,$4,$5,$6)',[userId,recordId,old.version,JSON.stringify(old.input),JSON.stringify(old.result),old.rule_version]);
        const result=financial.finance(data.input);fields=['input','result','revenue','after_debt','rule_version'];values=[JSON.stringify(data.input),JSON.stringify(result),result.revenue,result.afterDebt,financial.RULE_VERSION];
      } else if(name==='transactions'){fields=['date','description','value','type','category','scope'];values=[data.date,data.desc,data.value,data.type,data.category,data.scope];}
      else if(name==='bills'){fields=['description','value','due','paid','paid_at'];values=[data.desc,data.value,data.due,data.paid,data.paid?(old.paid_at||new Date()):null];}
      else if(name==='debts'){fields=['creditor','scope','balance','payment','rate','overdue'];values=[data.creditor,data.scope,data.balance,data.payment,data.rate,data.overdue];}
      else if(name==='plans'){fields=['data','reminder_day'];values=[JSON.stringify(data),S.DAYS.indexOf(data.reminder)];}
      else {fields=['data'];values=[JSON.stringify(data)];}
      values.push(userId,recordId);
      const {rows:[row]}=await client.query(`UPDATE up.${d.table} SET ${fields.map((f,i)=>f+'=$'+(i+1)).join(',')},version=version+1,updated_at=now() WHERE user_id=$${values.length-1} AND id=$${values.length} RETURNING *`,values);
      return d.dto(row);
    });
  }
  async function remove(userId,name,recordId,expectedVersion) {
    const d=definition(name);id(recordId);version(expectedVersion);
    if(!removable.has(name))fail(405,'IMMUTABLE','Este histórico não pode ser excluído por esta operação.');
    return run(userId,d.product,async client=>{
      const {rows:[row]}=await client.query(`SELECT version FROM up.${d.table} WHERE user_id=$1 AND id=$2${d.softDelete?' AND deleted_at IS NULL':''} FOR UPDATE`,[userId,recordId]);
      if(!row)fail(404,'NOT_FOUND','Registro não encontrado.');
      if(row.version!==Number(expectedVersion))fail(409,'VERSION_CONFLICT','Este registro foi alterado. Recarregue antes de excluir.');
      if(d.softDelete)await client.query(`UPDATE up.${d.table} SET deleted_at=now(),version=version+1,updated_at=now() WHERE user_id=$1 AND id=$2`,[userId,recordId]);
      else await client.query(`DELETE FROM up.${d.table} WHERE user_id=$1 AND id=$2`,[userId,recordId]);
      return {ok:true};
    });
  }
  return {list,get,create,update,remove};
}
module.exports={createResources,definitions,idempotent,permission,version,requestKey};
