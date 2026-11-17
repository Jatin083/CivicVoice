const pool = require('../config/db');

// GET /api/users/me/dashboard
exports.dashboard = async (req, res) => {
  const [[counts]] = await pool.query(
    'SELECT petitions_created, petitions_signed, comments_posted FROM v_user_dashboard WHERE user_id = ?',
    [req.user.id]
  );
  const [myPetitions] = await pool.query(
    `SELECT v.*, p.admin_note FROM v_petition_summary v JOIN petitions p ON p.petition_id = v.petition_id
     WHERE v.creator_id = ? ORDER BY v.created_at DESC, v.petition_id DESC`,
    [req.user.id]
  );
  const [signed] = await pool.query(
    `SELECT v.*, s.signed_at FROM signatures s
     JOIN v_petition_summary v ON v.petition_id = s.petition_id
     WHERE s.user_id = ? ORDER BY s.signed_at DESC, s.signature_id DESC`,
    [req.user.id]
  );
  res.json({ data: { counts, myPetitions, signed } });
};
