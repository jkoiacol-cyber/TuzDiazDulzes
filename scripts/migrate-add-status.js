// scripts/migrate-add-status.js
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log('🔄 Agregando columna "status" a la tabla users...\n');
    
    // 1. Agregar columna status
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending'
    `);
    console.log('✅ Columna "status" agregada');
    
    // 2. Migrar datos existentes
    await pool.query(`
      UPDATE users 
      SET status = CASE 
        WHEN approved = true THEN 'approved'
        ELSE 'pending'
      END
      WHERE status IS NULL OR status = 'pending'
    `);
    console.log('✅ Datos migrados de "approved" → "status"');
    
    // 3. Verificar
    const result = await pool.query(`
      SELECT id, full_name, phone, approved, status 
      FROM users 
      LIMIT 5
    `);
    
    console.log('\n📊 Primeros 5 usuarios:');
    if (result.rows.length === 0) {
      console.log('  (No hay usuarios aún)');
    } else {
      result.rows.forEach(u => {
        console.log(`  ${u.full_name} | approved: ${u.approved} | status: ${u.status}`);
      });
    }
    
    console.log('\n🎉 Migración completada exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

migrate();