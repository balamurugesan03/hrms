const Notification = require('../models/Notification');
const User = require('../models/User');

// All helpers are fire-and-forget: a failed notification must never break the main request.
const notifyUsers = async (userIds, { title, message, type = 'general', link }) => {
  try {
    const ids = [...new Set(userIds.filter(Boolean).map(String))];
    if (!ids.length) return;
    await Notification.insertMany(ids.map((user) => ({ user, title, message, type, link })));
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

const notifyEmployee = async (employeeId, payload) => {
  try {
    if (!employeeId) return;
    const user = await User.findOne({ employee: employeeId }).select('_id').lean();
    if (user) await notifyUsers([user._id], payload);
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

const notifyHR = async (payload, excludeUserId) => {
  try {
    const users = await User.find({ role: { $in: ['super_admin', 'hr_manager'] }, status: 'active' }).select('_id').lean();
    await notifyUsers(
      users.map((u) => u._id).filter((id) => String(id) !== String(excludeUserId)),
      payload
    );
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

const notifyRole = async (role, payload) => {
  try {
    const users = await User.find({ role, status: 'active' }).select('_id').lean();
    await notifyUsers(users.map((u) => u._id), payload);
  } catch (err) {
    console.error('Notification error:', err.message);
  }
};

module.exports = { notifyUsers, notifyEmployee, notifyHR, notifyRole };
