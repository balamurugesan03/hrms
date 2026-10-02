const authService = require('../services/authService');
const ApiResponse = require('../utils/ApiResponse');

const login = async (req, res, next) => {
  try {
    const data = await authService.login(req.body.email, req.body.password);
    ApiResponse.success(res, data, 'Login successful');
  } catch (error) {
    next(error);
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const data = await authService.refreshAccessToken(refreshToken);
    ApiResponse.success(res, data, 'Token refreshed');
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user._id);
    ApiResponse.success(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    ApiResponse.success(res, req.user, 'Profile fetched');
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const data = await authService.forgotPassword(req.body.email);
    ApiResponse.success(res, data, 'Password reset email sent');
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const data = await authService.resetPassword(req.params.token, req.body.password);
    ApiResponse.success(res, data, 'Password reset successful');
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const data = await authService.changePassword(req.user._id, currentPassword, newPassword);
    ApiResponse.success(res, data, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = { login, refreshToken, logout, getMe, forgotPassword, resetPassword, changePassword };
