'use strict';
const {isIP}=require('node:net');
function configError(message){throw Object.assign(Error(message),{code:'CONFIGURATION_ERROR',publicMessage:message});}
function loadMailConfig(env=process.env){
  const required=name=>{if(!env[name]||/^(?:change|replace|your_|<|\[)/i.test(env[name]))configError('Configure '+name+' em um arquivo privado.');return env[name];};
  const localInbox=env.DEV_MAILBOX==='true';
  if(env.NODE_ENV==='production'&&localInbox)configError('A caixa de testes não pode ser ativada em produção.');
  if(localInbox)return {localInbox:true,from:'UP Software <teste@up.local>'};
  const provider=env.SMTP_PROVIDER||'custom';
  if(!['hostinger','custom'].includes(provider))configError('SMTP_PROVIDER deve ser hostinger ou custom.');
  const host=env.SMTP_HOST||(provider==='hostinger'?'smtp.hostinger.com':required('SMTP_HOST'));
  if(!/^[a-z0-9.-]+$/i.test(host)||host.startsWith('.')||host.includes('..'))configError('SMTP_HOST deve conter somente o nome do servidor.');
  const port=Number(env.SMTP_PORT||(provider==='hostinger'?465:587));
  if(![465,587].includes(port))configError('SMTP_PORT deve ser 465 (TLS) ou 587 (STARTTLS).');
  const user=required('SMTP_USER'),password=required('SMTP_PASSWORD');
  const email=/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;
  if(provider==='hostinger'&&!email.test(user))configError('SMTP_USER deve ser o endereço completo da caixa Hostinger.');
  const from=env.MAIL_FROM||(provider==='hostinger'?'UP Software <'+user+'>':required('MAIL_FROM'));
  const address=from.match(/^[^<>\r\n@,;]*<([^<>]+)>$/)?.[1]||from;
  if(from.length>320||/[\r\n]/.test(from)||!email.test(address))configError('MAIL_FROM deve conter um único remetente válido.');
  return {localInbox:false,provider,host,port,user,password,from};
}
function loadConfig(env=process.env){
  const production=env.NODE_ENV==='production';
  const required=name=>{if(!env[name]||/^(?:change|replace|your_|<|\[)/i.test(env[name]))configError('Configure '+name+' em um arquivo privado.');return env[name];};
  const port=Number(env.PORT||3000);if(!Number.isInteger(port)||port<1||port>65535)configError('PORT deve ser uma porta válida.');
  const origin=required('APP_ORIGIN');let url;try{url=new URL(origin);}catch{configError('APP_ORIGIN deve ser o endereço do aplicativo.');}
  if(url.username||url.password||url.search||url.hash||url.pathname!=='/'||!['http:','https:'].includes(url.protocol)||(production&&url.protocol!=='https:'))configError('APP_ORIGIN deve ser uma origem HTTPS em produção, sem caminho ou credenciais.');
  const authSecret=required('AUTH_SECRET');if(authSecret.length<32)configError('AUTH_SECRET precisa de pelo menos 32 caracteres aleatórios.');
  const db={appUrl:required('DATABASE_URL'),internalUrl:required('INTERNAL_DATABASE_URL')};
  for(const value of Object.values(db)){let parsed;try{parsed=new URL(value);}catch{configError('Confira os endereços privados do PostgreSQL.');}if(!['postgres:','postgresql:'].includes(parsed.protocol))configError('As conexões devem usar PostgreSQL.');}
  if(production&&env.MIGRATION_DATABASE_URL)configError('A credencial de migração não deve ser entregue ao processo da aplicação.');
  const secret=required('KIWIFY_WEBHOOK_SECRET');if(secret.length<32)configError('KIWIFY_WEBHOOK_SECRET precisa de um token longo e aleatório.');
  const encryptionKey=required('PAYLOAD_ENCRYPTION_KEY');if(Buffer.from(encryptionKey,'base64').length!==32)configError('PAYLOAD_ENCRYPTION_KEY deve conter 32 bytes em base64.');
  const mail=loadMailConfig(env);
  const trustProxy=env.TRUST_PROXY?env.TRUST_PROXY.split(',').map(x=>x.trim()):false;
  if(trustProxy&&trustProxy.some(value=>{if(value==='loopback')return false;const [ip,prefix]=value.split('/');return !isIP(ip)||(prefix!==undefined&&(!/^\d+$/.test(prefix)||Number(prefix)>(isIP(ip)===4?32:128)));}))configError('TRUST_PROXY deve listar somente IPs ou redes conhecidas do proxy.');
  const ipLimit=Number(env.AUTH_REQUESTS_PER_IP_HOUR||20);if(!Number.isInteger(ipLimit)||ipLimit<1||ipLimit>10000)configError('Defina um limite válido de pedidos por IP.');
  if(env.KIWIFY_PREVIOUS_SECRET){
    const start=new Date(required('KIWIFY_ROTATED_AT')).getTime(),end=new Date(required('KIWIFY_PREVIOUS_VALID_UNTIL')).getTime();
    if(env.KIWIFY_PREVIOUS_SECRET.length<32||!Number.isFinite(start)||!Number.isFinite(end)||end-start<86400000)configError('A troca de token deve preservar o anterior por pelo menos um dia.');
  }
  return {production,port,host:env.HOST||'127.0.0.1',appOrigin:url.origin,authSecret,db,mail,trustProxy,ipLimit,preview:!production&&env.ALLOW_PREVIEW!=='false',
    billing:{secret,encryptionKey,previousSecret:env.KIWIFY_PREVIOUS_SECRET,previousValidUntil:env.KIWIFY_PREVIOUS_VALID_UNTIL}};
}
module.exports={loadConfig,loadMailConfig,configError};
