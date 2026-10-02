const ApiError = require('../utils/ApiError');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((d) => d.message.replace(/"/g, '')).join(', ');
    return next(new ApiError(messages, 400));
  }
  next();
};

module.exports = validate;
