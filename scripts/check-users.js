require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkUsers() {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC LIMIT 5');
    
    console.log('\n=== ÚLTIMOS 5 USUARIOS EN LA BD ===\n');
    
    if (result.rows.length === 0) {
      console.log('No hay usuarios en la base de datos');
    } else {
      result.rows.forEach((user, index) => {
        console.log(`Usuario ${index + 1}:`);
        console.log('  ID:', user.id);
        console.log('  Nombre:', user.full_name || 'NULL/VACÍO'); // ← Aquí veremos el problema
        console.log('  Teléfono:', user.phone);
        console.log('  Dirección:', user.address);
        console.log('  Aprobado:', user.approved);
        console.log('  Creado:', user.created_at);
        console.log('---');
      });
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkUsers();