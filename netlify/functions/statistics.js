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
        `SELECT items, total_price FROM orders 
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
      
      // Calcular totales
      let totalOrders = ordersQuery.rows.length;
      let totalUnits = 0;
      let totalPrice = 0;
      let allItems = [];
      
      ordersQuery.rows.forEach(order => {
        const items = order.items;
        totalPrice += parseFloat(order.total_price);
        
        items.forEach(item => {
          totalUnits += item.quantity;
          
          // Buscar si el item ya existe en allItems para agruparlo
          const existingItem = allItems.find(i => i.name === item.name);
          if (existingItem) {
            existingItem.quantity += item.quantity;
            existingItem.price += item.price * item.quantity;
          } else {
            allItems.push({
              name: item.name,
              quantity: item.quantity,
              price: item.price * item.quantity
            });
          }
        });
      });
      
      const statistics = [{
        id: `${year}-${month}`,
        month: parseInt(month),
        year: parseInt(year),
        totalOrders,
        totalUnits,
        totalPrice,
        items: allItems
      }];
      
      console.log('Calculated statistics:', statistics[0]);
      
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