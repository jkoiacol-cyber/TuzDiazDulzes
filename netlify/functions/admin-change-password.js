// netlify/functions/admin-change-password.js
const { pool, setupDatabase } = require('./db-setup');
const bcrypt = require('bcryptjs');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    await setupDatabase();

    const { currentPassword, newPassword } = JSON.parse(event.body || '{}');

    if (!currentPassword || !newPassword) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Current password and new password required' })
      };
    }

    // Validar nueva contraseña
    if (newPassword.length < 8) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'La nueva contraseña debe tener al menos 8 caracteres' })
      };
    }

    // Obtener hash actual de la BD
    const result = await pool.query('SELECT password_hash FROM admin_settings WHERE id = 1');
    
    let currentHash;
    if (result.rowCount > 0) {
      currentHash = result.rows[0].password_hash;
    } else {
      // Fallback a variable de entorno si no hay registro en BD
      currentHash = process.env.ADMIN_PASSWORD_HASH;
    }

    if (!currentHash) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Admin password not configured' })
      };
    }

    // Verificar contraseña actual
    const isValid = await bcrypt.compare(currentPassword, currentHash);
    
    if (!isValid) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Contraseña actual incorrecta' })
      };
    }

    // Hashear nueva contraseña
    const newHash = await bcrypt.hash(newPassword, 12);

    // Guardar en BD
    await pool.query(`
      INSERT INTO admin_settings (id, password_hash, updated_at)
      VALUES (1, $1, NOW())
      ON CONFLICT (id) DO UPDATE 
      SET password_hash = EXCLUDED.password_hash, 
          updated_at = NOW()
    `, [newHash]);

    console.log('✅ Contraseña cambiada exitosamente');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Contraseña actualizada exitosamente'
      })
    };

  } catch (error) {
    console.error('❌ Error cambiando contraseña:', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Error al cambiar contraseña',
        details: error.message
      })
    };
  }
};