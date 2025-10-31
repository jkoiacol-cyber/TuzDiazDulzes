const { pool, setupDatabase } = require('./db-setup');

exports.handler = async (event, context) => {
  console.log('=== USER FUNCTION STARTED ===');
  console.log('DATABASE_URL exists?', !!process.env.DATABASE_URL);
  console.log('DATABASE_URL preview:', process.env.DATABASE_URL?.substring(0, 50) + '...');
  
  // Configurar CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE'
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Asegurar que las tablas existen
    console.log('Setting up database...');
    await setupDatabase();
    console.log('Database setup complete');

    const method = event.httpMethod;
    console.log('HTTP Method:', method);
    
    // GET - Obtener todos los usuarios
    if (method === 'GET') {
      console.log('Fetching users...');
      const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
      console.log('Users fetched:', result.rows.length);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows)
      };
    }

    // POST - Crear usuario
    if (method === 'POST') {
      const { id, fullName, phone, address } = JSON.parse(event.body);
      console.log('Creating user:', phone);
      const result = await pool.query(
        'INSERT INTO users (id, full_name, phone, address) VALUES ($1, $2, $3, $4) RETURNING *',
        [id, fullName, phone, address]
      );
      console.log('User created:', result.rows[0].id);
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(result.rows[0])
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
      console.log('User approved');
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
    console.error('=== ERROR IN USER FUNCTION ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        type: error.constructor.name 
      })
    };
  }
};