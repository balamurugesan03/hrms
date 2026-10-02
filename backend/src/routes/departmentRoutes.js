const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/departmentController');
const { protect, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { departmentSchema, updateDepartmentSchema } = require('../validators/departmentValidator');

router.use(protect);

router.get('/dropdown', ctrl.getDropdown);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', authorize('super_admin', 'hr_manager'), validate(departmentSchema), ctrl.create);
router.put('/:id', authorize('super_admin', 'hr_manager'), validate(updateDepartmentSchema), ctrl.update);
router.delete('/:id', authorize('super_admin'), ctrl.remove);

module.exports = router;
