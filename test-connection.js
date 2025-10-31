require('dotenv').config({ path: '.env.local' });

console.log('DATABASE_URL existe?', !!process.env.DATABASE_URL);
console.log('DATABASE_URL empieza con postgresql?', process.env.DATABASE_URL?.startsWith('postgresql'));

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function test() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Conexión exitosa:', result.rows[0]);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    process.exit(1);
  }
}

test();