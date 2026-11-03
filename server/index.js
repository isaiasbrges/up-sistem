'use strict';
require('dotenv').config({quiet:true});
const express=require('express'),crypto=require('node:crypto'),path=require('node:path');
const {createStore,hash}=require('./store');
const logic=require('../app/logic');
const prod=process.env.NODE_ENV==='production';
const groups={front:['diagnostics','finances','diagnosticDraft','financeDraft'],essencial:['kitTransactions','kitBills'],kit:['personalOffers','plan','checkins','procedures']};
async function createApp({store,sendCode,now=Date.now}={}){
 store=store||await createStore();
 if(!sendCode){
  if(prod&&(!process.env.APP_ORIGIN?.startsWith('https://')||!process.env.MAIL_FROM))throw Error('Configure APP_ORIGIN HTTPS e MAIL_FROM em produção.');
  if(prod&&!process.env.SMTP_HOST)throw Error('Configure SMTP em produção.');
  const transport=process.env.SMTP_HOST?require('nodemailer').createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:process.env.SMTP_PORT==='465',auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}}):null;
  sendCode=async(email,code)=>{if(transport)await transport.sendMail({from:process.env.MAIL_FROM,to:email,subject:'Seu código de acesso ao Software UP',text:`Seu código é ${code}. Ele expira em 10 minutos.`});else console.log(`[DESENVOLVIMENTO] Código para ${email}: ${code}`);};
 }
 const app=express(),codes=new Map(),sessions=new Map(),limits=new Map();
 app.disable('x-powered-by');
 app.use((req,res,next)=>{res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY'});if(req.path.startsWith('/api/'))res.set('Cache-Control','no-store');next();});
 app.use(express.json({limit:'512kb'}));
 app.use('/api',(req,res,next)=>{if(!['GET','HEAD'].includes(req.method)&&req.get('origin')&&req.get('origin')!==(process.env.APP_ORIGIN||(!prod?'http://localhost:'+(process.env.PORT||3000):'')))return res.status(403).json({error:'Origem não permitida.'});next();});
 function rate(key,max,ms){let entry=limits.get(key);if(!entry||entry.until<=now()){entry={count:0,until:now()+ms};limits.set(key,entry);}return ++entry.count<=max;}
 const validEmail=e=>typeof e==='string'&&e.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
 app.post('/api/auth/request-code',async(req,res)=>{
  const email=String(req.body.email||'').trim().toLowerCase();if(!validEmail(email))return res.status(400).json({error:'Informe um e-mail válido.'});
  if(!rate('ip:'+req.socket.remoteAddress,20,600000)||!rate('email:'+email,3,600000))return res.status(429).json({error:'Aguarde alguns minutos para tentar novamente.'});
  const account=await store.get(email);
  if(account){const code=String(crypto.randomInt(0,1000000)).padStart(6,'0');codes.set(email,{digest:hash(code),expires:now()+600000,tries:0});try{await sendCode(email,code);}catch(error){codes.delete(email);console.error('Falha no envio de código');}}
  res.json({message:'Se o e-mail estiver cadastrado, você receberá um código.'});
 });
 app.post('/api/auth/verify-code',async(req,res)=>{
  const email=String(req.body.email||'').trim().toLowerCase(),code=String(req.body.code||''),entry=codes.get(email);
  if(!rate('verify:'+req.socket.remoteAddress,50,600000))return res.status(429).json({error:'Aguarde para tentar novamente.'});
  if(!entry||entry.expires<=now()||entry.tries>=5)return res.status(401).json({error:'Código inválido ou expirado.'});
  entry.tries++;
  if(!/^\d{6}$/.test(code)||!crypto.timingSafeEqual(Buffer.from(entry.digest),Buffer.from(hash(code))))return res.status(401).json({error:'Código inválido ou expirado.'});
  codes.delete(email);const token=crypto.randomBytes(32).toString('hex');sessions.set(hash(token),{email,expires:now()+28800000});
  res.cookie('up_session',token,{httpOnly:true,secure:prod,sameSite:'strict',maxAge:28800000,path:'/'});res.json({ok:true});
 });
 app.use('/api',async(req,res,next)=>{const cookie=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('up_session='));const key=cookie?hash(cookie.slice(11)):null,session=sessions.get(key);if(!session||session.expires<=now())return res.status(401).json({error:'Entre novamente para continuar.'});req.sessionKey=key;req.email=session.email;req.account=await store.get(req.email);if(!req.account)return res.status(401).json({error:'Conta indisponível.'});next();});
 app.get('/api/me',(req,res)=>res.json({user:req.account.user,entitlements:req.account.entitlements}));
 app.patch('/api/me',async(req,res)=>{const name=typeof req.body.name==='string'?req.body.name.trim():'';if(name.length<2||name.length>120||Object.keys(req.body).some(key=>key!=='name'))return res.status(400).json({error:'Informe um nome entre 2 e 120 caracteres.'});const account=await store.get(req.email);account.user={...account.user,name};await store.put(req.email,account);res.json({user:account.user});});
 app.post('/api/auth/logout',(req,res)=>{sessions.delete(req.sessionKey);res.clearCookie('up_session',{path:'/'});res.json({ok:true});});
 function allowed(account,key){return !!(account.entitlements?.[key]||(key==='essencial'&&account.entitlements?.kit));}
 app.get('/api/state',(req,res)=>{const data={};for(const [group,keys]of Object.entries(groups))if(allowed(req.account,group))for(const key of keys)if(req.account.state?.[key]!==undefined)data[key]=req.account.state[key];res.json(data);});
 app.put('/api/state',async(req,res)=>{
  const data=req.body;if(!data||typeof data!=='object'||Array.isArray(data))return res.status(400).json({error:'Dados inválidos.'});
  const accepted={};const allKeys=Object.values(groups).flat();if(Object.keys(data).some(key=>!allKeys.includes(key)))return res.status(400).json({error:'Campo não permitido.'});for(const [group,keys]of Object.entries(groups))for(const key of keys)if(Object.hasOwn(data,key)){if(!allowed(req.account,group))return res.status(403).json({error:'Seu acesso não inclui este recurso.'});if(JSON.stringify(data[key]).length>150000)return res.status(400).json({error:'Limite de dados excedido.'});accepted[key]=data[key];}
  for(const key of ['diagnostics','finances','kitTransactions','kitBills','personalOffers','checkins','procedures'])if(Object.hasOwn(accepted,key)&&(!Array.isArray(accepted[key])||accepted[key].length>1000||accepted[key].some(row=>!row||typeof row!=='object'||Array.isArray(row))))return res.status(400).json({error:'Lista inválida.'});
  for(const key of ['diagnosticDraft','financeDraft','plan'])if(Object.hasOwn(accepted,key)&&(!accepted[key]||typeof accepted[key]!=='object'||Array.isArray(accepted[key])))return res.status(400).json({error:'Dados inválidos.'});
  try{
   if(accepted.diagnostics)accepted.diagnostics=accepted.diagnostics.map(row=>{const previous=req.account.state?.diagnostics?.find(item=>String(item.id)===String(row.id));if(previous)return previous;if(!row.input||!row.id)throw Error('Diagnóstico inválido');return {...row,result:logic.diagnostic(row.input)};});
   if(accepted.finances)accepted.finances=accepted.finances.map(row=>{if(!row.input||!/^\d{4}-\d{2}$/.test(row.month)||!row.id)throw Error('Raio-X inválido');return {...row,result:logic.finance(row.input)};});
  }catch(error){return res.status(400).json({error:'Dados de cálculo inválidos.'});}
  const account={...req.account,state:{...req.account.state,...accepted}};await store.put(req.email,account);res.json({ok:true});
 });
 app.use('/api',(req,res)=>res.status(404).json({error:'Recurso não encontrado.'}));
 app.get('/app/config.js',(req,res)=>res.type('js').send('window.UP_CONFIG={api:true};'));
 app.get('/',(req,res)=>res.sendFile(path.resolve(__dirname,'../index.html')));
 for(const dir of ['app','design-system'])app.use('/'+dir,express.static(path.resolve(__dirname,'..',dir),{dotfiles:'deny'}));
 app.use((err,req,res,next)=>{console.error('Falha na requisição:',err.code||err.name);res.status(err.status===413?413:err.status===400?400:500).json({error:'Não foi possível concluir a operação.'});});
 const cleanup=setInterval(()=>{for(const map of [codes,sessions,limits])for(const [key,value]of map)if((value.expires||value.until)<=now())map.delete(key);},60000);cleanup.unref();
 app.locals.dispose=async()=>{clearInterval(cleanup);await store.close();};return app;
}
if(require.main===module)createApp().then(app=>app.listen(process.env.PORT||3000,()=>console.log('Software UP iniciado.'))).catch(error=>{console.error(error.message);process.exitCode=1;});
module.exports={createApp};
