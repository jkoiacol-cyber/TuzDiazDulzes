const { pool, setupDatabase } = require('./db-setup');

exports.handler = async (event, context) => {
  console.log('=== USER FUNCTION STARTED ===');
  console.log('Method:', event.httpMethod);
  
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
    
    // GET - Obtener todos los usuarios
    if (method === 'GET') {
      console.log('Fetching users from DB...');
      const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
      console.log('Users found:', result.rows.length);
      
      // MAPEO CRÍTICO: Convertir full_name a fullName
      const users = result.rows.map(user => {
        const mapped = {
          id: user.id,
          fullName: user.full_name,  // ← MAPEO snake_case → camelCase
          phone: user.phone,
          address: user.address,
          approved: user.approved,
          createdAt: user.created_at
        };
        console.log('Mapped user:', mapped.fullName, mapped.phone);
        return mapped;
      });
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(users)
      };
    }

    // POST - Crear usuario
    if (method === 'POST') {
      const body = JSON.parse(event.body);
      console.log('Creating user - Received:', JSON.stringify(body));
      
      const { id, fullName, phone, address } = body;
      
      console.log('Extracted values:');
      console.log('  fullName:', fullName);
      console.log('  phone:', phone);
      
      if (!fullName) {
        console.error('ERROR: fullName is missing!');
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'fullName is required' })
        };
      }
      
      const result = await pool.query(
        'INSERT INTO users (id, full_name, phone, address) VALUES ($1, $2, $3, $4) RETURNING *',
        [id, fullName, phone, address]
      );
      
      console.log('User created in DB:', result.rows[0]);
      
      // Devolver con mapeo correcto
      const createdUser = {
        id: result.rows[0].id,
        fullName: result.rows[0].full_name,  // ← MAPEO
        phone: result.rows[0].phone,
        address: result.rows[0].address,
        approved: result.rows[0].approved,
        createdAt: result.rows[0].created_at
      };
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(createdUser)
      };
    }

    // PUT - Actualizar usuario (aprobar)
    if (method === 'PUT') {
      const { id } = JSON.parse(event.body);
      console.log('Approving user:', id);
      
      const result = await pool.query(
        'UPDATE users SET approved = true WHERE id = $1 RETURNING *',
        [id]
      );
      
      const updatedUser = {
        id: result.rows[0].id,
        fullName: result.rows[0].full_name,  // ← MAPEO
        phone: result.rows[0].phone,
        address: result.rows[0].address,
        approved: result.rows[0].approved,
        createdAt: result.rows[0].created_at
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedUser)
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