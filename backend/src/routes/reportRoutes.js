const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect, authorize('super_admin', 'hr_manager'));
router.get('/employees', ctrl.employeeReport);
router.get('/attendance', ctrl.attendanceReport);
router.get('/leave', ctrl.leaveReport);
router.get('/payroll', ctrl.payrollReport);
router.get('/assets', ctrl.assetReport);

module.exports = router;
