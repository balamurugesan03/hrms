const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/attendanceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/me/today', ctrl.getMyToday);
router.post('/check-in', ctrl.checkIn);
router.post('/check-out', ctrl.checkOut);
router.get('/today', ctrl.getTodayAttendance);
router.get('/monthly-report', ctrl.getMonthlyReport);
router.get('/late', ctrl.getLateArrivals);
router.put('/:id/late/approve', ctrl.approveLate); // approver check happens in recordDecision
router.put('/:id/late/reject', ctrl.rejectLate);
router.get('/', ctrl.getAttendance);
router.post('/', authorize('super_admin', 'hr_manager'), ctrl.markAttendance);
router.post('/bulk', authorize('super_admin', 'hr_manager'), ctrl.bulkAttendance);

module.exports = router;
