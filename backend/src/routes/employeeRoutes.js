const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/employeeController');
const { protect, authorize } = require('../middleware/auth');
const { photoUpload, documentUpload } = require('../middleware/upload');

router.use(protect);

router.get('/profile', ctrl.getProfile);
router.get('/export', authorize('super_admin', 'hr_manager'), ctrl.exportExcel);
router.post('/import', authorize('super_admin', 'hr_manager'), documentUpload.single('file'), ctrl.importExcel);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authorize('super_admin', 'hr_manager'), photoUpload.single('photo'), ctrl.create);
router.put('/:id', authorize('super_admin', 'hr_manager'), photoUpload.single('photo'), ctrl.update);
router.delete('/:id', authorize('super_admin'), ctrl.remove);

module.exports = router;
