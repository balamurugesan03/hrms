const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/backupController');
const { protect, authorize } = require('../middleware/auth');

// Full data backup includes salaries and user accounts — Super Admin only
router.use(protect, authorize('super_admin'));
router.get('/modules', ctrl.listModules);
router.get('/export', ctrl.exportBackup);

module.exports = router;
