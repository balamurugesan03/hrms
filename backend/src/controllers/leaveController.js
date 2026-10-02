const Leave = require('../models/Leave');
const LeaveType = require('../models/LeaveType');
const Employee = require('../models/Employee');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/pagination');

const applyLeave = async (req, res, next) => {
  try {
    const { employee, leaveType, fromDate, toDate, reason, halfDay, halfDayType } = req.body;

    const from = new Date(fromDate);
    const to = new Date(toDate);
    let totalDays = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
    if (halfDay) totalDays = 0.5;

    const leave = await Leave.create({ employee, leaveType, fromDate: from, toDate: to, totalDays, reason, halfDay, halfDayType });
    ApiResponse.created(res, leave, 'Leave application submitted');
  } catch (error) {
    next(error);
  }
};

const getLeaves = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, employee, leaveType } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (employee) filter.employee = employee;
    if (leaveType) filter.leaveType = leaveType;

    // Employees can only see their own leaves
    if (req.user.role === 'employee' && req.user.employee) {
      filter.employee = req.user.employee;
    }

    const { docs, pagination } = await paginate(Leave, filter, {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: [
        { path: 'employee', select: 'firstName lastName employeeId photo' },
        { path: 'leaveType', select: 'leaveTypeName leaveCode' },
        { path: 'approvedBy', select: 'name email' },
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
      .populate('approvedBy', 'name');
    if (!leave) throw new ApiError('Leave not found', 404);
    ApiResponse.success(res, leave);
  } catch (error) {
    next(error);
  }
};

const approveLeave = async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) throw new ApiError('Leave not found', 404);
    if (leave.status !== 'pending') throw new ApiError('Leave is already processed', 400);

    leave.status = 'approved';
    leave.approvedBy = req.user._id;
    leave.approvedAt = new Date();
    await leave.save();

    ApiResponse.success(res, leave, 'Leave approved');
  } catch (error) {
    next(error);
  }
};

const rejectLeave = async (req, res, next) => {
  try {
    const { rejectionReason } = req.body;
    const leave = await Leave.findById(req.params.id);
    if (!leave) throw new ApiError('Leave not found', 404);
    if (leave.status !== 'pending') throw new ApiError('Leave is already processed', 400);

    leave.status = 'rejected';
    leave.approvedBy = req.user._id;
    leave.approvedAt = new Date();
    leave.rejectionReason = rejectionReason;
    await leave.save();

    ApiResponse.success(res, leave, 'Leave rejected');
  } catch (error) {
    next(error);
  }
};

const cancelLeave = async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) throw new ApiError('Leave not found', 404);
    if (!['pending'].includes(leave.status)) throw new ApiError('Cannot cancel this leave', 400);

    leave.status = 'cancelled';
    await leave.save();

    ApiResponse.success(res, leave, 'Leave cancelled');
  } catch (error) {
    next(error);
  }
};

const getLeaveBalance = async (req, res, next) => {
  try {
    const employeeId = req.params.employeeId || req.user.employee;
    const currentYear = new Date().getFullYear();

    const leaveTypes = await LeaveType.find({ status: 'active' });
    const takenLeaves = await Leave.aggregate([
      {
        $match: {
          employee: require('mongoose').Types.ObjectId.createFromHexString(employeeId.toString()),
          status: 'approved',
          fromDate: { $gte: new Date(`${currentYear}-01-01`), $lte: new Date(`${currentYear}-12-31`) },
        },
      },
      { $group: { _id: '$leaveType', totalTaken: { $sum: '$totalDays' } } },
    ]);

    const takenMap = {};
    takenLeaves.forEach((l) => { takenMap[l._id.toString()] = l.totalTaken; });

    const balance = leaveTypes.map((lt) => ({
      leaveType: lt,
      allocated: lt.totalDays,
      taken: takenMap[lt._id.toString()] || 0,
      remaining: lt.totalDays - (takenMap[lt._id.toString()] || 0),
    }));

    ApiResponse.success(res, balance);
  } catch (error) {
    next(error);
  }
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
  applyLeave, getLeaves, getLeaveById, approveLeave, rejectLeave,
  cancelLeave, getLeaveBalance, createLeaveType, getLeaveTypes,
};
