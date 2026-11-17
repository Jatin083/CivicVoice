const pool = require('../config/db');

// POST /api/feedback
exports.create = async (req, res) => {
  const { subject, message, rating } = req.body;
  const [r] = await pool.query(
    'INSERT INTO feedback (user_id, subject, message, rating) VALUES (?, ?, ?, ?)',
    [req.user.id, subject, message, rating ?? null]
  );
  res.status(201).json({ data: { feedbackId: r.insertId, status: 'new' } });
};
