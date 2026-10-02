const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/expenseController');
const { protect, authorize } = require('../middleware/auth');
const { expenseUpload } = require('../middleware/upload');

router.use(protect);
router.get('/', ctrl.getAll);
router.post('/', expenseUpload.single('attachment'), ctrl.create);
router.put('/:id/approve', authorize('super_admin', 'hr_manager'), ctrl.approve);
router.put('/:id/reject', authorize('super_admin', 'hr_manager'), ctrl.reject);
router.delete('/:id', authorize('super_admin', 'hr_manager'), ctrl.remove);

module.exports = router;
