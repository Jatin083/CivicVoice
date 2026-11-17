const router = require('express').Router();

router.use('/auth', require('./auth.routes'));
router.use('/categories', require('./category.routes'));
router.use('/petitions', require('./petition.routes'));
router.use('/reports', require('./report.routes'));
router.use('/feedback', require('./feedback.routes'));
router.use('/users', require('./user.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;
