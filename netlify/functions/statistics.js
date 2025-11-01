const { pool, setupDatabase } = require('./db-setup');

exports.handler = async (event, context) => {
  console.log('=== STATISTICS FUNCTION STARTED ===');

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    await setupDatabase();
    const method = event.httpMethod;
    console.log('Method:', method);

    if (method === 'GET') {
      const { month, year } = event.queryStringParameters || {};

      let query = `
        SELECT 
          EXTRACT(MONTH FROM created_at) as month,
          EXTRACT(YEAR FROM created_at) as year,
          COUNT(*) as total_orders
        FROM orders `;

      const params = [];

      if (month && year) {
        query += 'WHERE EXTRACT(MONTH FROM created_at) = $1 AND EXTRACT(YEAR FROM created_at) = $2';
        params.push(month, year);
        query += ' GROUP BY EXTRACT(MONTH FROM created_at), EXTRACT(YEAR FROM created_at)';
      } else {
        query += 'GROUP BY EXTRACT(MONTH FROM created_at), EXTRACT(YEAR FROM created_at) ORDER BY year DESC, month DESC';
      }

      const result = await pool.query(query, params);
      console.log('Periods found:', result.rows.length);

      const statistics = [];

      for (const stat of result.rows) {
        const periodMonth = stat.month;
        const periodYear = stat.year;
        const totalOrders = parseInt(stat.total_orders);

        const ordersQuery = await pool.query(
          `SELECT items, total_price FROM orders 
           WHERE EXTRACT(MONTH FROM created_at) = $1 
           AND EXTRACT(YEAR FROM created_at) = $2`,
          [periodMonth, periodYear]
        );

        let totalUnits = 0;
        let totalPrice = 0;
        let allItems = [];

        ordersQuery.rows.forEach(order => {
          const items = order.items;
          totalPrice += parseFloat(order.total_price);
          items.forEach(item => {
            totalUnits += item.quantity;
            allItems.push(item);
          });
        });

        statistics.push({
          id: `${periodYear}-${periodMonth}`,
          month: parseInt(periodMonth),
          year: parseInt(periodYear),
          totalOrders,
          totalUnits,
          totalPrice,
          items: allItems
        });
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(statistics)
      };
    }

    if (method === 'POST') {
      console.log('Statistics POST received (no-op in real-time mode)');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ message: 'Statistics calculated in real-time' })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('=== STATISTICS ERROR ===');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
