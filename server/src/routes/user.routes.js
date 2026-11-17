const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const { requireAuth } = require('../middleware/auth');
const users = require('../controllers/user.controller');

router.get('/me/dashboard', requireAuth, asyncHandler(users.dashboard));

module.exports = router;
