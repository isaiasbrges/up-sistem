'use strict';
const crypto = require('node:crypto');
const {promisify} = require('node:util');
const scrypt = promisify(crypto.scrypt);
const options = {N:32768, r:8, p:1, maxmem:64*1024*1024};
function validPassword(value) {
  return typeof value === 'string' && value.length >= 12 && value.length <= 128;
}
async function hashPassword(value) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = await scrypt(value, salt, 64, options);
  return 'scrypt-v1$'+salt+'$'+key.toString('hex');
}
async function verifyPassword(value, encoded) {
  const parts = (encoded || '').split('$');
  const valid = parts[0] === 'scrypt-v1' && /^[a-f0-9]{32}$/.test(parts[1] || '') && /^[a-f0-9]{128}$/.test(parts[2] || '');
  const salt = valid ? parts[1] : '0'.repeat(32);
  const expected = valid ? Buffer.from(parts[2], 'hex') : Buffer.alloc(64);
  const candidate = await scrypt(value, salt, 64, options);
  return crypto.timingSafeEqual(candidate, expected) && valid;
}
module.exports = {validPassword, hashPassword, verifyPassword};
