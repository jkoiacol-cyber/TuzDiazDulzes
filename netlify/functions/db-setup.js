const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function setupDatabase() {
  try {
    // USERS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) UNIQUE NOT NULL,
        address TEXT NOT NULL,
        approved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Asegurar columna "status" aunque la tabla ya exista
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
    `);

    // Sincronizar status con approved para filas antiguas
    await pool.query(`
      UPDATE users
      SET status = 'approved'
      WHERE approved = true AND (status IS NULL OR status = 'pending');
    `);

    // ORDERS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        user_name VARCHAR(255) NOT NULL,
        user_phone VARCHAR(50) NOT NULL,
        user_address TEXT NOT NULL,
        items JSONB NOT NULL,
        total_price NUMERIC(12,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // STATISTICS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS statistics (
        id SERIAL PRIMARY KEY,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        total_orders INTEGER DEFAULT 0,
        total_units INTEGER DEFAULT 0,
        total_price NUMERIC(12,2) DEFAULT 0,
        items JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (month, year)
      );
    `);

    // ADMIN SETTINGS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        id INT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Semilla inicial de admin_settings si no existe y hay hash en env
    const r = await pool.query('SELECT 1 FROM admin_settings WHERE id = 1;');
    if (r.rowCount === 0 && process.env.ADMIN_PASSWORD_HASH) {
      await pool.query(
        'INSERT INTO admin_settings (id, password_hash) VALUES (1, $1);',
        [process.env.ADMIN_PASSWORD_HASH]
      );
      console.log('admin_settings inicializado desde ADMIN_PASSWORD_HASH');
    }

    console.log('DB setup OK');
  } catch (err) {
    console.error('DB setup error:', err);
    throw err;
  }
}

module.exports = { pool, setupDatabase };