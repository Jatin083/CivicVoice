const pool = require('../config/db');
const ApiError = require('../utils/ApiError');

const page = (req) => {
  const p = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  return { page: p, limit, offset: (p - 1) * limit };
};

async function paged(req, res, { select, from, where = [], params = [], order }) {
  const { page: p, limit, offset } = page(req);
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM ${from} ${whereSql}`, params);
  const [rows] = await pool.query(`SELECT ${select} FROM ${from} ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`, [
    ...params,
    limit,
    offset,
  ]);
  res.json({ data: rows, meta: { page: p, limit, total } });
}

// GET /api/admin/stats
exports.stats = async (req, res) => {
  const [[t]] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users)                                          AS users,
      (SELECT COUNT(*) FROM petitions)                                      AS petitions,
      (SELECT COUNT(*) FROM signatures)                                     AS signatures,
      (SELECT COUNT(*) FROM petition_comments)                              AS comments,
      (SELECT COUNT(*) FROM content_reports WHERE report_status = 'pending') AS pendingReports,
      (SELECT COUNT(*) FROM feedback WHERE feedback_status = 'new')         AS newFeedback,
      (SELECT ROUND(AVG(rating), 2) FROM feedback)                          AS avgRating`);
  const [statusRows] = await pool.query('SELECT status, COUNT(*) AS count FROM petitions GROUP BY status');
  const [topPetitions] = await pool.query(
    `SELECT petition_id, title, status, total_signatures, target_signatures, progress_percentage
     FROM v_petition_summary ORDER BY total_signatures DESC, created_at DESC LIMIT 5`
  );
  const [needsAction] = await pool.query(
    `SELECT petition_id, title, status, creator_name, total_signatures, created_at
     FROM v_petition_summary WHERE status IN ('published', 'under_review')
     ORDER BY FIELD(status, 'under_review', 'published'), created_at DESC LIMIT 6`
  );
  const byStatus = Object.fromEntries(statusRows.map((r) => [r.status, r.count]));
  res.json({ data: { totals: { ...t, avgRating: t.avgRating === null ? null : Number(t.avgRating) }, byStatus, topPetitions, needsAction } });
};

// GET /api/admin/petitions?status=&q=
exports.petitions = async (req, res) => {
  const where = [];
  const params = [];
  if (req.query.status && req.query.status !== 'all') { where.push('v.status = ?'); params.push(req.query.status); }
  if (req.query.q) { where.push('(v.title LIKE ? OR v.creator_name LIKE ?)'); params.push(`%${req.query.q}%`, `%${req.query.q}%`); }
  await paged(req, res, {
    select: 'v.*, p.admin_note, p.updated_at',
    from: 'v_petition_summary v JOIN petitions p ON p.petition_id = v.petition_id',
    where,
    params,
    order: 'v.created_at DESC, v.petition_id DESC',
  });
};

// GET /api/admin/comments?status=
exports.comments = async (req, res) => {
  const where = [];
  const params = [];
  if (req.query.status && req.query.status !== 'all') { where.push('c.comment_status = ?'); params.push(req.query.status); }
  await paged(req, res, {
    select: `c.comment_id, c.comment_text, c.comment_status, c.created_at, c.petition_id, p.title AS petition_title,
             u.user_id, u.full_name,
             (SELECT COUNT(*) FROM content_reports r WHERE r.comment_id = c.comment_id AND r.report_status = 'pending') AS pending_reports`,
    from: 'petition_comments c JOIN users u ON u.user_id = c.user_id JOIN petitions p ON p.petition_id = c.petition_id',
    where,
    params,
    order: 'c.created_at DESC, c.comment_id DESC',
  });
};

// PATCH /api/admin/comments/:id  { status }
exports.updateComment = async (req, res) => {
  const [r] = await pool.query('UPDATE petition_comments SET comment_status = ? WHERE comment_id = ?', [req.body.status, req.params.id]);
  if (!r.affectedRows) throw new ApiError(404, 'Comment not found');
  res.json({ data: { commentId: Number(req.params.id), status: req.body.status } });
};

