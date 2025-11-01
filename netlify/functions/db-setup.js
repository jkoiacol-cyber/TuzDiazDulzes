const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function setupDatabase() {
  try {
    // Tabla usuarios
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) UNIQUE NOT NULL,
        address TEXT NOT NULL,
        approved BOOLEAN DEFAULT false,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Migración rápida: sincronizar status con approved
    await pool.query(`
      UPDATE users
      SET status = 'approved'
      WHERE approved = true AND (status IS NULL OR status = 'pending')
    `);

    // Tabla pedidos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        user_name VARCHAR(255) NOT NULL,
        user_phone VARCHAR(50) NOT NULL,
        user_address TEXT NOT NULL,
        items JSONB NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla ajustes de admin
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id INT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    // Asegurar 1 fila (id=1)
    const r = await pool.query('SELECT 1 FROM admin_settings WHERE id=1');
    if (r.rowCount === 0) {
      if (process.env.ADMIN_PASSWORD_HASH) {
        await pool.query(
          'INSERT INTO admin_settings (id, password_hash) VALUES (1, $1)',
          [process.env.ADMIN_PASSWORD_HASH]
        );
        console.log('admin_settings inicializado desde ADMIN_PASSWORD_HASH');
      } else {
        console.warn('ADMIN_PASSWORD_HASH no definido. Configura el hash con Netlify env o rota contraseña.');
      }
    }
  } catch (err) {
    console.error('DB setup error:', err);
    throw err;
  }
}

module.exports = { pool, setupDatabase };