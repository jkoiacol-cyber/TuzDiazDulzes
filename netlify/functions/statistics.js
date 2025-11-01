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
      console.log('Statistics found:', result.rows.length);
      
      // ← MAPEO CRÍTICO: Convertir snake_case a camelCase
      const statistics = result.rows.map(stat => {
        const mapped = {
          id: stat.id,
          month: stat.month,
          year: stat.year,
          totalOrders: stat.total_orders,      // ← AGREGAR ESTE MAPEO
          totalUnits: stat.total_units,        // ← AGREGAR ESTE MAPEO
          totalPrice: parseFloat(stat.total_price), // ← AGREGAR ESTE MAPEO
          items: stat.items,
          createdAt: stat.created_at
        };
        console.log('Mapped statistic:', JSON.stringify(mapped)); // ← Ver en logs
        return mapped;
      });
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(statistics)
      };
    }

    // POST - Crear o actualizar estadísticas
    if (method === 'POST') {
      const { month, year, totalOrders, totalUnits, totalPrice, items } = JSON.parse(event.body);
      
      console.log('Updating statistics:', { 
        month, 
        year, 
        totalOrders, 
        totalUnits, 
        totalPrice: parseFloat(totalPrice) 
      });
      
      const priceAsNumber = parseFloat(totalPrice);
      
      // Intentar actualizar primero
      const updateResult = await pool.query(
        `UPDATE statistics 
         SET total_orders = total_orders + $3,
             total_units = total_units + $4,
             total_price = total_price + $5,
             items = items || $6::jsonb
         WHERE month = $1 AND year = $2
         RETURNING *`,
        [month, year, totalOrders, totalUnits, priceAsNumber, JSON.stringify(items)]
      );
      
      if (updateResult.rowCount > 0) {
        console.log('Statistics updated');
        
        // ← MAPEO EN LA RESPUESTA DEL UPDATE
        const updated = {
          id: updateResult.rows[0].id,
          month: updateResult.rows[0].month,
          year: updateResult.rows[0].year,
          totalOrders: updateResult.rows[0].total_orders,
          totalUnits: updateResult.rows[0].total_units,
          totalPrice: parseFloat(updateResult.rows[0].total_price),
          items: updateResult.rows[0].items,
          createdAt: updateResult.rows[0].created_at
        };
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(updated)
        };
      }
      
      // Si no existe, crear nuevo
      const insertResult = await pool.query(
        `INSERT INTO statistics (month, year, total_orders, total_units, total_price, items) 
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [month, year, totalOrders, totalUnits, priceAsNumber, JSON.stringify(items)]
      );
      
      console.log('Statistics created');
      
      // ← MAPEO EN LA RESPUESTA DEL INSERT
      const created = {
        id: insertResult.rows[0].id,
        month: insertResult.rows[0].month,
        year: insertResult.rows[0].year,
        totalOrders: insertResult.rows[0].total_orders,
        totalUnits: insertResult.rows[0].total_units,
        totalPrice: parseFloat(insertResult.rows[0].total_price),
        items: insertResult.rows[0].items,
        createdAt: insertResult.rows[0].created_at
      };
      
      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(created)
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