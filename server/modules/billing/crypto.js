'use strict';
const crypto=require('node:crypto');
function createPayloadCipher(key) {
  const bytes=Buffer.isBuffer(key)?key:Buffer.from(key||'','base64');
  if(bytes.length!==32)throw Error('Configure PAYLOAD_ENCRYPTION_KEY com 32 bytes em base64.');
  return {
    encrypt(value){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',bytes,iv);const data=Buffer.concat([cipher.update(value),cipher.final()]);return ['v1',iv.toString('base64'),cipher.getAuthTag().toString('base64'),data.toString('base64')].join('.');},
    decrypt(value){const [version,iv,tag,data]=String(value).split('.');if(version!=='v1'||!iv||!tag||!data)throw Error('PAYLOAD_INVALID');const decipher=crypto.createDecipheriv('aes-256-gcm',bytes,Buffer.from(iv,'base64'));decipher.setAuthTag(Buffer.from(tag,'base64'));return Buffer.concat([decipher.update(Buffer.from(data,'base64')),decipher.final()]);}
  };
}
module.exports={createPayloadCipher};
