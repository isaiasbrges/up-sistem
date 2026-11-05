'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const {randomUUID,createHash}=require('node:crypto');
const nodemailer=require('nodemailer');
const {codeEmail,noticeEmail}=require('./mail-templates');
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function createMailer({config,appOrigin,directory=path.resolve(__dirname,'../../data/dev-mail'),createTransport=nodemailer.createTransport}){
  const transport=config.localInbox?null:createTransport({host:config.host,port:config.port,secure:config.port===465,requireTLS:config.port!==465,
    auth:{user:config.user,pass:config.password},tls:{minVersion:'TLSv1.2',rejectUnauthorized:true},
    logger:false,debug:false,disableFileAccess:true,disableUrlAccess:true,
    connectionTimeout:5000,greetingTimeout:5000,socketTimeout:10000});
  async function send({to,subject,text,html,key}){
    if(typeof to!=='string'||to.length>254||!(/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/).test(to))throw Object.assign(Error('Invalid recipient'),{code:'MAIL_RECIPIENT_INVALID'});
    if(config.localInbox){
      await fs.mkdir(directory,{recursive:true});
      await fs.writeFile(path.join(directory,randomUUID()+'.json'),JSON.stringify({to,subject,text,createdAt:new Date().toISOString()}),'utf8');
      return;
    }
    await transport.sendMail({from:config.from,to,subject,text,html,...(key?{messageId:'<'+createHash('sha256').update(key).digest('hex')+'@'+new URL(appOrigin).hostname+'>'}:{})});
  }
  async function sendCode(email,code){
    if(!/^\d{6}$/.test(String(code)))throw Object.assign(Error('Invalid access code'),{code:'MAIL_CODE_INVALID'});
    await send({to:email,subject:'Seu código de acesso ao Software UP',html:codeEmail({code,appOrigin}),text:`Seu código é ${code}. Ele vale por 10 minutos e pode ser usado uma vez.\n\nUse este código para entrar ou recuperar seu acesso. No UP Software, você não precisa criar nem redefinir uma senha.\n\nAcesse ${appOrigin}/entrar e informe o código acima.\n\nNão compartilhe este código com outras pessoas.\n\nSe não foi você, ignore este e-mail.\nUP Software`});
  }
  async function sendNotice({to,name,template,product,key}){
    const messages={welcome:{subject:'Bem-vindo ao Software UP',body:'Seu acesso ao Software UP está disponível. Use o e-mail cadastrado na plataforma para receber seu código e entrar.'},
      access:{subject:'Novo acesso liberado no Software UP',body:'Seu acesso a '+({front:'Diagnóstico e Raio-X',essencial:'Kit Essencial',kit:'Kit UP Completo'}[product]||'suas ferramentas')+' está disponível.'},
      reminder:{subject:'Seu check-in semanal no Software UP',body:'Reserve alguns minutos para revisar seu Plano de 90 Dias e registrar o que avançou nesta semana.'}};
    const message=messages[template];if(!message)throw Object.assign(Error('Template unavailable'),{code:'MAIL_TEMPLATE_UNKNOWN'});
    await send({to,subject:message.subject,html:noticeEmail({name,message:message.body,template,appOrigin}),text:`Olá, ${name}.\n\n${message.body}\n\nAcesse ${appOrigin}/entrar${template==='reminder'?'#/plan':''}\n\nUP Software`,key});
  }
  async function inboxPage(){
    if(!config.localInbox)throw Error('Development inbox disabled');
    await fs.mkdir(directory,{recursive:true});
    const names=(await fs.readdir(directory)).filter(x=>/^[a-f0-9-]+\.json$/.test(x));
    const messages=(await Promise.all(names.map(async name=>JSON.parse(await fs.readFile(path.join(directory,name),'utf8'))))).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,30);
    return '<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta http-equiv="refresh" content="5"><title>E-mails de teste UP</title><body><h1>E-mails de teste UP</h1><p>Caixa local para desenvolvimento. Nenhuma mensagem desta caixa foi enviada pela internet.</p>'+messages.map(m=>'<article><hr><h2>'+esc(m.subject)+'</h2><p>'+esc(m.to)+' · '+esc(m.createdAt)+'</p><pre>'+esc(m.text)+'</pre></article>').join('')+'</body></html>';
  }
  return {sendCode,sendNotice,inboxPage,verify:()=>transport?.verify()||Promise.resolve(true),close:()=>transport?.close()};
}
module.exports={createMailer};
