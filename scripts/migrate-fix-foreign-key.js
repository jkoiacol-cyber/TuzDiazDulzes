// scripts/migrate-fix-foreign-key.js
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  try {
    console.log('🔄 Arreglando foreign key constraint...\n');
    
    // 1. Eliminar la restricción actual (si existe)
    await pool.query(`
      ALTER TABLE orders 
      DROP CONSTRAINT IF EXISTS orders_user_id_fkey
    `);
    console.log('✅ Restricción antigua eliminada');
    
    // 2. Agregar nueva restricción que permite SET NULL cuando se borra usuario
    await pool.query(`
      ALTER TABLE orders 
      ADD CONSTRAINT orders_user_id_fkey 
      FOREIGN KEY (user_id) 
      REFERENCES users(id) 
      ON DELETE SET NULL
    `);
    console.log('✅ Nueva restricción agregada (ON DELETE SET NULL)');
    
    console.log('\n📚 Explicación:');
    console.log('  - Ahora cuando borres un usuario SIN cascade,');
    console.log('  - Los pedidos NO se borrarán');
    console.log('  - Pero su user_id se pondrá en NULL (pedidos "huérfanos")');
    
    console.log('\n🎉 Migración completada exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error en migración:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

migrate();