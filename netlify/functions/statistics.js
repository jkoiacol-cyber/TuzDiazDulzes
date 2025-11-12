// netlify/functions/statistics.js
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
    
    if (event.httpMethod === 'GET') {
      const { month, year } = event.queryStringParameters || {};
    
      if (!month || !year) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Month and year are required' })
        };
      }
    
      // Obtener pedidos completed/archived/archived_hidden con fecha
      const ordersQuery = await pool.query(
        `SELECT user_id, user_name, items, total_price, created_at, id
         FROM orders 
         WHERE EXTRACT(MONTH FROM created_at) = $1 
           AND EXTRACT(YEAR FROM created_at) = $2
           AND (status = 'completed' OR status = 'archived' OR status = 'archived_hidden')
         ORDER BY created_at DESC`,
        [month, year]
      );
    
      if (ordersQuery.rows.length === 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify([])
        };
      }
    
      let totalOrders = ordersQuery.rows.length;
      let totalUnits = 0;
      let totalPrice = 0;
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
            userName: order.user_name || null,
            orderId: order.id, // 🆕 ID del pedido
            orderDate: order.created_at // 🆕 Fecha y hora del pedido
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
    
      console.log('Calculated statistics with timestamps:', {
        month, year, totalOrders, totalUnits, totalPrice
      });
    
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(statistics)
      };
    }
    
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