const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/announcementController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/', ctrl.getAll);
router.post('/', authorize('super_admin', 'hr_manager'), ctrl.create);
router.put('/:id', authorize('super_admin', 'hr_manager'), ctrl.update);
router.delete('/:id', authorize('super_admin', 'hr_manager'), ctrl.remove);

module.exports = router;
