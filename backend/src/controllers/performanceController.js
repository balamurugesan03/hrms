const Performance = require('../models/Performance');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/pagination');

const create = async (req, res, next) => {
  try {
    const performance = await Performance.create({ ...req.body, reviewer: req.user._id });
    ApiResponse.created(res, performance, 'Performance review created');
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, employee, status } = req.query;
    const filter = {};
    if (employee) filter.employee = employee;
    if (status) filter.status = status;
    if (req.user.role === 'employee' && req.user.employee) filter.employee = req.user.employee;

    const { docs, pagination } = await paginate(Performance, filter, {
      page, limit, sort: { reviewDate: -1 },
      populate: [
        { path: 'employee', select: 'firstName lastName employeeId' },
        { path: 'reviewer', select: 'name email' },
      ],
    });
    ApiResponse.paginated(res, docs, pagination);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const perf = await Performance.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId department designation')
      .populate('reviewer', 'name email');
    if (!perf) throw new ApiError('Performance review not found', 404);
    ApiResponse.success(res, perf);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const perf = await Performance.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!perf) throw new ApiError('Performance review not found', 404);
    ApiResponse.success(res, perf, 'Performance review updated');
  } catch (error) {
    next(error);
  }
};

const acknowledge = async (req, res, next) => {
  try {
    const perf = await Performance.findByIdAndUpdate(
      req.params.id,
      { status: 'acknowledged', acknowledgedAt: new Date(), employeeComments: req.body.employeeComments },
      { new: true }
    );
    if (!perf) throw new ApiError('Performance review not found', 404);
    ApiResponse.success(res, perf, 'Performance review acknowledged');
  } catch (error) {
    next(error);
  }
};

module.exports = { create, getAll, getById, update, acknowledge };