// GET /api/admin/reports?status=
exports.reports = async (req, res) => {
  const where = [];
  const params = [];
  if (req.query.status && req.query.status !== 'all') { where.push('r.report_status = ?'); params.push(req.query.status); }
  await paged(req, res, {
    select: `r.report_id, r.reason, r.details, r.report_status, r.admin_note, r.created_at,
             r.petition_id, r.comment_id, ru.full_name AS reporter_name,
             COALESCE(p.title, cp.title) AS petition_title,
             COALESCE(r.petition_id, c.petition_id) AS target_petition_id,
             c.comment_text, c.comment_status, cu.full_name AS comment_author`,
    from: `content_reports r
           JOIN users ru ON ru.user_id = r.reporter_id
           LEFT JOIN petitions p ON p.petition_id = r.petition_id
           LEFT JOIN petition_comments c ON c.comment_id = r.comment_id
           LEFT JOIN users cu ON cu.user_id = c.user_id
           LEFT JOIN petitions cp ON cp.petition_id = c.petition_id`,
    where,
    params,
    order: "FIELD(r.report_status, 'pending') DESC, r.created_at DESC, r.report_id DESC",
  });
};

// PATCH /api/admin/reports/:id  { status, adminNote }
exports.updateReport = async (req, res) => {
  const [r] = await pool.query('UPDATE content_reports SET report_status = ?, admin_note = ? WHERE report_id = ?', [
    req.body.status,
    req.body.adminNote || null,
    req.params.id,
  ]);
  if (!r.affectedRows) throw new ApiError(404, 'Report not found');
  res.json({ data: { reportId: Number(req.params.id), status: req.body.status } });
};

// GET /api/admin/feedback?status=
exports.feedback = async (req, res) => {
  const where = [];
  const params = [];
  if (req.query.status && req.query.status !== 'all') { where.push('f.feedback_status = ?'); params.push(req.query.status); }
  await paged(req, res, {
    select: 'f.feedback_id, f.subject, f.message, f.rating, f.feedback_status, f.created_at, u.full_name, u.email',
    from: 'feedback f LEFT JOIN users u ON u.user_id = f.user_id',
    where,
    params,
    order: "FIELD(f.feedback_status, 'new') DESC, f.created_at DESC, f.feedback_id DESC",
  });
};

// PATCH /api/admin/feedback/:id  { status }
exports.updateFeedback = async (req, res) => {
  const [r] = await pool.query('UPDATE feedback SET feedback_status = ? WHERE feedback_id = ?', [req.body.status, req.params.id]);
  if (!r.affectedRows) throw new ApiError(404, 'Feedback not found');
  res.json({ data: { feedbackId: Number(req.params.id), status: req.body.status } });
};

// GET /api/admin/users?q=
exports.users = async (req, res) => {
  const where = [];
  const params = [];
  if (req.query.q) { where.push('(d.full_name LIKE ? OR d.email LIKE ?)'); params.push(`%${req.query.q}%`, `%${req.query.q}%`); }
  if (req.query.status && req.query.status !== 'all') { where.push('u.account_status = ?'); params.push(req.query.status); }
  await paged(req, res, {
    select: 'd.user_id, d.full_name, d.email, d.role, u.account_status, u.created_at, d.petitions_created, d.petitions_signed, d.comments_posted',
    from: 'v_user_dashboard d JOIN users u ON u.user_id = d.user_id',
    where,
    params,
    order: 'u.created_at DESC, d.user_id DESC',
  });
};

// PATCH /api/admin/users/:id  { accountStatus }
exports.updateUser = async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) throw new ApiError(400, 'You cannot change the status of your own account');
  const [r] = await pool.query('UPDATE users SET account_status = ? WHERE user_id = ?', [req.body.accountStatus, id]);
  if (!r.affectedRows) throw new ApiError(404, 'User not found');
  res.json({ data: { userId: id, accountStatus: req.body.accountStatus } });
};
