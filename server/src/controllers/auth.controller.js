const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const ApiError = require('../utils/ApiError');

const sign = (user) =>
  jwt.sign({ sub: user.user_id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1d' });

const publicUser = (u) => ({ id: u.user_id, fullName: u.full_name, email: u.email, role: u.role });

exports.register = async (req, res) => {
  const { fullName, email, password, phone } = req.body;
  const hash = await bcrypt.hash(password, 10);
  const [r] = await pool.query(
    'INSERT INTO users (full_name, email, password_hash, phone) VALUES (?, ?, ?, ?)',
    [fullName, email.toLowerCase(), hash, phone || null]
  );
  const user = { user_id: r.insertId, full_name: fullName, email: email.toLowerCase(), role: 'user' };
  res.status(201).json({ data: { token: sign(user), user: publicUser(user) } });
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email.toLowerCase()]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new ApiError(401, 'Incorrect email or password');
  }
  if (user.account_status !== 'active') throw new ApiError(403, 'Your account is suspended');
  res.json({ data: { token: sign(user), user: publicUser(user) } });
};

// GET /api/auth/me — requireAuth has already re-read the user from the DB
exports.me = async (req, res) => {
  res.json({ data: { id: req.user.id, fullName: req.user.name, email: req.user.email, role: req.user.role } });
};
