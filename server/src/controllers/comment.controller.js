const pool = require('../config/db');
const ApiError = require('../utils/ApiError');
const { PUBLIC_STATUSES } = require('../constants');

async function publicPetitionOr404(petitionId) {
  const [[p]] = await pool.query('SELECT petition_id, status FROM petitions WHERE petition_id = ?', [petitionId]);
  if (!p || !PUBLIC_STATUSES.includes(p.status)) throw new ApiError(404, 'Petition not found');
  return p;
}

// GET /api/petitions/:id/comments
// Visible comments, newest first. Removed comments stay in the thread as a placeholder
// ("comment removed by moderator"); hidden ones are left out entirely.
exports.list = async (req, res) => {
  const petitionId = Number(req.params.id);
  await publicPetitionOr404(petitionId);
  const [rows] = await pool.query(
    `SELECT c.comment_id, c.comment_status, c.created_at, u.user_id, u.full_name,
            CASE WHEN c.comment_status = 'visible' THEN c.comment_text ELSE NULL END AS comment_text
     FROM petition_comments c JOIN users u ON u.user_id = c.user_id
     WHERE c.petition_id = ? AND c.comment_status IN ('visible', 'removed')
     ORDER BY c.created_at DESC, c.comment_id DESC`,
    [petitionId]
  );
  res.json({ data: rows });
};

// POST /api/petitions/:id/comments
exports.create = async (req, res) => {
  const petitionId = Number(req.params.id);
  await publicPetitionOr404(petitionId);
  const [r] = await pool.query(
    'INSERT INTO petition_comments (petition_id, user_id, comment_text) VALUES (?, ?, ?)',
    [petitionId, req.user.id, req.body.text.trim()]
  );
  res.status(201).json({ data: { commentId: r.insertId } });
};
