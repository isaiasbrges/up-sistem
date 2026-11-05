'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {loadMailConfig}=require('../server/config');
const {createMailer}=require('../server/integrations/mail');
const nodemailer=require('nodemailer');
const env=extra=>({SMTP_PROVIDER:'hostinger',SMTP_USER:'acesso@example.com',SMTP_PASSWORD:'senha-ficticia-apenas-teste',...extra});
function fixture(extra={}){
  let options,verified=0,closed=0;const sent=[];
  const mailer=createMailer({config:loadMailConfig(env(extra)),appOrigin:'https://up.example.com',createTransport:input=>{
    options=input;return {verify:async()=>{verified++;return true;},close:()=>{closed++;},sendMail:async message=>{sent.push(message);return {accepted:[message.to]};}};
  }});
  return {mailer,sent,get options(){return options;},get verified(){return verified;},get closed(){return closed;}};
}
test('Hostinger usa caixa completa, TLS 465 e remetente do UP por padrão',()=>{
  const config=loadMailConfig(env());
  assert.equal(config.host,'smtp.hostinger.com');assert.equal(config.port,465);
  assert.equal(config.from,'UP Software <acesso@example.com>');
  assert.throws(()=>loadMailConfig(env({SMTP_USER:'acesso'})),{code:'CONFIGURATION_ERROR'});
  assert.throws(()=>loadMailConfig(env({SMTP_PASSWORD:''})),{code:'CONFIGURATION_ERROR'});
  assert.throws(()=>loadMailConfig(env({SMTP_PORT:'25'})),{code:'CONFIGURATION_ERROR'});
});
test('SMTP valida remetente único e impede cabeçalhos injetados',()=>{
  for(const from of ['a@example.com, b@example.com','a@example.com, UP <b@example.com>','UP <a@example.com>\r\nBcc: other@example.com','UP <invalid>']){
    assert.throws(()=>loadMailConfig(env({MAIL_FROM:from})),{code:'CONFIGURATION_ERROR'});
  }
  assert.equal(loadMailConfig(env({MAIL_FROM:'UP Software <avisos@example.com>'})).from,'UP Software <avisos@example.com>');
  assert.throws(()=>loadMailConfig(env({SMTP_HOST:'smtp://example.com'})),{code:'CONFIGURATION_ERROR'});
});
test('transporte 465 valida certificado, exige TLS moderno e mantém logs desligados',async()=>{
  const f=fixture();
  assert.equal(f.options.secure,true);assert.equal(f.options.logger,false);assert.equal(f.options.debug,false);
  assert.deepEqual(f.options.tls,{minVersion:'TLSv1.2',rejectUnauthorized:true});
  assert.equal(f.options.disableFileAccess,true);assert.equal(f.options.disableUrlAccess,true);
  await f.mailer.verify();assert.equal(f.verified,1);assert.equal(f.sent.length,0);
  f.mailer.close();assert.equal(f.closed,1);
});
test('alternativa 587 exige STARTTLS e preserva autenticação SMTP',()=>{
  const f=fixture({SMTP_PORT:'587'});
  assert.equal(f.options.secure,false);assert.equal(f.options.requireTLS,true);
  assert.deepEqual(f.options.auth,{user:'acesso@example.com',pass:'senha-ficticia-apenas-teste'});
});
test('mesmo e-mail explica acesso e recuperação sem senha, sem expor segredo SMTP',async()=>{
  const f=fixture();await f.mailer.sendCode('aluno@example.com','001234');
  assert.equal(f.sent.length,1);const message=f.sent[0];
  assert.equal(message.to,'aluno@example.com');assert.match(message.text,/001234/);
  assert.match(message.text,/10 minutos/);assert.match(message.text,/recuperar seu acesso/);
  assert.doesNotMatch(JSON.stringify(message),/senha-ficticia/);
  await assert.rejects(f.mailer.sendCode('aluno@example.com','123'),{code:'MAIL_CODE_INVALID'});
  await assert.rejects(f.mailer.sendCode('one@example.com,two@example.com','123456'),{code:'MAIL_RECIPIENT_INVALID'});
  assert.equal(f.sent.length,1);
});
test('avisos preservam link do aplicativo e identificador estável para repetição da tarefa',async()=>{
  const f=fixture();
  for(let i=0;i<2;i++)await f.mailer.sendNotice({to:'aluno@example.com',name:'João',template:'reminder',key:'test:checkin:1'});
  assert.equal(f.sent[0].messageId,f.sent[1].messageId);
  assert.match(f.sent[0].text,/https:\/\/up\.example\.com\/entrar#\/plan/);
  assert.doesNotMatch(f.sent[0].messageId,/checkin/);
  await assert.rejects(f.mailer.sendNotice({template:'unknown'}),{code:'MAIL_TEMPLATE_UNKNOWN'});
});
test('Nodemailer gera mensagem MIME real com conteúdo UTF-8 e código preservado',async()=>{
  let generated;
  const mailer=createMailer({config:loadMailConfig(env()),appOrigin:'https://up.example.com',createTransport:()=>{
    const stream=nodemailer.createTransport({streamTransport:true,buffer:true,newline:'unix'});
    return {verify:async()=>true,close:()=>stream.close(),sendMail:async message=>{generated=await stream.sendMail(message);}};
  }});
  await mailer.sendCode('aluno@example.com','012345');
  assert.deepEqual(generated.envelope,{from:'acesso@example.com',to:['aluno@example.com']});
  const mime=generated.message.toString();assert.match(mime,/Content-Type: text\/plain; charset=utf-8/);
  assert.match(mime,/012345/);assert.doesNotMatch(mime,/senha-ficticia/);mailer.close();
});
test('caixa local não pode ser ativada em produção e serviço customizado exige servidor',()=>{
  assert.throws(()=>loadMailConfig({NODE_ENV:'production',DEV_MAILBOX:'true'}),{code:'CONFIGURATION_ERROR'});
  assert.equal(loadMailConfig({DEV_MAILBOX:'true'}).localInbox,true);
  assert.throws(()=>loadMailConfig(env({SMTP_PROVIDER:'custom'})),{code:'CONFIGURATION_ERROR'});
  assert.equal(loadMailConfig(env({SMTP_PROVIDER:'custom',SMTP_HOST:'smtp.titan.email',MAIL_FROM:'UP <acesso@example.com>'})).host,'smtp.titan.email');
});

test('código tem template HTML compatível e alternativa textual, sem expor o OTP no link',async()=>{
 const f=fixture();await f.mailer.sendCode('aluno@example.com','001234');const m=f.sent[0];
 assert.equal(typeof m.html,'string');assert.match(m.html,/<html[^>]+lang="pt-BR"/);assert.match(m.html,/role="presentation"/);
 assert.match(m.html,/001234/);assert.match(m.html,/10 minutos/);assert.match(m.html,/uma vez/);assert.match(m.html,/https:\/\/up\.example\.com\/entrar/);
 assert.match(m.text,/001234/);assert.doesNotMatch(m.html,/<script|onclick=|navigator\.clipboard|href="[^"]*001234|Copiar código/i);
 assert.match(m.html,/#FF8D00/i);assert.match(m.html,/#0031E8/i);assert.match(m.html,/#F7F3EE/i);assert.match(m.html,/#0D0D0D/i);
});

test('avisos HTML escapam nomes e conteúdo e preservam destino e identificador',async()=>{
 const f=fixture();await f.mailer.sendNotice({to:'aluno@example.com',name:'<img src=x onerror=alert(1)> & João',template:'access',product:'kit',key:'access:sample'});
 const m=f.sent[0];assert.match(m.html,/&lt;img src=x onerror=alert\(1\)&gt; &amp; João/);assert.doesNotMatch(m.html,/<img src=x/);assert.match(m.html,/Kit UP Completo/);assert.match(m.html,/Acessar a plataforma/);assert.match(m.text,/Kit UP Completo/);assert.ok(m.messageId);
});

test('mensagem MIME envia partes HTML e texto sem depender de imagens remotas',async()=>{
 let generated;const mailer=createMailer({config:loadMailConfig(env()),appOrigin:'https://up.example.com',createTransport:()=>{
  const stream=nodemailer.createTransport({streamTransport:true,buffer:true,newline:'unix'});return {verify:async()=>true,close(){},sendMail:async m=>{generated=await stream.sendMail(m);}};
 }});
 await mailer.sendCode('aluno@example.com','000123');const mime=generated.message.toString();assert.match(mime,/multipart\/alternative/);assert.match(mime,/Content-Type: text\/html; charset=utf-8/);assert.match(mime,/Content-Type: text\/plain; charset=utf-8/);assert.match(mime,/000123/);assert.doesNotMatch(mime,/senha-ficticia/);
});
