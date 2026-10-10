const Permission = require('../models/Permission');
const Employee = require('../models/Employee');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/pagination');
const { toMinutes, nowHHmm, startOfDay, monthRange, formatMinutes } = require('../utils/time');
const {
  initialApprovals, awaitingFilter, visibleToEmployee, recordDecision, notifyApprovers, notifyDecision, APPROVAL_POPULATE,
} = require('../utils/approval');

const MONTHLY_QUOTA = Number(process.env.PERMISSION_MONTHLY_MINUTES) || 120; // 2 hours
const MAX_PER_REQUEST = Number(process.env.PERMISSION_MAX_MINUTES) || 240; // longer than this → apply leave
// Permission requests are accepted only before this time of day (HH:mm); past dates are never allowed
const SAME_DAY_CUTOFF = process.env.PERMISSION_SAME_DAY_CUTOFF || '09:15';
const fmt12 = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

// Permission minutes in the month of `date`, split by status. Pending requests reserve quota too.
const monthUsage = async (employee, date) => {
  const { start, end } = monthRange(date.getMonth() + 1, date.getFullYear());
  const rows = await Permission.aggregate([
    {
      $match: {
        employee,
        status: { $in: ['pending', 'approved'] },
        date: { $gte: start, $lt: end },
      },
    },
    { $group: { _id: { type: '$type', status: '$status' }, minutes: { $sum: '$minutes' }, count: { $sum: 1 } } },
  ]);
  const pick = (type, status, field = 'minutes') => rows.find((r) => r._id.type === type && r._id.status === status)?.[field] || 0;
  return {
    approvedMinutes: pick('permission', 'approved'),
    pendingMinutes: pick('permission', 'pending'),
    halfDaysApproved: pick('half_day', 'approved', 'count'),
    halfDaysPending: pick('half_day', 'pending', 'count'),
  };
};

const quotaFor = async (employee, date) => {
  const usage = await monthUsage(employee, date);
  const used = usage.approvedMinutes + usage.pendingMinutes;
  return {
    quotaMinutes: MONTHLY_QUOTA,
    usedMinutes: used, // approved + pending
    ...usage,
    remainingMinutes: Math.max(0, MONTHLY_QUOTA - used),
    maxPerRequest: MAX_PER_REQUEST,
    sameDayCutoff: SAME_DAY_CUTOFF,
  };
};

const resolveEmployee = (req, fromBody) => {
  const employee = req.user.role === 'employee' ? req.user.employee : (fromBody || req.user.employee);
  if (!employee) throw new ApiError('No employee profile linked', 400);
  return require('mongoose').Types.ObjectId.createFromHexString(String(employee));
};

const getQuota = async (req, res, next) => {
  try {
    const employee = resolveEmployee(req, req.query.employee);
    const date = req.query.date ? startOfDay(req.query.date) : startOfDay(new Date());
    ApiResponse.success(res, await quotaFor(employee, date));
  } catch (error) {
    next(error);
  }
};

