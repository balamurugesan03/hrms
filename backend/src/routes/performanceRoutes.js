const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/performanceController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authorize('super_admin', 'hr_manager'), ctrl.create);
router.put('/:id', authorize('super_admin', 'hr_manager'), ctrl.update);
router.put('/:id/acknowledge', ctrl.acknowledge);

module.exports = router;
