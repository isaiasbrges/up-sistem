'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createBilling}=require('../server/modules/billing/service');
const {loadConfig}=require('../server/config');
const secret='example1234';
const env={DEV_MAILBOX:'true',APP_ORIGIN:'http://localhost:3000',AUTH_SECRET:'a'.repeat(32),DATABASE_URL:'postgres://app:test@db/up',INTERNAL_DATABASE_URL:'postgres://internal:test@db/up',KIWIFY_WEBHOOK_SECRET:secret,PAYLOAD_ENCRYPTION_KEY:Buffer.alloc(32,1).toString('base64')};
test('provider token shorter than 32 characters passes runtime configuration',()=>assert.equal(loadConfig(env).billing.secret,secret));
test('provider token authenticates exact bytes and rejects forgery and modified body',()=>{
 const billing=createBilling({db:{},secret,encryptionKey:Buffer.alloc(32,1)});
 const raw=Buffer.from('{"order_id":"signature-test","webhook_event_type":"order_approved"}');
 const signature=crypto.createHmac('sha1',secret).update(raw).digest('hex');
 assert.doesNotThrow(()=>billing.verify(raw,signature));
 assert.throws(()=>billing.verify(Buffer.concat([raw,Buffer.from(' ')]),signature),e=>e.code==='INVALID_SIGNATURE');
 assert.throws(()=>billing.verify(raw,'0'.repeat(40)),e=>e.code==='INVALID_SIGNATURE');
 assert.throws(()=>createBilling({db:{},secret:'',encryptionKey:Buffer.alloc(32,1)}));
});

test('configuration loads independent webhook tokens',()=>{
 const value=loadConfig({...env,KIWIFY_ADDITIONAL_SECRETS:JSON.stringify(['another1234'])});
 assert.deepEqual(value.billing.additionalSecrets,['another1234']);
 for(const bad of ['oops','{}','[null]','[""]','["   "]'])assert.throws(()=>loadConfig({...env,KIWIFY_ADDITIONAL_SECRETS:bad}));
});
test('independent webhook tokens remain valid beyond rotation window',()=>{
 const raw=Buffer.from('{"order_id":"multi-token-test"}'),second='another1234',old='previous123';
 const billing=createBilling({db:{},secret,additionalSecrets:[second],previousSecret:old,previousValidUntil:'2020-01-01T00:00:00Z',encryptionKey:Buffer.alloc(32,1)});
 for(const key of [secret,second])assert.doesNotThrow(()=>billing.verify(raw,crypto.createHmac('sha1',key).update(raw).digest('hex')));
 for(const key of [old,'unknown1234'])assert.throws(()=>billing.verify(raw,crypto.createHmac('sha1',key).update(raw).digest('hex')),e=>e.code==='INVALID_SIGNATURE');
 assert.throws(()=>billing.verify(Buffer.concat([raw,Buffer.from(' ')]),crypto.createHmac('sha1',second).update(raw).digest('hex')),e=>e.code==='INVALID_SIGNATURE');
});
test('billing rejects invalid additional token configuration',()=>{
 for(const additionalSecrets of [null,'token',[''],[null],['   ']])assert.throws(()=>createBilling({db:{},secret,additionalSecrets,encryptionKey:Buffer.alloc(32,1)}));
});
