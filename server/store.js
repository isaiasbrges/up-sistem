'use strict';
const crypto = require('node:crypto');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const schema = `CREATE TABLE IF NOT EXISTS up_accounts (email VARCHAR(254) PRIMARY KEY, data LONGTEXT NOT NULL)`;
async function createStore() {
  if (process.env.DB_HOST) {
    const mysql = require('mysql2/promise');
    const pool = mysql.createPool({host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,connectionLimit:5});
    await pool.execute(schema);
    return {async get(email){const [rows]=await pool.execute('SELECT data FROM up_accounts WHERE email=?',[email]);return rows.length?JSON.parse(rows[0].data):null;},async put(email,data){await pool.execute('INSERT INTO up_accounts(email,data) VALUES (?,?) ON DUPLICATE KEY UPDATE data=VALUES(data)',[email,JSON.stringify(data)]);},async close(){await pool.end();}};
  }
  if(process.env.NODE_ENV==='production') throw Error('Configure o banco MySQL antes de iniciar em produção.');
  const {DatabaseSync}=require('node:sqlite');
  const fs=require('node:fs');fs.mkdirSync('data',{recursive:true});
  const db=new DatabaseSync(process.env.SQLITE_PATH||'data/up.sqlite');db.exec(schema);
  return {async get(email){const row=db.prepare('SELECT data FROM up_accounts WHERE email=?').get(email);return row?JSON.parse(row.data):null;},async put(email,data){db.prepare('INSERT INTO up_accounts(email,data) VALUES (?,?) ON CONFLICT(email) DO UPDATE SET data=excluded.data').run(email,JSON.stringify(data));},async close(){db.close();}};
}
module.exports={createStore,hash};
