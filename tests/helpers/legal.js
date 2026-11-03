'use strict';
const {createHash,randomUUID}=require('node:crypto');
async function seedLegal(owner){
  const {rows:[actor]}=await owner.query("INSERT INTO up.users(email,name,platform_role) VALUES($1,'Responsável fictício','admin') RETURNING id",['legal-'+randomUUID()+'@example.test']);
  for(const kind of ['terms','privacy']){
    const body='Documento fictício exclusivo de testes automatizados. Não constitui contrato ou política para uso real.';
    await owner.query('INSERT INTO up_private.legal_documents(kind,version,title,body,digest,created_by) VALUES($1,$2,$3,$4,$5,$6)',[kind,'test-v1',kind==='terms'?'Termos de teste':'Privacidade de teste',body,createHash('sha256').update(body).digest('hex'),actor.id]);
  }
  await owner.query("INSERT INTO up_private.legal_publication(terms_version,privacy_version,published_by) VALUES('test-v1','test-v1',$1)",[actor.id]);
  return {actorId:actor.id,termsVersion:'test-v1',privacyVersion:'test-v1',termsAccepted:true,privacyAccepted:true};
}
module.exports={seedLegal};
