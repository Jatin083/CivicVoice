const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const reports = require('../controllers/report.controller');
const { REPORT_REASONS } = require('../constants');

router.post(
  '/',
  requireAuth,
  body('petitionId').optional({ values: 'null' }).isInt({ min: 1 }).toInt(),
  body('commentId').optional({ values: 'null' }).isInt({ min: 1 }).toInt(),
  body().custom((b) => (b.petitionId != null) !== (b.commentId != null)).withMessage('Report exactly one of a petition or a comment'),
  body('reason').isIn(REPORT_REASONS).withMessage(`Reason must be one of: ${REPORT_REASONS.join(', ')}`),
  body('details').optional({ values: 'null' }).isString().trim().isLength({ max: 1000 }),
  validate,
  asyncHandler(reports.create)
);

module.exports = router;
