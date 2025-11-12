// netlify/functions/admin-reset-password.js
const { pool, setupDatabase } = require('./db-setup');
const bcrypt = require('bcryptjs');
const sgMail = require('@sendgrid/mail');

// Configurar SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

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

    // Generar nueva contraseña segura (12 caracteres alfanuméricos)
    const newPassword = require('crypto').randomBytes(9).toString('base64url');
    
    console.log('🔑 Generando nueva contraseña admin...');
    console.log('Nueva contraseña (SOLO EN LOGS DE DESARROLLO):', newPassword);

    // Hashear la nueva contraseña
    const newHash = await bcrypt.hash(newPassword, 12);

    // Guardar en tabla admin_settings (o actualizar variable de entorno)
    // Opción 1: Si usas tabla admin_settings
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_settings (
          id INTEGER PRIMARY KEY DEFAULT 1,
          password_hash TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await pool.query(`
        INSERT INTO admin_settings (id, password_hash, updated_at)
        VALUES (1, $1, NOW())
        ON CONFLICT (id) DO UPDATE 
        SET password_hash = EXCLUDED.password_hash, 
            updated_at = NOW()
      `, [newHash]);

      console.log('✅ Contraseña actualizada en base de datos');
    } catch (dbError) {
      console.error('Error actualizando en BD:', dbError.message);
      // Continuar para enviar email de todas formas
    }

    // Preparar fecha/hora en zona horaria de Chile
    const now = new Date();
    const chileTime = now.toLocaleString('es-CL', {
      timeZone: 'America/Santiago',
      dateStyle: 'full',
      timeStyle: 'long'
    });

    // Email HTML
    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            text-align: center;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border: 1px solid #ddd;
            border-radius: 0 0 10px 10px;
          }
          .password-box {
            background: white;
            border: 2px solid #667eea;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            text-align: center;
            font-size: 24px;
            font-weight: bold;
            letter-spacing: 2px;
            color: #667eea;
            font-family: 'Courier New', monospace;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            color: #666;
            font-size: 12px;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔐 Nueva Contraseña de Administrador</h1>
          <p>Tuz Díaz Dulzes</p>
        </div>
        <div class="content">
          <p>Se ha generado una nueva contraseña de administrador para el sistema.</p>
          
          <div class="password-box">
            ${newPassword}
          </div>
          
          <div class="warning">
            <strong>⚠️ Importante:</strong>
            <ul>
              <li>Esta contraseña fue generada automáticamente</li>
              <li>Guárdala en un lugar seguro</li>
              <li>No compartas este email con nadie</li>
              <li>Considera cambiarla por una personalizada después de iniciar sesión</li>
            </ul>
          </div>
          
          <p><strong>Fecha de generación:</strong><br>${chileTime}</p>
          
          <p>Si no solicitaste este cambio, contacta inmediatamente al equipo de soporte.</p>
        </div>
        <div class="footer">
          <p>Este es un email automático. No respondas a este mensaje.</p>
          <p>&copy; ${new Date().getFullYear()} Tuz Díaz Dulzes</p>
        </div>
      </body>
      </html>
    `;

    // Email en texto plano (fallback)
    const emailText = `
Nueva Contraseña de Administrador - Tuz Díaz Dulzes

Se ha generado una nueva contraseña:

${newPassword}

⚠️ IMPORTANTE:
- Guarda esta contraseña en un lugar seguro
- No compartas este email con nadie
- Considera cambiarla después de iniciar sesión

Fecha: ${chileTime}

Si no solicitaste este cambio, contacta al equipo de soporte.
    `;

    // Enviar emails
    if (!process.env.SENDGRID_API_KEY || !process.env.EMAIL_FROM) {
      console.warn('⚠️ SendGrid no configurado. Mostrando contraseña en logs (SOLO DESARROLLO)');
      console.log('Nueva contraseña:', newPassword);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Contraseña reseteada. Revisa los logs del servidor (modo desarrollo).',
          devMode: true
        })
      };
    }

    // Preparar destinatarios
    const recipients = [
      process.env.EMAIL_ADMIN,
      process.env.EMAIL_DEV
    ].filter(Boolean); // Eliminar valores vacíos

    if (recipients.length === 0) {
      throw new Error('No hay emails de destinatarios configurados');
    }

    // Enviar email
    await sgMail.send({
      to: recipients,
      from: process.env.EMAIL_FROM,
      subject: '🔐 Nueva Contraseña de Administrador - Tuz Díaz Dulzes',
      text: emailText,
      html: emailHTML
    });

    console.log(`✅ Emails enviados a: ${recipients.join(', ')}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Nueva contraseña enviada a ${recipients.length} destinatario(s).`
      })
    };

  } catch (error) {
    console.error('❌ Error en reset de contraseña:', error.message);
    console.error('Stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Error al resetear contraseña',
        details: error.message
      })
    };
  }
};