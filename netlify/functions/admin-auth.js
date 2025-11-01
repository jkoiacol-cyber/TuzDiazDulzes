const bcrypt = require('bcryptjs');
const { pool, setupDatabase } = require('./db-setup');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  await setupDatabase();
  const { password } = JSON.parse(event.body || '{}') || {};
  if (!password) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Password required' }) };

  let hash;
  const r = await pool.query('SELECT password_hash FROM admin_settings WHERE id=1');
  hash = r.rowCount ? r.rows[0].password_hash : process.env.ADMIN_PASSWORD_HASH;
  if (!hash) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Admin password not configured' }) };

  const ok = await bcrypt.compare(password, hash);
  if (!ok) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid password' }) };

  const token = require('crypto').randomBytes(32).toString('hex');
  return { statusCode: 200, headers, body: JSON.stringify({ success: true, token, expiresIn: 3600000 }) };
};