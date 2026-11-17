// Rebuilds the test database from database/civicvoice_schema_v2.sql before each test file.
// The script uses DELIMITER (a mysql-CLI feature), so it is split into three parts here.
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

module.exports = async function resetDb() {
  const dbName = process.env.DB_NAME;
  if (!/_test$/.test(dbName)) throw new Error(`Refusing to reset "${dbName}": tests only run against a *_test database`);

  let sql = fs.readFileSync(path.join(__dirname, '../../database/civicvoice_schema_v2.sql'), 'utf8');
  sql = sql
    .replace('DROP DATABASE IF EXISTS civicvoice;', `DROP DATABASE IF EXISTS \`${dbName}\`;`)
    .replace('CREATE DATABASE civicvoice ', `CREATE DATABASE \`${dbName}\` `)
    .replace('USE civicvoice;', `USE \`${dbName}\`;`);

  const [before, rest] = sql.split('DELIMITER $$');
  const [procedure, after] = rest.split('DELIMITER ;');

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });
  try {
    await conn.query(before);
    await conn.query(procedure.replace('END$$', 'END'));
    await conn.query(after);
  } finally {
    await conn.end();
  }
};
