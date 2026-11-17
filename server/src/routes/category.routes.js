const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const categories = require('../controllers/category.controller');

router.get('/', asyncHandler(categories.list));

module.exports = router;
