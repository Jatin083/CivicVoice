const pool = require('../config/db');
const ApiError = require('../utils/ApiError');
const {
  ALLOWED_TRANSITIONS,
  CREATOR_TRANSITIONS,
  PUBLIC_STATUSES,
  EDITABLE_STATUSES,
} = require('../constants');

const SORTS = {
  newest: 'created_at DESC, petition_id DESC',
  popular: 'total_signatures DESC, created_at DESC',
  ending: 'end_date IS NULL, end_date ASC, created_at DESC',
};

const isAdmin = (user) => user?.role === 'admin';
const isOwner = (user, petition) => user && petition.creator_id === user.id;

// Which next states this viewer may move the petition to.
function transitionsFor(user, petition) {
  if (!user) return [];
  if (isAdmin(user)) return ALLOWED_TRANSITIONS[petition.status] || [];
  if (isOwner(user, petition)) return CREATOR_TRANSITIONS[petition.status] || [];
  return [];
}

// GET /api/petitions?q=&category=&status=&sort=&page=&limit=
exports.list = async (req, res) => {
  const { q, category, status = 'published', sort = 'newest' } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));

  const where = [];
  const params = [];
  if (status === 'all') {
    // "all" means every public status, never drafts or rejected petitions
    where.push(`status IN (${PUBLIC_STATUSES.map(() => '?').join(',')})`);
    params.push(...PUBLIC_STATUSES);
  } else {
    where.push('status = ?');
    params.push(status);
  }
  if (category) { where.push('category_id = ?'); params.push(Number(category)); }
  if (q) {
    where.push('(title LIKE ? OR description LIKE ? OR location LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM v_petition_summary ${whereSql}`, params);
  const [rows] = await pool.query(
    `SELECT * FROM v_petition_summary ${whereSql} ORDER BY ${SORTS[sort] || SORTS.newest} LIMIT ? OFFSET ?`,
    [...params, limit, (page - 1) * limit]
  );
  res.json({ data: rows, meta: { page, limit, total } });
};

async function loadDetail(petitionId) {
  const [[p]] = await pool.query(
    `SELECT v.*, p.problem_statement, p.proposed_solution, p.admin_note, p.updated_at
     FROM v_petition_summary v JOIN petitions p ON p.petition_id = v.petition_id
     WHERE v.petition_id = ?`,
    [petitionId]
  );
  return p;
}

// GET /api/petitions/:id  (optionalAuth)
exports.getOne = async (req, res) => {
  const p = await loadDetail(Number(req.params.id));
  if (!p) throw new ApiError(404, 'Petition not found');

  // drafts and rejected petitions are visible only to their creator and admins
  if (!PUBLIC_STATUSES.includes(p.status) && !isOwner(req.user, p) && !isAdmin(req.user)) {
    throw new ApiError(404, 'Petition not found');
  }

  let signedByMe = false;
  if (req.user) {
    const [s] = await pool.query('SELECT 1 FROM signatures WHERE petition_id = ? AND user_id = ? LIMIT 1', [p.petition_id, req.user.id]);
    signedByMe = s.length > 0;
  }
  const canEdit = Boolean(req.user) && (isOwner(req.user, p) || isAdmin(req.user)) && EDITABLE_STATUSES.includes(p.status);

  res.json({ data: { ...p, signedByMe, canEdit, allowedTransitions: transitionsFor(req.user, p) } });
};

// POST /api/petitions
exports.create = async (req, res) => {
  const b = req.body;
  const [r] = await pool.query(
    `INSERT INTO petitions (creator_id, category_id, title, description, problem_statement,
       proposed_solution, target_signatures, status, location, end_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.id,
      b.categoryId,
      b.title,
      b.description,
      b.problemStatement || null,
      b.proposedSolution || null,
      b.targetSignatures || 100,
      b.status || 'published',
      b.location || null,
      b.endDate || null,
    ]
  );
  res.status(201).json({ data: { petitionId: r.insertId } });
};

// PATCH /api/petitions/:id — whitelisted fields only, while draft/published
const EDITABLE_FIELDS = {
  title: 'title',
  description: 'description',
  problemStatement: 'problem_statement',
  proposedSolution: 'proposed_solution',
  location: 'location',
  endDate: 'end_date',
  targetSignatures: 'target_signatures',
  categoryId: 'category_id',
};

exports.update = async (req, res) => {
  const id = Number(req.params.id);
  const [[p]] = await pool.query('SELECT petition_id, creator_id, status FROM petitions WHERE petition_id = ?', [id]);
  if (!p) throw new ApiError(404, 'Petition not found');
  if (!isOwner(req.user, p) && !isAdmin(req.user)) throw new ApiError(403, 'You can only edit your own petitions');
  if (!EDITABLE_STATUSES.includes(p.status)) {
    throw new ApiError(400, `A ${p.status.replace('_', ' ')} petition can no longer be edited`);
  }

  const sets = [];
  const params = [];
  for (const [key, column] of Object.entries(EDITABLE_FIELDS)) {
    if (req.body[key] !== undefined) {
      sets.push(`${column} = ?`); // column names come from the fixed whitelist above
      params.push(req.body[key] === '' ? null : req.body[key]);
    }
  }
  if (!sets.length) throw new ApiError(400, 'Nothing to update');

  await pool.query(`UPDATE petitions SET ${sets.join(', ')} WHERE petition_id = ?`, [...params, id]);
  res.json({ data: { petitionId: id } });
};

// PATCH /api/petitions/:id/status
exports.changeStatus = async (req, res) => {
  const id = Number(req.params.id);
  const { status: next, adminNote } = req.body;
  const [[p]] = await pool.query('SELECT petition_id, creator_id, status FROM petitions WHERE petition_id = ?', [id]);
  if (!p) throw new ApiError(404, 'Petition not found');

  const admin = isAdmin(req.user);
  if (!admin && !isOwner(req.user, p)) throw new ApiError(403, 'You can only change your own petitions');

  const allowed = admin ? ALLOWED_TRANSITIONS[p.status] : CREATOR_TRANSITIONS[p.status] || [];
  if (!allowed.includes(next)) {
    throw new ApiError(400, `Cannot change from ${p.status} to ${next}`, undefined, { allowed });
  }

  if (admin && adminNote !== undefined) {
    await pool.query('UPDATE petitions SET status = ?, admin_note = ? WHERE petition_id = ?', [next, adminNote || null, id]);
  } else {
    await pool.query('UPDATE petitions SET status = ? WHERE petition_id = ?', [next, id]);
  }
  res.json({ data: { petitionId: id, status: next } });
};

// POST /api/petitions/:id/sign
exports.sign = async (req, res) => {
  const petitionId = Number(req.params.id);
  await pool.query('CALL sp_sign_petition(?, ?)', [req.user.id, petitionId]);
  const [[summary]] = await pool.query(
    'SELECT total_signatures, progress_percentage FROM v_petition_summary WHERE petition_id = ?',
    [petitionId]
  );
  res.status(201).json({ data: { petitionId, ...summary, signedByMe: true } });
};
