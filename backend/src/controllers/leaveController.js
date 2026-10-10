const mongoose = require('mongoose');
const Leave = require('../models/Leave');
const LeaveType = require('../models/LeaveType');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/pagination');
const { startOfDay } = require('../utils/time');
const {
  initialApprovals, awaitingFilter, visibleToEmployee, recordDecision, notifyApprovers, notifyDecision, APPROVAL_POPULATE,
} = require('../utils/approval');

const fmt = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

const applyLeave = async (req, res, next) => {
  try {
    const { leaveType, fromDate, toDate, reason, halfDay, halfDayType } = req.body;
    // Employees always apply for themselves; HR can apply on behalf of anyone
    const employee = req.user.role === 'employee' ? req.user.employee : (req.body.employee || req.user.employee);
    if (!employee) throw new ApiError('Employee is required', 400);

    if (!leaveType || !fromDate || !reason?.trim()) throw new ApiError('Leave type, dates and reason are required', 400);

    const from = startOfDay(fromDate);
    const to = halfDay ? from : startOfDay(toDate || fromDate);
    if (to < from) throw new ApiError('To date cannot be before from date', 400);
    const totalDays = halfDay ? 0.5 : Math.round((to - from) / 86400000) + 1;

    // Paid leave types are limited by the yearly balance (pending requests reserve balance too)
    const type = await LeaveType.findById(leaveType).lean();
    if (!type) throw new ApiError('Invalid leave type', 400);
    if (type.isPaid !== false) {
      const used = await takenByType(employee, from.getFullYear(), ['approved', 'pending'], leaveType);
      const remaining = type.totalDays - used;
      if (totalDays > remaining) {
        throw new ApiError(`Insufficient ${type.leaveTypeName} balance (${remaining} day(s) left). Apply the extra days as Loss of Pay.`, 400);
      }
    }

    const overlap = await Leave.findOne({
      employee, status: { $in: ['pending', 'approved'] },
      fromDate: { $lte: to }, toDate: { $gte: from },
    });
    if (overlap) throw new ApiError('A leave request already exists for these dates', 400);

    const leave = await Leave.create({
      employee, leaveType, fromDate: from, toDate: to, totalDays, reason,
      halfDay: !!halfDay, halfDayType: halfDay ? (halfDayType || 'first_half') : undefined,
      approvals: await initialApprovals(employee, 'leave'),
    });

    const emp = await Employee.findById(employee).select('firstName lastName').lean();
    notifyApprovers(leave.approvals, {
      title: 'New leave request',
      message: `${emp?.firstName} ${emp?.lastName} · ${type.leaveTypeName} · ${totalDays} day(s) · ${fmt(from)} – ${fmt(to)}`,
      type: 'leave',
      link: '/leave',
    }, req.user._id);
    ApiResponse.created(res, leave, 'Leave application submitted');
  } catch (error) {
    next(error);
  }
};

const getLeaves = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, employee, leaveType, awaiting } = req.query;
    let filter = {};

    if (status) filter.status = status;
    if (employee) filter.employee = employee;
    if (leaveType) filter.leaveType = leaveType;

    // Employees see their own leaves plus the ones they approve as a reporting manager
    if (awaiting === 'me') filter = { ...filter, ...awaitingFilter(req.user) };
    else if (req.user.role === 'employee') filter = { ...filter, ...visibleToEmployee(req.user) };

    const { docs, pagination } = await paginate(Leave, filter, {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: [
        { path: 'employee', select: 'firstName lastName employeeId photo' },
        { path: 'leaveType', select: 'leaveTypeName leaveCode isPaid' },
        { path: 'approvedBy', select: 'name email' },
        ...APPROVAL_POPULATE,
      ],
    });

    ApiResponse.paginated(res, docs, pagination);
  } catch (error) {
    next(error);
  }
};

const getLeaveById = async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId')
      .populate('leaveType', 'leaveTypeName leaveCode')
      .populate('approvedBy', 'name')
      .populate(APPROVAL_POPULATE);
    if (!leave) throw new ApiError('Leave not found', 404);
    ApiResponse.success(res, leave);
  } catch (error) {
    next(error);
  }
};

