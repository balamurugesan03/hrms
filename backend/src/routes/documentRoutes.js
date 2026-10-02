const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/documentController');
const { protect, authorize } = require('../middleware/auth');
const { documentUpload } = require('../middleware/upload');

router.use(protect);
router.get('/:employeeId', ctrl.getDocuments);
router.post('/upload', authorize('super_admin', 'hr_manager'), documentUpload.single('document'), ctrl.uploadDocument);
router.delete('/:employeeId/:documentId', authorize('super_admin', 'hr_manager'), ctrl.deleteDocument);

module.exports = router;
