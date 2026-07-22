const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('Warning: DATABASE_URL is not set. Add your Supabase connection string to .env');
}

const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes('supabase.co')
    ? { rejectUnauthorized: false }
    : undefined,
});

function toPgSql(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

async function query(sql, params = []) {
  const text = toPgSql(sql);
  const result = await pool.query(text, params);
  return [result.rows, result];
}

module.exports = { query, pool };
