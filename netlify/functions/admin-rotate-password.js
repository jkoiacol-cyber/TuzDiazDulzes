const { pool, setupDatabase } = require('./db-setup');
const bcrypt = require('bcryptjs');
const sg = require('@sendgrid/mail');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  await setupDatabase();
  const { currentPassword } = JSON.parse(event.body || '{}') || {};
  if (!currentPassword) return { statusCode: 400, headers, body: JSON.stringify({ error: 'currentPassword required' }) };

  const r = await pool.query('SELECT password_hash FROM admin_settings WHERE id=1');
  const hash = r.rowCount ? r.rows[0].password_hash : process.env.ADMIN_PASSWORD_HASH;
  if (!hash) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Admin password not configured' }) };

  const ok = await bcrypt.compare(currentPassword, hash);
  if (!ok) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Invalid password' }) };

  const newPassword = require('crypto').randomBytes(14).toString('base64url'); // fuerte
  const newHash = await bcrypt.hash(newPassword, 12);
  await pool.query(`
    INSERT INTO admin_settings (id, password_hash, updated_at)
    VALUES (1, $1, NOW())
    ON CONFLICT (id) DO UPDATE SET password_hash = EXCLUDED.password_hash, updated_at = NOW()
  `, [newHash]);

  try {
    if (process.env.SENDGRID_API_KEY && process.env.EMAIL_FROM && process.env.EMAIL_ADMIN && process.env.EMAIL_DEV) {
      sg.setApiKey(process.env.SENDGRID_API_KEY);
      await sg.send({
        from: process.env.EMAIL_FROM,
        to: [process.env.EMAIL_ADMIN, process.env.EMAIL_DEV],
        subject: 'Nueva contraseña de administrador - Tuz Díaz Dulzes',
        text:
`Se ha rotado la contraseña de administrador.
Nueva contraseña: ${newPassword}

Fecha: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}
Si no reconoces esta acción, rota la contraseña nuevamente y contacta al soporte.`
      });
    } else {
      console.warn('Env vars email faltantes, mostrando en logs la contraseña (SOLO DEV):', newPassword);
    }
  } catch (e) {
    console.error('Error enviando email:', e?.response?.body || e.message);
  }

  return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
};