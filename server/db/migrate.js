'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const {Client} = require('pg');

async function migrate(connectionString) {
  if (!connectionString) throw Error('Configure MIGRATION_DATABASE_URL para executar as migrações.');
  const client = new Client({connectionString});
  await client.connect();
  try {
    await client.query('SELECT pg_advisory_lock(58024001)');
    await client.query('CREATE SCHEMA IF NOT EXISTS up_private');
    await client.query('REVOKE ALL ON SCHEMA up_private FROM PUBLIC');
    await client.query('CREATE TABLE IF NOT EXISTS up_private.schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    const folder = path.join(__dirname, 'migrations');
    for (const name of (await fs.readdir(folder)).filter(x => /^\d+_[a-z0-9_]+\.sql$/.test(x)).sort()) {
      const sql = await fs.readFile(path.join(folder, name), 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      const previous = await client.query('SELECT checksum FROM up_private.schema_migrations WHERE name=$1', [name]);
      if (previous.rowCount) {
        if (previous.rows[0].checksum !== checksum) throw Error('Migração já aplicada foi alterada: ' + name);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO up_private.schema_migrations(name,checksum) VALUES($1,$2)', [name,checksum]);
        await client.query('COMMIT');
      } catch (error) { await client.query('ROLLBACK'); throw error; }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(58024001)').catch(() => {});
    await client.end();
  }
}
if (require.main === module) {
  require('dotenv').config({path:process.env.UP_MIGRATION_ENV_FILE||'.env.migration',quiet:true});
  migrate(process.env.MIGRATION_DATABASE_URL).then(() => console.log('Migrações conferidas e aplicadas.')).catch(error => {
    console.error('Falha na migração:', error.code || error.message); process.exitCode=1;
  });
}
module.exports = {migrate};
