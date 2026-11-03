'use strict';
const {Pool,types} = require('pg');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function transaction(pool, callback, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    if (userId !== undefined) {
      if (!UUID.test(userId)) throw Error('Identidade inválida para a transação.');
      await client.query("SELECT set_config('up.user_id', $1, true)", [userId]);
    }
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally { client.release(); }
}

async function createDatabase({appUrl, internalUrl, max=4} = {}) {
  if (!appUrl || !internalUrl) throw Error('Configure DATABASE_URL e INTERNAL_DATABASE_URL.');
  const parsers={getTypeParser:(oid,format)=>oid===1082?value=>value:types.getTypeParser(oid,format)};
  const appPool = new Pool({connectionString:appUrl, max, connectionTimeoutMillis:5000, statement_timeout:15000,types:parsers});
  const internalPool = new Pool({connectionString:internalUrl, max:2, connectionTimeoutMillis:5000, statement_timeout:15000,types:parsers});
  for (const pool of [appPool,internalPool]) pool.on('error', () => console.error('Conexão do banco indisponível.'));
  async function assertRole(pool, expected, forbidden) {
    const {rows:[role]} = await pool.query(`SELECT current_user AS name, current_database() AS db,
      r.rolsuper, r.rolbypassrls, pg_has_role(current_user,$1,'usage') AS expected,
      pg_has_role(current_user,$2,'member') AS forbidden,
      pg_has_role(current_user,'up_exporter','member') AS exporter,
      EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname IN ('up','up_private') AND c.relowner=r.oid) AS owns_tables
      FROM pg_roles r WHERE r.rolname=current_user`, [expected,forbidden]);
    if (!role || role.rolsuper || role.rolbypassrls || role.owns_tables || !role.expected || role.forbidden || role.exporter) {
      throw Error('Credencial do banco tem permissões incompatíveis com o papel ' + expected + '.');
    }
    return role.db;
  }
  try {
    const appDb = await assertRole(appPool,'up_app','up_internal');
    const internalDb = await assertRole(internalPool,'up_internal','up_app');
    if (appDb !== internalDb) throw Error('As credenciais precisam apontar para o mesmo banco.');
  } catch (error) { await Promise.all([appPool.end(),internalPool.end()]); throw error; }
  return {
    appPool, internalPool,
    asUser:(userId, callback) => transaction(appPool,callback,userId),
    internal:callback => transaction(internalPool,callback),
    close:() => Promise.all([appPool.end(),internalPool.end()])
  };
}
module.exports = {createDatabase,transaction,UUID};
