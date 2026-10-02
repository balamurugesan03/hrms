const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { sendPasswordResetEmail } = require('../utils/emailService');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
  const refreshToken = jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d',
  });
  return { accessToken, refreshToken };
};

const login = async (email, password) => {
  const user = await User.findOne({ email }).select('+password');
  if (!user) throw new ApiError('Invalid email or password', 401);
  if (user.status === 'inactive') throw new ApiError('Your account is inactive. Contact admin.', 401);

  const isMatch = await user.matchPassword(password);
  if (!isMatch) throw new ApiError('Invalid email or password', 401);

  const { accessToken, refreshToken } = generateTokens(user._id);

  user.lastLogin = new Date();
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false });

  return {
    accessToken,
    refreshToken,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      lastLogin: user.lastLogin,
    },
  };
};

const refreshAccessToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== refreshToken) {
      throw new ApiError('Invalid refresh token', 401);
    }
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);
    user.refreshToken = newRefreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken: newRefreshToken };
  } catch {
    throw new ApiError('Invalid or expired refresh token', 401);
  }
};

const logout = async (userId) => {
  await User.findByIdAndUpdate(userId, { refreshToken: null });
};

const forgotPassword = async (email) => {
  const user = await User.findOne({ email });
  if (!user) throw new ApiError('No user found with this email', 404);

  const resetToken = user.getResetPasswordToken();
  await user.save({ validateBeforeSave: false });

  try {
    await sendPasswordResetEmail(user.email, resetToken, user.name);
  } catch {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError('Email could not be sent', 500);
  }

  return { message: 'Password reset email sent' };
};

const resetPassword = async (token, password) => {
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpire: { $gt: Date.now() },
  }).select('+resetPasswordToken +resetPasswordExpire');

  if (!user) throw new ApiError('Invalid or expired reset token', 400);

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  return { message: 'Password reset successful' };
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');
  const isMatch = await user.matchPassword(currentPassword);
  if (!isMatch) throw new ApiError('Current password is incorrect', 400);

  user.password = newPassword;
  await user.save();

  return { message: 'Password changed successfully' };
};

module.exports = { login, refreshAccessToken, logout, forgotPassword, resetPassword, changePassword };
