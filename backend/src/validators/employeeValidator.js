const Joi = require('joi');

const employeeSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  gender: Joi.string().valid('male', 'female', 'other').required(),
  dob: Joi.date().optional().allow(null, ''),
  mobile: Joi.string().pattern(/^[0-9]{10}$/).optional().allow(''),
  email: Joi.string().email().required(),
  address: Joi.object({
    street: Joi.string().optional().allow(''),
    city: Joi.string().optional().allow(''),
    state: Joi.string().optional().allow(''),
    country: Joi.string().optional().allow(''),
    pincode: Joi.string().optional().allow(''),
  }).optional(),
  bloodGroup: Joi.string().valid('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-').optional().allow(''),
  maritalStatus: Joi.string().valid('single', 'married', 'divorced', 'widowed').optional().allow(''),
  joiningDate: Joi.date().required(),
  department: Joi.string().hex().length(24).required(),
  designation: Joi.string().hex().length(24).required(),
  reportingManager: Joi.string().hex().length(24).optional().allow('', null),
  employmentType: Joi.string().valid('full_time', 'part_time', 'contract', 'intern').default('full_time'),
  salary: Joi.number().min(0).optional(),
  bankName: Joi.string().optional().allow(''),
  accountNumber: Joi.string().optional().allow(''),
  ifscCode: Joi.string().optional().allow(''),
  panNumber: Joi.string().optional().allow(''),
  aadhaarNumber: Joi.string().optional().allow(''),
  status: Joi.string().valid('active', 'inactive', 'terminated', 'on_leave').default('active'),
});

module.exports = { employeeSchema };
