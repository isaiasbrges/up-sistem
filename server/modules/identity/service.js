'use strict';
const crypto = require('node:crypto');
const {isIP} = require('node:net');
const {fail} = require('../../shared/errors');
const CODE_TTL = 10*60*1000;
const SESSION_TTL = 30*24*60*60*1000;
const normalizeEmail = value => String(value || '').trim().toLowerCase();
const validEmail = value => typeof value === 'string' && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const digest = value => crypto.createHash('sha256').update(value).digest();
const safeIp = value => isIP(value || '') ? value : null;

async function takeLimit(client,key,max,ms,at) {
  const {rows:[row]} = await client.query(`INSERT INTO up_private.rate_limit_buckets(bucket_key,count,expires_at)
    VALUES ($1,1,$2) ON CONFLICT(bucket_key) DO UPDATE SET
    count=CASE WHEN up_private.rate_limit_buckets.expires_at <= $3 THEN 1 ELSE up_private.rate_limit_buckets.count+1 END,
    expires_at=CASE WHEN up_private.rate_limit_buckets.expires_at <= $3 THEN EXCLUDED.expires_at ELSE up_private.rate_limit_buckets.expires_at END
    RETURNING count,expires_at`, [key,new Date(at+ms),new Date(at)]);
  return {allowed:row.count <= max, retryAfter:Math.max(1,Math.ceil((row.expires_at.getTime()-at)/1000))};
}

async function hasAccess(client,user,at) {
  if (!user || user.status !== 'active') return false;
  if (['admin','suporte'].includes(user.platform_role)) return true;
  const {rowCount} = await client.query(`SELECT 1 FROM up.entitlements WHERE user_id=$1 AND status='active'
    AND activated_at <= $2 AND (expires_at IS NULL OR expires_at > $2) LIMIT 1`, [user.id,new Date(at)]);
  return rowCount > 0;
}

