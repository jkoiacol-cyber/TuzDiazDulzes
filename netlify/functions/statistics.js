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
    
    // GET - Obtener estadísticas
    if (method === 'GET') {
      const { month, year } = event.queryStringParameters || {};
      
      let query = 'SELECT * FROM statistics';
      const params = [];
      
      if (month && year) {
        query += ' WHERE month = $1 AND year = $2';
        params.push(month, year);
      }
      
      query += ' ORDER BY year DESC, month DESC';
      
      const result = await pool.query(query, params);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result.rows)
      };
    }

    // POST - Crear o actualizar estadísticas
    if (method === 'POST') {
      const { month, year, totalOrders, totalUnits, totalPrice, items } = JSON.parse(event.body);
      
      // Intentar actualizar primero
      const updateResult = await pool.query(
        `UPDATE statistics 
         SET total_orders = total_orders + $3,
             total_units = total_units + $4,
             total_price = total_price + $5,
             items = items || $6::jsonb
         WHERE month = $1 AND year = $2
         RETURNING *`,
        [month, year, totalOrders, totalUnits, totalPrice, JSON.stringify(items)]
      );
      
      if (updateResult.rowCount > 0) {
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(updateResult.rows[0])
        };
      }
      
      // Si no existe, crear nuevo
      const insertResult = await pool.query(
        `INSERT INTO statistics (month, year, total_orders, total_units, total_price, items) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [month, year, totalOrders, totalUnits, totalPrice, JSON.stringify(items)]
      );
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(insertResult.rows[0])
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 