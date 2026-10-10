const Announcement = require('../models/Announcement');
const Employee = require('../models/Employee');
const User = require('../models/User');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { notifyUsers } = require('../utils/notify');

const isHR = (user) => ['super_admin', 'hr_manager'].includes(user.role);

const getAll = async (req, res, next) => {
  try {
    const { includeExpired, limit = 20 } = req.query;
    const conditions = [];

    if (!(isHR(req.user) && includeExpired === 'true')) {
      conditions.push({ $or: [{ expiresAt: null }, { expiresAt: { $gte: new Date() } }] });
    }

    // Employees only see company-wide posts and posts for their own department
    if (!isHR(req.user)) {
      const emp = req.user.employee ? await Employee.findById(req.user.employee).select('department').lean() : null;
      const audience = [{ department: null }];
      if (emp?.department) audience.push({ department: emp.department });
      conditions.push({ $or: audience });
    }

    const items = await Announcement.find(conditions.length ? { $and: conditions } : {})
      .sort({ pinned: -1, createdAt: -1 })
      .limit(Math.min(parseInt(limit) || 20, 100))
      .populate('createdBy', 'name')
      .populate('department', 'departmentName')
      .lean();

    ApiResponse.success(res, items);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { title, content, priority, department, pinned, expiresAt } = req.body;
    const announcement = await Announcement.create({
      title, content, priority, pinned,
      department: department || undefined,
      expiresAt: expiresAt || undefined,
      createdBy: req.user._id,
    });

    // Notify the target audience (HR always sees everything)
    const userFilter = { status: 'active', _id: { $ne: req.user._id } };
    if (department) {
      const empIds = await Employee.find({ department }).distinct('_id');
      userFilter.$or = [{ employee: { $in: empIds } }, { role: { $in: ['super_admin', 'hr_manager'] } }];
    }
    const users = await User.find(userFilter).select('_id').lean();
    notifyUsers(users.map((u) => u._id), {
      title: `📢 ${title}`,
      message: content.slice(0, 140),
      type: 'announcement',
      link: '/announcements',
    });

    ApiResponse.created(res, announcement, 'Announcement published');
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { title, content, priority, department, pinned, expiresAt } = req.body;
    const announcement = await Announcement.findByIdAndUpdate(
      req.params.id,
      { title, content, priority, pinned, department: department || null, expiresAt: expiresAt || null },
      { new: true, runValidators: true }
    );
    if (!announcement) throw new ApiError('Announcement not found', 404);
    ApiResponse.success(res, announcement, 'Announcement updated');
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const announcement = await Announcement.findByIdAndDelete(req.params.id);
    if (!announcement) throw new ApiError('Announcement not found', 404);
    ApiResponse.noContent(res, 'Announcement deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, create, update, remove };
