const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/designationController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { designationSchema, updateDesignationSchema } = require('../validators/designationValidator');

router.use(protect);

router.get('/dropdown', ctrl.getDropdown);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authorize('super_admin', 'hr_manager'), validate(designationSchema), ctrl.create);
router.put('/:id', authorize('super_admin', 'hr_manager'), validate(updateDesignationSchema), ctrl.update);
router.delete('/:id', authorize('super_admin'), ctrl.remove);

module.exports = router;
