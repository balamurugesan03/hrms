const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/leaveController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// Leave Types
router.get('/types', ctrl.getLeaveTypes);
router.post('/types', authorize('super_admin', 'hr_manager'), ctrl.createLeaveType);

// Leave Balance
router.get('/balance/:employeeId', ctrl.getLeaveBalance);

// Leave Management
router.get('/', ctrl.getLeaves);
router.get('/:id', ctrl.getLeaveById);
router.post('/', ctrl.applyLeave);
router.put('/:id/approve', ctrl.approveLeave); // approver check happens in recordDecision
router.put('/:id/reject', ctrl.rejectLeave);
router.put('/:id/cancel', ctrl.cancelLeave);

module.exports = router;
