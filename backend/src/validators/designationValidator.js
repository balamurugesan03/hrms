const Joi = require('joi');

const designationSchema = Joi.object({
  designationCode: Joi.string().alphanum().min(2).max(20).required(),
  designationName: Joi.string().min(2).max(100).required(),
  department: Joi.string().hex().length(24).required(),
  description: Joi.string().max(500).optional().allow(''),
  status: Joi.string().valid('active', 'inactive').default('active'),
});

const updateDesignationSchema = Joi.object({
  designationCode: Joi.string().alphanum().min(2).max(20),
  designationName: Joi.string().min(2).max(100),
  department: Joi.string().hex().length(24),
  description: Joi.string().max(500).optional().allow(''),
  status: Joi.string().valid('active', 'inactive'),
}).min(1);

module.exports = { designationSchema, updateDesignationSchema };
