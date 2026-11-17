const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const feedback = require('../controllers/feedback.controller');

router.post(
  '/',
  requireAuth,
  body('subject').isString().trim().isLength({ min: 3, max: 150 }).withMessage('Subject must be 3–150 characters'),
  body('message').isString().trim().isLength({ min: 5 }).withMessage('Message must be at least 5 characters'),
  body('rating').optional({ values: 'null' }).isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5').toInt(),
  validate,
  asyncHandler(feedback.create)
);

module.exports = router;
