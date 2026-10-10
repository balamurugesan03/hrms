const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/companyController');
const { protect, authorize } = require('../middleware/auth');
const { photoUpload } = require('../middleware/upload');

router.use(protect);

router.get('/', ctrl.getCompany);
router.put('/', authorize('super_admin'), photoUpload.single('logo'), ctrl.updateCompany);

module.exports = router;
