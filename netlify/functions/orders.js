const { pool, setupDatabase } = require('./db-setup');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  await setupDatabase();

  try {
    const method = event.httpMethod;
    
    // GET - Obtener pedidos
    if (method === 'GET') {
      const { phone } = event.queryStringParameters || {};
      
      let query = 'SELECT * FROM orders';
      const params = [];
      
      if (phone) {
        // Para usuarios: obtener sus pedidos de los últimos 12 meses
        const twelveMonthsAgo = new Date();
        twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
        
        query = `
          SELECT * FROM orders 
          WHERE user_phone = $1 
          AND (status != 'archived' OR 
               (status = 'archived' AND created_at >= $2))
          ORDER BY created_at DESC
        `;
        params.push(phone, twelveMonthsAgo.toISOString());
      } else {
        // Para admin: obtener todos
        query += ' ORDER BY created_at DESC';
      }
      
      const result = await pool.query(query, params);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows)
      };
    }

    // POST - Crear pedido
    if (method === 'POST') {
      const order = JSON.parse(event.body);
      const result = await pool.query(
        `INSERT INTO orders (id, user_id, user_name, user_phone, user_address, items, total_price, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [order.id, order.userId, order.userName, order.userPhone, order.userAddress, 
         JSON.stringify(order.items), order.totalPrice, order.status || 'pending']
      );
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(result.rows[0])
      };
    }

    // PUT - Actualizar estado del pedido
    if (method === 'PUT') {
      const { id, status } = JSON.parse(event.body);
      const result = await pool.query(
        'UPDATE orders SET status = $2 WHERE id = $1 RETURNING *',
        [id, status]
      );
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows[0])
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};