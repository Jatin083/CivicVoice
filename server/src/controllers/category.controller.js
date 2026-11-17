const pool = require('../config/db');

// GET /api/categories
exports.list = async (req, res) => {
  const [rows] = await pool.query(
    `SELECT c.category_id, c.category_name, c.description,
            (SELECT COUNT(*) FROM petitions p WHERE p.category_id = c.category_id AND p.status = 'published') AS open_petitions
     FROM categories c ORDER BY c.category_name`
  );
  res.json({ data: rows });
};
