const Joi = require('joi');

const departmentSchema = Joi.object({
  departmentCode: Joi.string().alphanum().min(2).max(20).required(),
  departmentName: Joi.string().min(2).max(100).required(),
  description: Joi.string().max(500).optional().allow(''),
  status: Joi.string().valid('active', 'inactive').default('active'),
});

const updateDepartmentSchema = Joi.object({
  departmentCode: Joi.string().alphanum().min(2).max(20),
  departmentName: Joi.string().min(2).max(100),
  description: Joi.string().max(500).optional().allow(''),
  status: Joi.string().valid('active', 'inactive'),
}).min(1);

module.exports = { departmentSchema, updateDepartmentSchema };
