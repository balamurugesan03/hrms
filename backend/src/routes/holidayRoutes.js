const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/holidayController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/upcoming', ctrl.getUpcoming);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authorize('super_admin', 'hr_manager'), ctrl.create);
router.put('/:id', authorize('super_admin', 'hr_manager'), ctrl.update);
router.delete('/:id', authorize('super_admin'), ctrl.remove);

module.exports = router;
