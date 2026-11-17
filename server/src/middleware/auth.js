const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

async function loadUser(userId) {
  const [rows] = await pool.query(
    'SELECT user_id, full_name, email, role, account_status FROM users WHERE user_id = ?',
    [userId]
  );
  return rows[0];
}

const toReqUser = (u) => ({ id: u.user_id, name: u.full_name, email: u.email, role: u.role });

const readBearer = (req) => {
  const [type, token] = (req.headers.authorization || '').split(' ');
  return type === 'Bearer' && token ? token : null;
};

// Verifies the JWT and re-reads role/status from the DB on every request,
// so a suspended user or a role change takes effect immediately.
const requireAuth = asyncHandler(async (req, res, next) => {
  const token = readBearer(req);
  if (!token) throw new ApiError(401, 'Login required');

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }

  const user = await loadUser(payload.sub);
  if (!user) throw new ApiError(401, 'User no longer exists');
  if (user.account_status !== 'active') throw new ApiError(403, 'Your account is suspended');

  req.user = toReqUser(user);
  next();
});

// Like requireAuth but never throws: sets req.user only for a valid token of an active user.
// Used on public reads so the response can include signedByMe / canEdit.
const optionalAuth = asyncHandler(async (req, res, next) => {
  const token = readBearer(req);
  if (token) {
    let payload = null;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      payload = null; // a bad token on a public route is treated as a guest
    }
    if (payload) {
      const user = await loadUser(payload.sub);
      if (user && user.account_status === 'active') req.user = toReqUser(user);
    }
  }
  next();
});

const requireAdmin = (req, res, next) =>
  req.user?.role === 'admin' ? next() : next(new ApiError(403, 'Admin access only'));

module.exports = { requireAuth, requireAdmin, optionalAuth };
