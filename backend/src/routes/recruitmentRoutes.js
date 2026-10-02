const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/recruitmentController');
const { protect, authorize } = require('../middleware/auth');
const { documentUpload } = require('../middleware/upload');

router.use(protect);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authorize('super_admin', 'hr_manager'), ctrl.create);
router.put('/:id', authorize('super_admin', 'hr_manager'), ctrl.update);
router.delete('/:id', authorize('super_admin'), ctrl.remove);
router.post('/:id/candidates', authorize('super_admin', 'hr_manager'), documentUpload.single('resume'), ctrl.addCandidate);
router.put('/:id/candidates/stage', authorize('super_admin', 'hr_manager'), ctrl.updateCandidateStage);

module.exports = router;
