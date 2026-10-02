const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/payrollController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/summary', authorize('super_admin', 'hr_manager'), ctrl.getPayrollSummary);
router.get('/', ctrl.getPayrolls);
router.get('/:id', ctrl.getPayrollById);
router.post('/', authorize('super_admin', 'hr_manager'), ctrl.processPayroll);
router.put('/:id/mark-paid', authorize('super_admin', 'hr_manager'), ctrl.markPaid);

module.exports = router;
