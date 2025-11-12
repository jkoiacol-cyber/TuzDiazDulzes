// netlify/functions/orders.js
const { pool, setupDatabase } = require('./db-setup');

// 🆕 Función para calcular días hábiles
function isWeekday(date) {
  const day = date.getDay();
  return day !== 0 && day !== 6; // 0=Domingo, 6=Sábado
}

function addBusinessDays(date, days) {
  let count = 0;
  const result = new Date(date);
  
  while (count < days) {
    result.setDate(result.getDate() + 1);
    if (isWeekday(result)) {
      count++;
    }
  }
  
  return result;
}

// 🆕 Función para marcar pedidos archivados como "ocultos" (NO los borra)
async function hideOldArchivedOrders() {
  try {
    // Obtener todos los pedidos archivados
    const archivedOrders = await pool.query(
      `SELECT id, created_at, status 
       FROM orders 
       WHERE status = 'archived'`
    );
    
    const now = new Date();
    let hiddenCount = 0;
    
    for (const order of archivedOrders.rows) {
      const archivedDate = new Date(order.created_at);
      const threeBusinessDaysLater = addBusinessDays(archivedDate, 3);
      
      // Si ya pasaron 3 días hábiles, marcar como "archived_hidden"
      if (now >= threeBusinessDaysLater) {
        await pool.query(
          `UPDATE orders 
           SET status = 'archived_hidden' 
           WHERE id = $1`,
          [order.id]
        );
        hiddenCount++;
      }
    }
    
    if (hiddenCount > 0) {
      console.log(`📦 ${hiddenCount} pedidos archivados ocultados (mantienen datos para estadísticas)`);
    }
    
    return hiddenCount;
  } catch (error) {
    console.error('Error hiding old archived orders:', error.message);
    return 0;
  }
}

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
      // 🆕 Ocultar pedidos archivados antiguos (NO los borra)
      await hideOldArchivedOrders();
      
      const { phone } = event.queryStringParameters || {};
      
      let query = 'SELECT * FROM orders';
      const params = [];
      
        if (phone) {
          const oneMonthAgo = new Date();
          oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
                
          query = `
            SELECT * FROM orders 
            WHERE user_phone = $1 
            AND (status != 'archived' AND status != 'archived_hidden' 
                 OR ((status = 'archived' OR status = 'archived_hidden') 
                     AND created_at >= $2))
            ORDER BY created_at DESC
          `;
          params.push(phone, oneMonthAgo.toISOString());
        }
                
        else {
        // 🆕 Excluir archived_hidden del admin (pero siguen en BD para estadísticas)
        query += ` WHERE status != 'archived_hidden' ORDER BY created_at DESC`;
      }
      
      const result = await pool.query(query, params);
      console.log('Orders found:', result.rows.length);
      
      const orders = result.rows.map(order => ({
        id: order.id,
        userId: order.user_id,
        userName: order.user_name,
        userPhone: order.user_phone,
        userAddress: order.user_address,
        items: order.items,
        totalPrice: parseFloat(order.total_price),
        status: order.status,
        createdAt: order.created_at
      }));
      
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
          totalPrice,
          order.status || 'pending'
        ]
      );
      
      console.log('Order created:', result.rows[0].id);
      
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