const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/assetController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authorize('super_admin', 'hr_manager'), ctrl.create);
router.put('/:id', authorize('super_admin', 'hr_manager'), ctrl.update);
router.put('/:id/assign', authorize('super_admin', 'hr_manager'), ctrl.assign);
router.put('/:id/return', authorize('super_admin', 'hr_manager'), ctrl.returnAsset);
router.delete('/:id', authorize('super_admin'), ctrl.remove);

module.exports = router;
