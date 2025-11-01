const { pool, setupDatabase } = require('./db-setup');

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  await setupDatabase();

  try {
    const method = event.httpMethod;

    if (method === 'GET') {
      const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
      const users = result.rows.map(u => ({
        id: u.id,
        fullName: u.full_name,
        phone: u.phone,
        address: u.address,
        approved: u.approved,
        status: u.status || (u.approved ? 'approved' : 'pending'),
        createdAt: u.created_at
      }));
      return { statusCode: 200, headers, body: JSON.stringify(users) };
    }

    if (method === 'POST') {
      const { id, fullName, phone, address } = JSON.parse(event.body || '{}');
      const result = await pool.query(
        'INSERT INTO users (id, full_name, phone, address) VALUES ($1,$2,$3,$4) RETURNING *',
        [id, fullName, phone, address]
      );
      const u = result.rows[0];
      return { statusCode: 201, headers, body: JSON.stringify({
        id: u.id, fullName: u.full_name, phone: u.phone, address: u.address, approved: u.approved, status: u.status, createdAt: u.created_at
      }) };
    }

    if (method === 'PUT') {
      const { id, status } = JSON.parse(event.body || '{}');
      if (!['approved','rejected','pending'].includes(status)) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid status' }) };
      }
      const result = await pool.query(
        `UPDATE users
         SET status = $2,
             approved = CASE WHEN $2='approved' THEN true ELSE false END
         WHERE id = $1
         RETURNING *`,
        [id, status]
      );
      const u = result.rows[0];
      return { statusCode: 200, headers, body: JSON.stringify({
        id: u.id, fullName: u.full_name, phone: u.phone, address: u.address, approved: u.approved, status: u.status, createdAt: u.created_at
      }) };
    }

    if (method === 'DELETE') {
      const { id, cascade } = JSON.parse(event.body || '{}');
      if (!id) return { statusCode: 400, headers, body: JSON.stringify({ error: 'id required' }) };

      try {
        await pool.query('BEGIN');
        let deletedOrders = 0;
        if (cascade) {
          const delOrders = await pool.query('DELETE FROM orders WHERE user_id = $1', [id]);
          deletedOrders = delOrders.rowCount || 0;
        }
        const delUser = await pool.query('DELETE FROM users WHERE id = $1', [id]);
        await pool.query('COMMIT');

        return { statusCode: 200, headers, body: JSON.stringify({
          success: true,
          deletedUser: delUser.rowCount === 1,
          deletedOrders
        }) };
      } catch (e) {
        await pool.query('ROLLBACK');
        throw e;
      }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  } catch (error) {
    console.error('Users function error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};