const router = require('express').Router();
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const admin = require('../controllers/admin.controller');
const { PETITION_STATUSES, COMMENT_STATUSES, REPORT_STATUSES, FEEDBACK_STATUSES } = require('../constants');

// Every /api/admin route needs a logged-in admin.
router.use(requireAuth, requireAdmin);

const id = param('id').isInt({ min: 1 });
const statusFilter = (allowed) => query('status').optional().isIn([...allowed, 'all']).withMessage('Unknown status filter');

router.get('/stats', asyncHandler(admin.stats));
router.get('/petitions', statusFilter(PETITION_STATUSES), validate, asyncHandler(admin.petitions));

router.get('/comments', statusFilter(COMMENT_STATUSES), validate, asyncHandler(admin.comments));
router.patch('/comments/:id', id, body('status').isIn(COMMENT_STATUSES).withMessage('Status must be visible, hidden or removed'), validate, asyncHandler(admin.updateComment));

router.get('/reports', statusFilter(REPORT_STATUSES), validate, asyncHandler(admin.reports));
router.patch(
  '/reports/:id',
  id,
  body('status').isIn(REPORT_STATUSES.filter((s) => s !== 'pending')).withMessage('Status must be reviewed, dismissed or action_taken'),
  body('adminNote').optional({ values: 'null' }).isString().trim().isLength({ max: 500 }),
  validate,
  asyncHandler(admin.updateReport)
);

router.get('/feedback', statusFilter(FEEDBACK_STATUSES), validate, asyncHandler(admin.feedback));
router.patch('/feedback/:id', id, body('status').isIn(['reviewed', 'resolved']).withMessage('Status must be reviewed or resolved'), validate, asyncHandler(admin.updateFeedback));

router.get('/users', statusFilter(['active', 'suspended']), validate, asyncHandler(admin.users));
router.patch('/users/:id', id, body('accountStatus').isIn(['active', 'suspended']).withMessage('accountStatus must be active or suspended'), validate, asyncHandler(admin.updateUser));

module.exports = router;
