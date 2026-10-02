const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/shiftController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authorize('super_admin', 'hr_manager'), ctrl.create);
router.put('/:id', authorize('super_admin', 'hr_manager'), ctrl.update);
router.delete('/:id', authorize('super_admin'), ctrl.remove);
router.post('/assign', authorize('super_admin', 'hr_manager'), ctrl.assignShift);

module.exports = router;
