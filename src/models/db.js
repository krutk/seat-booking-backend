const { Pool } = require('pg');
const config = require('../config/config');

const pool = new Pool({
  connectionString: config.db.connectionString
});

const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    // Create tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS seats (
        id SERIAL PRIMARY KEY,
        seat_number INTEGER NOT NULL,
        row_number INTEGER NOT NULL,
        is_booked BOOLEAN DEFAULT FALSE,
        booked_by INTEGER REFERENCES users(id),
        booking_time TIMESTAMP
      );
    `);

    // Check if seats table is empty and initialize it if needed
    const seatsCount = await client.query('SELECT COUNT(*) FROM seats');
    if (seatsCount.rows[0].count === '0') {
      // Initialize 80 seats (11 rows of 7 seats + 1 row of 3 seats)
      const seatValues = [];
      let seatNumber = 1;
      
      // Create 11 rows with 7 seats each
      for (let row = 1; row <= 11; row++) {
        for (let seat = 1; seat <= 7; seat++) {
          seatValues.push(`(${seatNumber}, ${row})`);
          seatNumber++;
        }
      }
      
      // Create last row with 3 seats
      for (let seat = 1; seat <= 3; seat++) {
        seatValues.push(`(${seatNumber}, 12)`);
        seatNumber++;
      }

      await client.query(`
        INSERT INTO seats (seat_number, row_number)
        VALUES ${seatValues.join(', ')}
      `);
    }

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Initialize database when the module is imported
initializeDatabase().catch(console.error);

module.exports = pool;