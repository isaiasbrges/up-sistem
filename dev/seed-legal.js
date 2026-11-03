'use strict';
const {createHash}=require('node:crypto');
async function seedDevelopmentLegal(db){
  if(process.env.NODE_ENV==='production')throw Error('Documentos fictícios são exclusivos de desenvolvimento.');
  await db.internal(async c=>{
    if((await c.query('SELECT 1 FROM up_private.legal_publication WHERE singleton')).rowCount)return;
    const body='AMBIENTE LOCAL DE TESTES — SEM EFEITO CONTRATUAL\n\nEste documento fictício permite conferir a interface e o registro de aceite usando contas e dados de demonstração. Ele não representa os Termos de Uso nem a Política de Privacidade definitivos da UP.\n\nPara o lançamento, o responsável pela UP deverá cadastrar e publicar os documentos revisados e aprovados. Nenhuma credencial de e-mail deve ser informada neste formulário.';
    for(const [kind,title]of [['terms','Termos de teste local'],['privacy','Privacidade de teste local']])await c.query('INSERT INTO up_private.legal_documents(kind,version,title,body,digest) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[kind,'development-1',title,body,createHash('sha256').update(body).digest('hex')]);
    await c.query("INSERT INTO up_private.legal_publication(terms_version,privacy_version) VALUES('development-1','development-1')");
  });
}
module.exports={seedDevelopmentLegal};
