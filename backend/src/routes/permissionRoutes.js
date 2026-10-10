const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/permissionController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/quota', ctrl.getQuota);
router.get('/', ctrl.getPermissions);
router.post('/', ctrl.applyPermission);
router.put('/:id/approve', ctrl.approvePermission); // approver check happens in recordDecision
router.put('/:id/reject', ctrl.rejectPermission);
router.put('/:id/cancel', ctrl.cancelPermission);

module.exports = router;
