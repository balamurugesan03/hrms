const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new ApiError('Access denied. No token provided.', 401));
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password -resetPasswordToken -resetPasswordExpire');
    if (!user) return next(new ApiError('User not found', 401));
    if (user.status === 'inactive') return next(new ApiError('Account is inactive', 401));

    req.user = user;
    next();
  } catch (error) {
    next(new ApiError('Invalid or expired token', 401));
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(new ApiError(`Role '${req.user.role}' is not authorized to access this route`, 403));
  }
  next();
};

module.exports = { protect, authorize };
