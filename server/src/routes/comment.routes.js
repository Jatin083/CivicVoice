// Mounted at /api/petitions/:id/comments; mergeParams gives access to the petition :id.
const router = require('express').Router({ mergeParams: true });
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const comments = require('../controllers/comment.controller');

const id = param('id').isInt({ min: 1 }).withMessage('Invalid petition id');

router.get('/', id, validate, asyncHandler(comments.list));
router.post(
  '/',
  requireAuth,
  id,
  body('text').isString().trim().isLength({ min: 1, max: 1000 }).withMessage('Comment must be 1–1,000 characters'),
  validate,
  asyncHandler(comments.create)
);

module.exports = router;
