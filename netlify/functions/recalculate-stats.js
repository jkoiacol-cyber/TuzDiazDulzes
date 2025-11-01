require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function recalculateStatistics() {
  try {
    console.log('🔄 Recalculando estadísticas desde pedidos...\n');
    
    // Obtener todos los pedidos
    const orders = await pool.query('SELECT * FROM orders ORDER BY created_at');
    
    console.log(`📦 Procesando ${orders.rows.length} pedidos\n`);
    
    // Limpiar estadísticas actuales
    await pool.query('DELETE FROM statistics');
    console.log('✅ Estadísticas anteriores limpiadas\n');
    
    // Agrupar pedidos por mes/año
    const statsByPeriod = {};
    
    orders.rows.forEach(order => {
      const date = new Date(order.created_at);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const key = `${year}-${month}`;
      
      if (!statsByPeriod[key]) {
        statsByPeriod[key] = {
          month,
          year,
          totalOrders: 0,
          totalUnits: 0,
          totalPrice: 0,
          items: []
        };
      }
      
      const items = order.items; // Ya es un objeto JSON
      const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
      
      statsByPeriod[key].totalOrders += 1;
      statsByPeriod[key].totalUnits += totalUnits;
      statsByPeriod[key].totalPrice += parseFloat(order.total_price);
      statsByPeriod[key].items.push(...items);
    });
    
    // Insertar nuevas estadísticas
    for (const [key, stat] of Object.entries(statsByPeriod)) {
      await pool.query(
        `INSERT INTO statistics (month, year, total_orders, total_units, total_price, items)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [stat.month, stat.year, stat.totalOrders, stat.totalUnits, stat.totalPrice, JSON.stringify(stat.items)]
      );
      
      console.log(`✅ ${stat.year}-${stat.month}: ${stat.totalOrders} pedidos, ${stat.totalUnits} unidades, $${stat.totalPrice}`);
    }
    
    console.log('\n🎉 Estadísticas recalculadas exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

recalculateStatistics();