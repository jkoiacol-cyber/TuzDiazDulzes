const { pool, setupDatabase } = require('./db-setup');

exports.handler = async (event, context) => {
  console.log('=== ORDER FUNCTION STARTED ===');
  
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
    
    // GET - Obtener pedidos
    if (method === 'GET') {
      const { phone } = event.queryStringParameters || {};
      
      let query = 'SELECT * FROM orders';
      const params = [];
      
      if (phone) {
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
        query += ' ORDER BY created_at DESC';
      }
      
      const result = await pool.query(query, params);
      console.log('Orders found:', result.rows.length);
      
      // MAPEO CRÍTICO: Convertir campos de BD a formato frontend
      const orders = result.rows.map(order => ({
        id: order.id,
        userId: order.user_id,
        userName: order.user_name,
        userPhone: order.user_phone,
        userAddress: order.user_address,
        items: order.items, // Ya es JSONB
        totalPrice: parseFloat(order.total_price), // ← CONVERTIR A NÚMERO
        status: order.status,
        createdAt: order.created_at
      }));
      
      console.log('Sample order:', orders[0]); // Ver un ejemplo
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(orders)
      };
    }

    // POST - Crear pedido
    if (method === 'POST') {
      const order = JSON.parse(event.body);
      
      console.log('Creating order:', {
        userName: order.userName,
        totalPrice: order.totalPrice,
        itemCount: order.items?.length
      });
      
      // Asegurar que totalPrice es un número
      const totalPrice = parseFloat(order.totalPrice);
      
      if (isNaN(totalPrice)) {
        console.error('Invalid totalPrice:', order.totalPrice);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid totalPrice' })
        };
      }
      
      const result = await pool.query(
        `INSERT INTO orders (id, user_id, user_name, user_phone, user_address, items, total_price, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [
          order.id, 
          order.userId, 
          order.userName, 
          order.userPhone, 
          order.userAddress, 
          JSON.stringify(order.items), 
          totalPrice, // ← Usar el número parseado
          order.status || 'pending'
        ]
      );
      
      console.log('Order created:', result.rows[0].id);
      
      // Devolver con mapeo correcto
      const createdOrder = {
        id: result.rows[0].id,
        userId: result.rows[0].user_id,
        userName: result.rows[0].user_name,
        userPhone: result.rows[0].user_phone,
        userAddress: result.rows[0].user_address,
        items: result.rows[0].items,
        totalPrice: parseFloat(result.rows[0].total_price),
        status: result.rows[0].status,
        createdAt: result.rows[0].created_at
      };
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(createdOrder)
      };
    }

    // PUT - Actualizar estado del pedido
    if (method === 'PUT') {
      const { id, status } = JSON.parse(event.body);
      console.log('Updating order status:', id, status);
      
      const result = await pool.query(
        'UPDATE orders SET status = $2 WHERE id = $1 RETURNING *',
        [id, status]
      );
      
      const updatedOrder = {
        id: result.rows[0].id,
        userId: result.rows[0].user_id,
        userName: result.rows[0].user_name,
        userPhone: result.rows[0].user_phone,
        userAddress: result.rows[0].user_address,
        items: result.rows[0].items,
        totalPrice: parseFloat(result.rows[0].total_price),
        status: result.rows[0].status,
        createdAt: result.rows[0].created_at
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedOrder)
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('=== ORDER ERROR ===');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};