const applyPermission = async (req, res, next) => {
  try {
    const { date, fromTime, toTime, reason } = req.body;
    const employee = resolveEmployee(req, req.body.employee);
    if (!date || !fromTime || !toTime || !reason?.trim()) throw new ApiError('Date, from time, to time and reason are required', 400);

    const day = startOfDay(date);
    const today = startOfDay(new Date());
    if (day < today) throw new ApiError('Permission cannot be requested for a past date', 400);
    if (toMinutes(nowHHmm()) > toMinutes(SAME_DAY_CUTOFF)) {
      throw new ApiError(`Permission requests can only be submitted before ${fmt12(SAME_DAY_CUTOFF)}`, 400);
    }

    const minutes = toMinutes(toTime) - toMinutes(fromTime);
    if (!(minutes > 0)) throw new ApiError('To time must be after from time', 400);
    if (minutes > MAX_PER_REQUEST) {
      throw new ApiError(`Permission cannot exceed ${formatMinutes(MAX_PER_REQUEST)}. Please apply for leave instead.`, 400);
    }

    const overlap = await Permission.findOne({ employee, date: day, status: { $in: ['pending', 'approved'] } });
    if (overlap) throw new ApiError(`A permission request already exists for ${fmt(day)}`, 400);

    // Quota rule: if it does not fit in what is left this month, it becomes a half-day leave
    const { remainingMinutes } = await quotaFor(employee, day);
    const type = minutes <= remainingMinutes ? 'permission' : 'half_day';

    const permission = await Permission.create({
      employee, date: day, fromTime, toTime, minutes, reason, type,
      approvals: await initialApprovals(employee, 'permission'),
    });

    const emp = await Employee.findById(employee).select('firstName lastName').lean();
    notifyApprovers(permission.approvals, {
      title: type === 'half_day' ? 'Permission request (counts as half-day)' : 'New permission request',
      message: `${emp?.firstName} ${emp?.lastName} · ${fmt(day)} · ${fromTime}–${toTime} (${formatMinutes(minutes)})`,
      type: 'permission',
      link: '/leave?tab=permissions',
    }, req.user._id);

    ApiResponse.created(
      res, permission,
      type === 'half_day'
        ? 'Monthly permission limit exceeded — submitted as a half-day leave request'
        : 'Permission request submitted'
    );
  } catch (error) {
    next(error);
  }
};

const getPermissions = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, employee, month, year, awaiting } = req.query;
    let filter = {};
    if (status) filter.status = status;
    if (employee) filter.employee = employee;
    if (month && year) {
      const { start, end } = monthRange(Number(month), Number(year));
      filter.date = { $gte: start, $lt: end };
    }
    if (awaiting === 'me') filter = { ...filter, ...awaitingFilter(req.user) };
    else if (req.user.role === 'employee') filter = { ...filter, ...visibleToEmployee(req.user) };

    const { docs, pagination } = await paginate(Permission, filter, {
      page, limit, sort: { date: -1, createdAt: -1 },
      populate: [{ path: 'employee', select: 'firstName lastName employeeId isDriver' }, ...APPROVAL_POPULATE],
    });
    ApiResponse.paginated(res, docs, pagination);
  } catch (error) {
    next(error);
  }
};

const decide = (decision) => async (req, res, next) => {
  try {
    const permission = await Permission.findById(req.params.id);
    if (!permission) throw new ApiError('Permission request not found', 404);

    const remarks = req.body?.remarks || req.body?.rejectionReason;
    const result = recordDecision(permission, { user: req.user, employeeId: permission.employee, decision, remarks });
    if (permission.status === 'approved') permission.approvedAt = new Date();
    await permission.save();

    notifyDecision(permission, result, {
      employeeId: permission.employee,
      label: permission.type === 'half_day' ? 'Half-day (permission)' : 'Permission',
      link: '/leave?tab=permissions',
      type: 'permission',
    }, req.user);

    const msg = result.final ? `Permission ${permission.status}` : `Your approval is recorded. Waiting for ${result.waiting} more approver(s).`;
    ApiResponse.success(res, permission, msg);
  } catch (error) {
    next(error);
  }
};

const cancelPermission = async (req, res, next) => {
  try {
    const permission = await Permission.findById(req.params.id);
    if (!permission) throw new ApiError('Permission request not found', 404);
    if (permission.status !== 'pending') throw new ApiError('Only pending requests can be cancelled', 400);
    if (req.user.role === 'employee' && String(permission.employee) !== String(req.user.employee)) {
      throw new ApiError('You can only cancel your own request', 403);
    }
    permission.status = 'cancelled';
    await permission.save();
    ApiResponse.success(res, permission, 'Permission cancelled');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getQuota, applyPermission, getPermissions, cancelPermission,
  approvePermission: decide('approved'),
  rejectPermission: decide('rejected'),
  MONTHLY_QUOTA,
};
