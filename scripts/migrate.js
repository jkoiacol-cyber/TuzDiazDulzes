require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function migrateData() {
  try {
    console.log('🔄 Iniciando migración de datos...');
    
    // Lee los datos del localStorage (debes exportarlos primero desde el navegador)
    // Desde la consola del navegador ejecuta:
    // copy({
    //   users: localStorage.getItem('users'),
    //   orders: localStorage.getItem('orders'),
    //   statistics: localStorage.getItem('statistics')
    // })
    
    const dataFile = path.join(__dirname, 'localStorageData.json');
    
    if (!fs.existsSync(dataFile)) {
      console.log('⚠️  No se encontró archivo de datos para migrar');
      console.log('📋 Para migrar datos existentes:');
      console.log('   1. Abre tu app en el navegador');
      console.log('   2. Abre la consola (F12)');
      console.log('   3. Ejecuta:');
      console.log(`      copy({
        users: localStorage.getItem('users'),
        orders: localStorage.getItem('orders'),
        statistics: localStorage.getItem('statistics')
      })`);
      console.log('   4. Pega el resultado en scripts/localStorageData.json');
      console.log('   5. Ejecuta este script de nuevo');
      process.exit(0);
    }
    
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    
    // Migrar usuarios
    if (data.users) {
      const users = JSON.parse(data.users);
      for (const user of users) {
        await pool.query(
          `INSERT INTO users (id, full_name, phone, address, approved, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           ON CONFLICT (id) DO NOTHING`,
          [user.id, user.fullName, user.phone, user.address, user.approved, user.createdAt]
        );
      }
      console.log(`✅ ${users.length} usuarios migrados`);
    }
    
    // Migrar pedidos
    if (data.orders) {
      const orders = JSON.parse(data.orders);
      for (const order of orders) {
        await pool.query(
          `INSERT INTO orders (id, user_id, user_name, user_phone, user_address, items, total_price, status, created_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
           ON CONFLICT (id) DO NOTHING`,
          [order.id, order.userId, order.userName, order.userPhone, order.userAddress, 
           JSON.stringify(order.items), order.totalPrice, order.status, order.createdAt]
        );
      }
      console.log(`✅ ${orders.length} pedidos migrados`);
    }
    
    // Migrar estadísticas
    if (data.statistics) {
      const statistics = JSON.parse(data.statistics);
      for (const stat of statistics) {
        await pool.query(
          `INSERT INTO statistics (month, year, total_orders, total_units, total_price, items) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           ON CONFLICT (month, year) DO UPDATE SET
           total_orders = statistics.total_orders + EXCLUDED.total_orders,
           total_units = statistics.total_units + EXCLUDED.total_units,
           total_price = statistics.total_price + EXCLUDED.total_price`,
          [stat.month, stat.year, stat.totalOrders, stat.totalUnits, stat.totalPrice, JSON.stringify(stat.items)]
        );
      }
      console.log(`✅ ${statistics.length} estadísticas migradas`);
    }
    
    console.log('🎉 Migración completada exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

migrateData();