const { Pool } = require('pg');

console.log('=== DB-SETUP MODULE LOADING ===');
console.log('DATABASE_URL from env:', process.env.DATABASE_URL ? 'EXISTS' : 'MISSING');

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set!');
  throw new Error('DATABASE_URL environment variable is required');
}

// Crear pool de conexiones
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Test básico de conexión
pool.on('error', (err) => {
  console.error('Unexpected pool error:', err);
});

console.log('Pool created successfully');

// Crear tablas si no existen
async function setupDatabase() {
  console.log('=== SETUP DATABASE FUNCTION CALLED ===');
  
  try {
    // Test de conexión primero
    await pool.query('SELECT NOW()');
    console.log('Database connection successful');

    // Tabla de usuarios
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) UNIQUE NOT NULL,
        address TEXT NOT NULL,
        approved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Users table ready');

    // Tabla de pedidos
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255),
        user_name VARCHAR(255) NOT NULL,
        user_phone VARCHAR(50) NOT NULL,
        user_address TEXT NOT NULL,
        items JSONB NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Orders table ready');

    // Tabla de estadísticas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS statistics (
        id SERIAL PRIMARY KEY,
        month INTEGER NOT NULL,
        year INTEGER NOT NULL,
        total_orders INTEGER DEFAULT 0,
        total_units INTEGER DEFAULT 0,
        total_price DECIMAL(10, 2) DEFAULT 0,
        items JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(month, year)
      )
    `);
    console.log('Statistics table ready');

    console.log('=== DATABASE SETUP COMPLETE ===');
  } catch (error) {
    console.error('=== DATABASE SETUP ERROR ===');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

module.exports = { pool, setupDatabase };