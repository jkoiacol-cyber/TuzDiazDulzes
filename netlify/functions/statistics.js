const { pool, setupDatabase } = require('./db-setup');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    await setupDatabase();
    
    // GET - Calcular estadísticas en tiempo real
    if (event.httpMethod === 'GET') {
      const { month, year } = event.queryStringParameters || {};
    
      if (!month || !year) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Month and year are required' })
        };
      }
    
      const ordersQuery = await pool.query(
        `SELECT user_id, user_name, items, total_price 
         FROM orders 
         WHERE EXTRACT(MONTH FROM created_at) = $1 
           AND EXTRACT(YEAR FROM created_at) = $2`,
        [month, year]
      );
    
      if (ordersQuery.rows.length === 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify([])
        };
      }
    
      // Totales
      let totalOrders = ordersQuery.rows.length;
      let totalUnits = 0;
      let totalPrice = 0;
    
      // Items por línea con cliente (NO agrupar por producto aquí)
      const lineItems = [];
    
      ordersQuery.rows.forEach(order => {
        totalPrice += parseFloat(order.total_price);
        const items = order.items || [];
        items.forEach(item => {
          totalUnits += item.quantity;
          lineItems.push({
            name: item.name,
            quantity: item.quantity,
            price: item.price * item.quantity,
            userId: order.user_id || null,
            userName: order.user_name || null
          });
        });
      });
    
      const statistics = [{
        id: `${year}-${month}`,
        month: parseInt(month, 10),
        year: parseInt(year, 10),
        totalOrders,
        totalUnits,
        totalPrice,
        items: lineItems
      }];
    
      console.log('Calculated statistics:', {
        month, year, totalOrders, totalUnits, totalPrice,
        itemsSample: lineItems.slice(0, 2) // muestra 2 para no saturar logs
      });
    
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(statistics)
      };
    }
    
    // POST - Ya no hace nada, se calcula en GET
    if (event.httpMethod === 'POST') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Statistics are now calculated in real-time' })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('=== STATISTICS ERROR ===', error.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};