// Every approver must approve; any one of them can reject
const decideLeave = (decision) => async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) throw new ApiError('Leave not found', 404);

    const remarks = req.body?.remarks || req.body?.rejectionReason;
    const result = recordDecision(leave, { user: req.user, employeeId: leave.employee, decision, remarks });
    if (result.final) {
      leave.approvedBy = req.user._id;
      leave.approvedAt = new Date();
      if (decision === 'rejected') leave.rejectionReason = remarks;
    }
    await leave.save();

    if (leave.status === 'approved') await markLeaveInAttendance(leave, req.user._id);

    notifyDecision(leave, result, {
      employeeId: leave.employee,
      label: `Leave (${fmt(leave.fromDate)} – ${fmt(leave.toDate)})`,
      link: '/leave',
      type: 'leave',
    }, req.user);

    const msg = result.final ? `Leave ${leave.status}` : `Your approval is recorded. Waiting for ${result.waiting} more approver(s).`;
    ApiResponse.success(res, leave, msg);
  } catch (error) {
    next(error);
  }
};

// Reflect an approved leave in attendance (skip days that already have a check-in)
const markLeaveInAttendance = async (leave, userId) => {
  const ops = [];
  for (let d = new Date(leave.fromDate); d <= leave.toDate; d.setDate(d.getDate() + 1)) {
    const day = startOfDay(d);
    ops.push({
      updateOne: {
        filter: { employee: leave.employee, date: day, checkIn: { $in: [null, ''] } },
        update: { $set: { attendanceStatus: leave.halfDay ? 'half_day' : 'on_leave', notes: 'Approved leave', markedBy: userId } },
        upsert: true,
      },
    });
  }
  if (ops.length) await Attendance.bulkWrite(ops, { ordered: false }).catch(() => {});
};

const cancelLeave = async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) throw new ApiError('Leave not found', 404);
    if (!['pending'].includes(leave.status)) throw new ApiError('Cannot cancel this leave', 400);
    if (req.user.role === 'employee' && String(leave.employee) !== String(req.user.employee)) {
      throw new ApiError('You can only cancel your own leave', 403);
    }

    leave.status = 'cancelled';
    await leave.save();

    ApiResponse.success(res, leave, 'Leave cancelled');
  } catch (error) {
    next(error);
  }
};

const getLeaveBalance = async (req, res, next) => {
  try {
    const employeeId = req.user.role === 'employee' ? req.user.employee : (req.params.employeeId || req.user.employee);
    if (!employeeId) throw new ApiError('No employee profile linked', 400);
    const currentYear = new Date().getFullYear();

    const [leaveTypes, taken, pending] = await Promise.all([
      LeaveType.find({ status: 'active' }),
      takenByType(employeeId, currentYear, ['approved']),
      takenByType(employeeId, currentYear, ['pending']),
    ]);

    const balance = leaveTypes.map((lt) => {
      const id = lt._id.toString();
      const usedDays = taken[id] || 0;
      const pendingDays = pending[id] || 0;
      return {
        leaveType: lt,
        isPaid: lt.isPaid !== false,
        allocated: lt.totalDays,
        taken: usedDays,
        pending: pendingDays,
        // Unpaid leave has no limit
        remaining: lt.isPaid === false ? null : lt.totalDays - usedDays - pendingDays,
      };
    });

    ApiResponse.success(res, balance);
  } catch (error) {
    next(error);
  }
};

// Days per leave type in a year for the given statuses → { [leaveTypeId]: days }, or a number when leaveType is given
const takenByType = async (employeeId, year, statuses, leaveType) => {
  const toId = (v) => (v instanceof mongoose.Types.ObjectId ? v : mongoose.Types.ObjectId.createFromHexString(String(v)));
  const rows = await Leave.aggregate([
    {
      $match: {
        employee: toId(employeeId),
        status: { $in: statuses },
        fromDate: { $gte: new Date(year, 0, 1), $lt: new Date(year + 1, 0, 1) },
        ...(leaveType && { leaveType: toId(leaveType) }),
      },
    },
    { $group: { _id: '$leaveType', days: { $sum: '$totalDays' } } },
  ]);
  if (leaveType) return rows[0]?.days || 0;
  return Object.fromEntries(rows.map((r) => [String(r._id), r.days]));
};

// Leave Type CRUD
const createLeaveType = async (req, res, next) => {
  try {
    const lt = await LeaveType.create(req.body);
    ApiResponse.created(res, lt, 'Leave type created');
  } catch (error) {
    next(error);
  }
};

const getLeaveTypes = async (req, res, next) => {
  try {
    const types = await LeaveType.find({ status: 'active' });
    ApiResponse.success(res, types);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  applyLeave, getLeaves, getLeaveById,
  approveLeave: decideLeave('approved'),
  rejectLeave: decideLeave('rejected'),
  cancelLeave, getLeaveBalance, createLeaveType, getLeaveTypes,
};
