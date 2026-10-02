const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dashboardController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/stats', ctrl.getDashboardStats);
router.get('/attendance-trend', ctrl.getAttendanceTrend);
router.get('/employee-growth', ctrl.getEmployeeGrowth);
router.get('/leave-analytics', ctrl.getLeaveAnalytics);
router.get('/payroll-analytics', ctrl.getPayrollAnalytics);

module.exports = router;
