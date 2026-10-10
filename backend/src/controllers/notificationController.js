const Notification = require('../models/Notification');
const ApiResponse = require('../utils/ApiResponse');

const getMine = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const [items, unread] = await Promise.all([
      Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(limit).lean(),
      Notification.countDocuments({ user: req.user._id, read: false }),
    ]);
    ApiResponse.success(res, { items, unread });
  } catch (error) {
    next(error);
  }
};

const markRead = async (req, res, next) => {
  try {
    await Notification.updateOne({ _id: req.params.id, user: req.user._id }, { read: true });
    ApiResponse.success(res, null, 'Marked as read');
  } catch (error) {
    next(error);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
    ApiResponse.success(res, null, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
};

const clearAll = async (req, res, next) => {
  try {
    await Notification.deleteMany({ user: req.user._id });
    ApiResponse.noContent(res, 'Notifications cleared');
  } catch (error) {
    next(error);
  }
};

module.exports = { getMine, markRead, markAllRead, clearAll };
