const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const auth = require('../controllers/auth.controller');

router.post(
  '/register',
  body('fullName').isString().trim().isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),
  body('email').isEmail().withMessage('Enter a valid email').isLength({ max: 150 }),
  body('password').isString().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('phone').optional({ values: 'falsy' }).isString().trim().matches(/^[0-9+\-\s]{7,20}$/).withMessage('Enter a valid phone number'),
  validate,
  asyncHandler(auth.register)
);
router.post(
  '/login',
  body('email').isEmail().withMessage('Enter a valid email'),
  body('password').isString().notEmpty().withMessage('Enter your password'),
  validate,
  asyncHandler(auth.login)
);
router.get('/me', requireAuth, asyncHandler(auth.me));

module.exports = router;
