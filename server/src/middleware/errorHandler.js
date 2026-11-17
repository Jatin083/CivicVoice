const ApiError = require('../utils/ApiError');

// SQLSTATEs raised by sp_sign_petition (see schema) -> HTTP status
const SQLSTATE_TO_HTTP = { 45400: 400, 45403: 403, 45404: 404, 45409: 409 };

// MySQL error numbers -> HTTP status
const ERRNO_TO_HTTP = {
  1062: 409, // ER_DUP_ENTRY (duplicate email, duplicate signature, ...)
  1452: 400, // ER_NO_REFERENCED_ROW_2 (FK points to a missing row)
  3819: 400, // ER_CHECK_CONSTRAINT_VIOLATED
};

// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { message: err.message, code: err.code, ...err.extra } });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Request body is not valid JSON' } });
  }
  if (err.sqlState && SQLSTATE_TO_HTTP[err.sqlState]) {
    return res.status(SQLSTATE_TO_HTTP[err.sqlState]).json({ error: { message: err.sqlMessage, code: err.sqlState } });
  }
  if (err.errno && ERRNO_TO_HTTP[err.errno]) {
    return res.status(ERRNO_TO_HTTP[err.errno]).json({ error: { message: friendly(err), code: err.code } });
  }
  console.error(err);
  return res.status(500).json({ error: { message: 'Something went wrong' } });
};

function friendly(err) {
  if (err.errno === 1062 && /email/.test(err.sqlMessage)) return 'An account with this email already exists';
  if (err.errno === 1062) return 'This record already exists';
  if (err.errno === 3819) return 'A value is outside the allowed range';
  return 'Invalid reference to a related record';
}
