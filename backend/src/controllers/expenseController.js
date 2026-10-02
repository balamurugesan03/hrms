const Expense = require('../models/Expense');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/pagination');

const create = async (req, res, next) => {
  try {
    const attachment = req.file ? req.file.filename : null;
    const expense = await Expense.create({ ...req.body, attachment });
    ApiResponse.created(res, expense, 'Expense submitted');
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, employee } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (employee) filter.employee = employee;
    if (req.user.role === 'employee' && req.user.employee) filter.employee = req.user.employee;

    const { docs, pagination } = await paginate(Expense, filter, {
      page, limit, sort: { createdAt: -1 },
      populate: { path: 'employee', select: 'firstName lastName employeeId' },
    });
    ApiResponse.paginated(res, docs, pagination);
  } catch (error) {
    next(error);
  }
};

const approve = async (req, res, next) => {
  try {
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedBy: req.user._id, approvedAt: new Date() },
      { new: true }
    );
    if (!expense) throw new ApiError('Expense not found', 404);
    ApiResponse.success(res, expense, 'Expense approved');
  } catch (error) {
    next(error);
  }
};

const reject = async (req, res, next) => {
  try {
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', approvedBy: req.user._id, approvedAt: new Date(), rejectionReason: req.body.rejectionReason },
      { new: true }
    );
    if (!expense) throw new ApiError('Expense not found', 404);
    ApiResponse.success(res, expense, 'Expense rejected');
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    ApiResponse.noContent(res, 'Expense deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = { create, getAll, approve, reject, remove };
