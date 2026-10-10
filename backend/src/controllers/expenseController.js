const Expense = require('../models/Expense');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/pagination');
const { notifyEmployee, notifyHR } = require('../utils/notify');

const rs = (n) => `Rs. ${Number(n).toLocaleString('en-IN')}`;

const create = async (req, res, next) => {
  try {
    const attachment = req.file ? req.file.filename : null;
    // Employees always claim for themselves; HR can submit on behalf of anyone
    const employee = req.user.role === 'employee' ? req.user.employee : req.body.employee;
    if (!employee) throw new ApiError('Employee is required', 400);
    const { expenseType, amount, description, expenseDate } = req.body;
    const expense = await Expense.create({ employee, expenseType, amount, description, expenseDate, attachment });
    notifyHR({
      title: 'New expense claim',
      message: `${expenseType} · ${rs(amount)} · ${description}`,
      type: 'expense',
      link: '/expenses',
    }, req.user._id);
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
    notifyEmployee(expense.employee, {
      title: 'Expense approved ✅',
      message: `Your ${expense.expenseType} claim of ${rs(expense.amount)} was approved`,
      type: 'expense',
      link: '/expenses',
    });
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
    notifyEmployee(expense.employee, {
      title: 'Expense rejected',
      message: `Your ${expense.expenseType} claim of ${rs(expense.amount)} was rejected${req.body.rejectionReason ? `: ${req.body.rejectionReason}` : ''}`,
      type: 'expense',
      link: '/expenses',
    });
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
