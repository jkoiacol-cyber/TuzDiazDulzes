const { pool, setupDatabase } = require('./db-setup');

exports.handler = async (event, context) => {
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

  // Asegurar que las tablas existen
  await setupDatabase();

  try {
    const method = event.httpMethod;
    const path = event.path.replace('/.netlify/functions/users', '');
    
    // GET - Obtener todos los usuarios
    if (method === 'GET') {
      const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows)
      };
    }

    // POST - Crear usuario
    if (method === 'POST') {
      const { id, fullName, phone, address } = JSON.parse(event.body);
      const result = await pool.query(
        'INSERT INTO users (id, full_name, phone, address) VALUES ($1, $2, $3, $4) RETURNING *',
        [id, fullName, phone, address]
      );
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(result.rows[0])
      };
    }

    // PUT - Actualizar usuario (aprobar)
    if (method === 'PUT') {
      const { id } = JSON.parse(event.body);
      const result = await pool.query(
        'UPDATE users SET approved = true WHERE id = $1 RETURNING *',
        [id]
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