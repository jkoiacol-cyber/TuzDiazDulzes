// netlify/functions/users.js
const { pool, setupDatabase } = require('./db-setup');

exports.handler = async (event, context) => {
  console.log('=== USER FUNCTION ===');
  console.log('Method:', event.httpMethod);
  console.log('Path:', event.path);
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    await setupDatabase();
    const method = event.httpMethod;
    
    // GET - Obtener todos los usuarios
    if (method === 'GET') {
      const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
      
      const users = result.rows.map(user => ({
        id: user.id,
        fullName: user.full_name,
        phone: user.phone,
        address: user.address,
        approved: user.approved,
        status: user.status || (user.approved ? 'approved' : 'pending'),
        createdAt: user.created_at
      }));
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(users)
      };
    }

    // POST - Crear usuario
    if (method === 'POST') {
      const body = JSON.parse(event.body);
      const { id, fullName, phone, address } = body;
      
      if (!fullName) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'fullName is required' })
        };
      }
      
      const result = await pool.query(
        `INSERT INTO users (id, full_name, phone, address, status) 
         VALUES ($1, $2, $3, $4, 'pending') 
         RETURNING *`,
        [id, fullName, phone, address]
      );
      
      const createdUser = {
        id: result.rows[0].id,
        fullName: result.rows[0].full_name,
        phone: result.rows[0].phone,
        address: result.rows[0].address,
        approved: result.rows[0].approved,
        status: result.rows[0].status,
        createdAt: result.rows[0].created_at
      };
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(createdUser)
      };
    }

    // PUT - Aprobar usuario (legacy, mantener por compatibilidad)
    if (method === 'PUT') {
      const { id } = JSON.parse(event.body);
      
      const result = await pool.query(
        `UPDATE users 
         SET approved = true, status = 'approved' 
         WHERE id = $1 
         RETURNING *`,
        [id]
      );
      
      const updatedUser = {
        id: result.rows[0].id,
        fullName: result.rows[0].full_name,
        phone: result.rows[0].phone,
        address: result.rows[0].address,
        approved: result.rows[0].approved,
        status: result.rows[0].status,
        createdAt: result.rows[0].created_at
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedUser)
      };
    }

    // PATCH - Actualizar status (approved/rejected/pending)
    if (method === 'PATCH') {
      const { id, status } = JSON.parse(event.body);
      
      if (!['approved', 'rejected', 'pending'].includes(status)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid status' })
        };
      }
      
      const approved = status === 'approved';
      
      const result = await pool.query(
        `UPDATE users 
         SET status = $2, approved = $3 
         WHERE id = $1 
         RETURNING *`,
        [id, status, approved]
      );
      
      if (result.rowCount === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'User not found' })
        };
      }
      
      const updatedUser = {
        id: result.rows[0].id,
        fullName: result.rows[0].full_name,
        phone: result.rows[0].phone,
        address: result.rows[0].address,
        approved: result.rows[0].approved,
        status: result.rows[0].status,
        createdAt: result.rows[0].created_at
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedUser)
      };
    }

  // DELETE - Borrar usuario (con/sin pedidos)
    if (method === 'DELETE') {
      const { id, cascade } = JSON.parse(event.body);
      
      if (cascade) {
        // Borrar TODOS los pedidos del usuario
        const deletedOrders = await pool.query(
          'DELETE FROM orders WHERE user_id = $1 RETURNING id, status',
          [id]
        );
        console.log(`Deleted ${deletedOrders.rowCount} orders for user ${id} (all statuses)`);
      } else {
        // 🆕 CAMBIO: Borrar solo pedidos pending y processing
        const deletedOrders = await pool.query(
          `DELETE FROM orders 
           WHERE user_id = $1 
           AND (status = 'pending' OR status = 'processing')
           RETURNING id, status`,
          [id]
        );
        console.log(`Deleted ${deletedOrders.rowCount} incomplete orders for user ${id}`);
        
        // Desvincular pedidos completed/archived (poner user_id en NULL)
        const orphanedOrders = await pool.query(
          `UPDATE orders 
           SET user_id = NULL, user_name = user_name || ' (usuario borrado)' 
           WHERE user_id = $1 
           AND (status = 'completed' OR status = 'archived')
           RETURNING id`,
          [id]
        );
        console.log(`Orphaned ${orphanedOrders.rowCount} completed/archived orders`);
      }
      
      const result = await pool.query(
        'DELETE FROM users WHERE id = $1 RETURNING *',
        [id]
      );
      
      if (result.rowCount === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'User not found' })
        };
      }
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true, 
          deletedUser: result.rows[0].full_name,
          cascade 
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };

  } catch (error) {
    console.error('=== ERROR ===');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};