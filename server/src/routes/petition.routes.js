const router = require('express').Router();
const { body, param, query } = require('express-validator');
const validate = require('../middleware/validate');
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const petitions = require('../controllers/petition.controller');
const { PETITION_STATUSES } = require('../constants');

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const id = param('id').isInt({ min: 1 }).withMessage('Invalid petition id');

// Field rules shared by create (required where noted) and edit (all optional).
const petitionFields = (isCreate) => {
  const req = (chain) => (isCreate ? chain : chain.optional());
  return [
    req(body('title')).isString().trim().isLength({ min: 5, max: 200 }).withMessage('Title must be 5–200 characters'),
    req(body('description')).isString().trim().isLength({ min: 20 }).withMessage('Description must be at least 20 characters'),
    req(body('categoryId')).isInt({ min: 1 }).withMessage('Choose a category').toInt(),
    body('problemStatement').optional({ values: 'null' }).isString().trim().isLength({ max: 5000 }),
    body('proposedSolution').optional({ values: 'null' }).isString().trim().isLength({ max: 5000 }),
    body('location').optional({ values: 'null' }).isString().trim().isLength({ max: 150 }).withMessage('Location is at most 150 characters'),
    body('endDate')
      .optional({ values: 'falsy' })
      .isISO8601({ strict: true })
      .withMessage('End date must be a valid date')
      .bail()
      .custom((v) => v.slice(0, 10) > today())
      .withMessage('End date must be in the future')
      .customSanitizer((v) => v.slice(0, 10)),
    body('targetSignatures')
      .optional({ values: 'falsy' })
      .isInt({ min: 1, max: 1000000 })
      .withMessage('Target must be between 1 and 1,000,000')
      .toInt(),
  ];
};

router.get(
  '/',
  query('sort').optional().isIn(['newest', 'popular', 'ending']).withMessage('sort must be newest, popular or ending'),
  query('status').optional().isIn(['published', 'approved', 'under_review', 'closed', 'all']).withMessage('Unknown status filter'),
  query('category').optional({ values: 'falsy' }).isInt({ min: 1 }),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  validate,
  asyncHandler(petitions.list)
);

router.post(
  '/',
  requireAuth,
  ...petitionFields(true),
  body('status').optional().isIn(['draft', 'published']).withMessage('New petitions are saved as draft or published'),
  validate,
  asyncHandler(petitions.create)
);

router.get('/:id', id, validate, optionalAuth, asyncHandler(petitions.getOne));
router.patch('/:id', requireAuth, id, ...petitionFields(false), validate, asyncHandler(petitions.update));
router.patch(
  '/:id/status',
  requireAuth,
  id,
  body('status').isIn(PETITION_STATUSES).withMessage('Unknown status'),
  body('adminNote').optional({ values: 'null' }).isString().trim().isLength({ max: 500 }).withMessage('Note is at most 500 characters'),
  validate,
  asyncHandler(petitions.changeStatus)
);
router.post('/:id/sign', requireAuth, id, validate, asyncHandler(petitions.sign));

// Comments are nested under a petition: /api/petitions/:id/comments
router.use('/:id/comments', require('./comment.routes'));

module.exports = router;