function createIdentity({db,authSecret,sendCode,now=Date.now,ipLimit=20}) {
  if (typeof authSecret !== 'string' || authSecret.length < 32) throw Error('Configure AUTH_SECRET com pelo menos 32 caracteres aleatórios.');
  if (typeof sendCode !== 'function') throw Error('Configure o serviço de envio de código.');
  const codeHash = (challenge,code) => crypto.createHmac('sha256',authSecret).update('up-otp-v1|'+challenge+'|'+code).digest();
  const privateKey = value => crypto.createHmac('sha256',authSecret).update(value).digest('hex');
  async function log(client,email,ip,result,at) {
    await client.query('INSERT INTO up_private.login_events(user_id,email,ip,result,created_at) VALUES((SELECT id FROM up.users WHERE email=$1),$1,$2,$3,$4)', [email,safeIp(ip),result,new Date(at)]);
  }

  async function requestCode(rawEmail,ip) {
    const email=normalizeEmail(rawEmail),at=now();
    if (!validEmail(email)) fail(400,'INVALID_EMAIL','Informe um e-mail válido.',{email:'Informe um e-mail válido.'});
    const decision=await db.internal(async client => {
      const ipRate=await takeLimit(client,'request:ip:'+privateKey(ip || 'unknown'),ipLimit,3600000,at);
      if (!ipRate.allowed) { await log(client,email,ip,'limited',at); return {limited:ipRate.retryAfter}; }
      const cooldown=await takeLimit(client,'resend:'+privateKey(email),1,60000,at);
      if (!cooldown.allowed) { await log(client,email,ip,'limited',at); return {limited:cooldown.retryAfter}; }
      const emailRate=await takeLimit(client,'request:email:'+privateKey(email),3,900000,at);
      if (!emailRate.allowed) { await log(client,email,ip,'limited',at); return {limited:emailRate.retryAfter}; }
      const {rows:[user]}=await client.query('SELECT id,status,platform_role FROM up.users WHERE email=$1',[email]);
      if (!(await hasAccess(client,user,at))) { await log(client,email,ip,'unavailable',at); return {}; }
      const challenge=crypto.randomUUID(),code=String(crypto.randomInt(1000000)).padStart(6,'0');
      await client.query(`INSERT INTO up_private.login_codes(user_id,challenge_id,code_hash,issued_at,expires_at)
        VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id) DO UPDATE SET challenge_id=EXCLUDED.challenge_id,
        code_hash=EXCLUDED.code_hash,issued_at=EXCLUDED.issued_at,expires_at=EXCLUDED.expires_at,attempts=0,consumed_at=NULL`,
        [user.id,challenge,codeHash(challenge,code),new Date(at),new Date(at+CODE_TTL)]);
      await log(client,email,ip,'requested',at);
      return {userId:user.id,challenge,code};
    });
    if (decision.limited) fail(429,'RATE_LIMITED','Aguarde antes de pedir outro código.',{retryAfter:decision.limited});
    if (decision.code) {
      try { await sendCode(email,decision.code); }
      catch {
        await db.internal(async client => {
          await client.query('DELETE FROM up_private.login_codes WHERE user_id=$1 AND challenge_id=$2',[decision.userId,decision.challenge]);
          await log(client,email,ip,'delivery_failed',now());
        });
      }
    }
    return {message:'Se este e-mail tiver uma compra, você vai receber um código em instantes.',retryAfterSeconds:60};
  }

  async function verifyCode(rawEmail,rawCode,ip) {
    const email=normalizeEmail(rawEmail),code=String(rawCode || ''),at=now();
    if (!validEmail(email)) fail(400,'INVALID_EMAIL','Informe um e-mail válido.');
    const result=await db.internal(async client => {
      const rate=await takeLimit(client,'verify:ip:'+privateKey(ip || 'unknown'),50,900000,at);
      if (!rate.allowed) { await log(client,email,ip,'limited',at); return {limited:rate.retryAfter}; }
      const {rows:[user]}=await client.query('SELECT id,status,platform_role FROM up.users WHERE email=$1',[email]);
      let entry;
      if (user) ({rows:[entry]}=await client.query('SELECT * FROM up_private.login_codes WHERE user_id=$1 FOR UPDATE',[user.id]));
      const matches=crypto.timingSafeEqual(entry?.code_hash || Buffer.alloc(32),codeHash(entry?.challenge_id || 'absent',code));
      const usable=entry && !entry.consumed_at && entry.expires_at.getTime()>at && entry.attempts<5;
      if (!usable || !/^\d{6}$/.test(code) || !matches || !(await hasAccess(client,user,at))) {
        if (usable) await client.query('UPDATE up_private.login_codes SET attempts=least(5,attempts+1) WHERE user_id=$1',[user.id]);
        await log(client,email,ip,'invalid',at); return {invalid:true};
      }
      await client.query('UPDATE up_private.login_codes SET consumed_at=$2 WHERE user_id=$1',[user.id,new Date(at)]);
      const token=crypto.randomBytes(32).toString('hex');
      await client.query('INSERT INTO up_private.sessions(token_hash,user_id,created_at,expires_at) VALUES($1,$2,$3,$4)',[digest(token),user.id,new Date(at),new Date(at+SESSION_TTL)]);
      await client.query('UPDATE up.users SET last_login_at=$2 WHERE id=$1',[user.id,new Date(at)]);
      await log(client,email,ip,'success',at);
      return {token,userId:user.id};
    });
    if (result.limited) fail(429,'RATE_LIMITED','Aguarde para tentar novamente.',{retryAfter:result.limited});
    if (result.invalid) fail(401,'INVALID_CODE','Código inválido ou expirado.');
    return result;
  }

  async function authenticate(token) {
    if (!/^[0-9a-f]{64}$/.test(token || '')) fail(401,'UNAUTHENTICATED','Entre novamente para continuar.');
    const result=await db.internal(async client => {
      const {rows:[user]}=await client.query(`SELECT u.* FROM up_private.sessions s JOIN up.users u ON u.id=s.user_id
        WHERE s.token_hash=$1 AND s.revoked_at IS NULL AND s.expires_at>$2 AND u.status='active'`,[digest(token),new Date(now())]);
      if (!user) return null;
      const {rows:grants}=await client.query(`SELECT DISTINCT product_code FROM up.entitlements WHERE user_id=$1 AND status='active'
        AND activated_at <= $2 AND (expires_at IS NULL OR expires_at > $2)`,[user.id,new Date(now())]);
      return {user:{id:user.id,name:user.name,email:user.email,phone:user.phone || '',role:user.platform_role},
        entitlements:Object.fromEntries(['front','essencial','kit'].map(key=>[key,grants.some(g=>g.product_code===key)]))};
    });
    if (!result) fail(401,'UNAUTHENTICATED','Entre novamente para continuar.');
    return result;
  }

  async function logout(token) {
    if (/^[0-9a-f]{64}$/.test(token || '')) await db.internal(client=>client.query('UPDATE up_private.sessions SET revoked_at=$2 WHERE token_hash=$1',[digest(token),new Date(now())]));
  }

  async function provision({email:rawEmail,name='Aluno UP',role='aluno',products=[],expiresAt=null,reason='Configuração administrativa local'}) {
    const email=normalizeEmail(rawEmail);
    if (!validEmail(email) || !['aluno','admin','suporte'].includes(role) || typeof name!=='string' || name.trim().length<2 || name.trim().length>120) fail(400,'INVALID_ACCOUNT','Dados de conta inválidos.');
    if (products.some(p=>!['front','essencial','kit'].includes(p))) fail(400,'INVALID_PRODUCT','Produto inválido.');
    return db.internal(async client => {
      const {rows:[user]}=await client.query(`INSERT INTO up.users(email,name,platform_role) VALUES($1,$2,$3)
        ON CONFLICT(email) DO UPDATE SET email=EXCLUDED.email RETURNING id,email,name,platform_role`,[email,name.trim(),role]);
      if (user.platform_role !== role) fail(409,'ROLE_CONFLICT','A conta já existe com outro perfil; altere o perfil em uma operação auditada.');
      for (const product of new Set(products)) await client.query(`INSERT INTO up.entitlements(user_id,product_code,status,origin,source_ref,expires_at,activated_at)
        VALUES($1,$2,'active','manual',$3,$4,$5) ON CONFLICT(user_id,product_code,origin,source_ref)
        DO UPDATE SET status='active',expires_at=EXCLUDED.expires_at,ended_at=NULL,updated_at=now()`,[user.id,product,'cli:'+user.id+':'+product,expiresAt,new Date(now())]);
      await client.query(`INSERT INTO up_private.audit_events(action,target_type,target_id,reason,metadata)
        VALUES('account.provision','user',$1,$2,$3)`,[user.id,reason,JSON.stringify({products,role})]);
      return user;
    });
  }

  return {requestCode,verifyCode,authenticate,logout,provision};
}
module.exports = {createIdentity,normalizeEmail,validEmail,digest,CODE_TTL,SESSION_TTL,takeLimit};
