const { validationResult } = require('express-validator');

// Put after a list of express-validator checks; returns 422 with field errors.
module.exports = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  return res.status(422).json({
    error: { message: 'Validation failed', fields: result.array().map((e) => ({ field: e.path, message: e.msg })) },
  });
};
