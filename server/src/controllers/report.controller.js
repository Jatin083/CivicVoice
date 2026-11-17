const pool = require('../config/db');

// POST /api/reports  — exactly one of petitionId / commentId (validator + CHECK constraint)
exports.create = async (req, res) => {
  const { petitionId, commentId, reason, details } = req.body;
  const [r] = await pool.query(
    'INSERT INTO content_reports (reporter_id, petition_id, comment_id, reason, details) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, petitionId ?? null, commentId ?? null, reason, details || null]
  );
  res.status(201).json({ data: { reportId: r.insertId, status: 'pending' } });
};
