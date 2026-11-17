const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  dateStrings: true,    // DATE/TIMESTAMP come back as strings, not JS Dates
  decimalNumbers: true, // DECIMAL (e.g. progress_percentage) comes back as a number
  // Cloud MySQL (Aiven, TiDB, Railway) needs TLS: set DB_SSL=true. Local MySQL leaves it off.
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: process.env.DB_SSL_INSECURE !== 'true' } : undefined,
});

module.exports = pool;
