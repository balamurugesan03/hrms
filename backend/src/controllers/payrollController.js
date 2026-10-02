const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/pagination');

const processPayroll = async (req, res, next) => {
  try {
    const { employee, month, year, basicSalary, allowances = [], deductions = [], overtimePay = 0, remarks } = req.body;

    const existing = await Payroll.findOne({ employee, month, year });
    if (existing) throw new ApiError('Payroll already processed for this month', 400);

    // Calculate attendance
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    const workingDays = end.getDate();

    const attendanceRecords = await Attendance.find({
      employee,
      date: { $gte: start, $lte: end },
    });

    const presentDays = attendanceRecords.filter((a) =>
      ['present', 'late', 'half_day'].includes(a.attendanceStatus)
    ).reduce((sum, a) => sum + (a.attendanceStatus === 'half_day' ? 0.5 : 1), 0);

    const absentDays = workingDays - presentDays;
    const totalAllowances = allowances.reduce((sum, a) => sum + (a.amount || 0), 0);
    const totalDeductions = deductions.reduce((sum, d) => sum + (d.amount || 0), 0);
    const grossSalary = basicSalary + totalAllowances + overtimePay;
    const netSalary = grossSalary - totalDeductions;

    const payroll = await Payroll.create({
      employee,
      month,
      year,
      basicSalary,
      allowances,
      deductions,
      totalAllowances,
      totalDeductions,
      overtimePay,
      grossSalary,
      netSalary,
      workingDays,
      presentDays,
      absentDays,
      status: 'processed',
      processedBy: req.user._id,
      processedAt: new Date(),
      remarks,
    });

    ApiResponse.created(res, payroll, 'Payroll processed successfully');
  } catch (error) {
    next(error);
  }
};

const getPayrolls = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, month, year, status, employee } = req.query;
    const filter = {};
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);
    if (status) filter.status = status;
    if (employee) filter.employee = employee;

    if (req.user.role === 'employee' && req.user.employee) {
      filter.employee = req.user.employee;
    }

    const { docs, pagination } = await paginate(Payroll, filter, {
      page,
      limit,
      sort: { year: -1, month: -1 },
      populate: { path: 'employee', select: 'firstName lastName employeeId department designation' },
    });

    ApiResponse.paginated(res, docs, pagination);
  } catch (error) {
    next(error);
  }
};

const getPayrollById = async (req, res, next) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate('employee', 'firstName lastName employeeId email mobile department designation bankName accountNumber ifscCode')
      .populate('processedBy', 'name');
    if (!payroll) throw new ApiError('Payroll not found', 404);
    ApiResponse.success(res, payroll);
  } catch (error) {
    next(error);
  }
};

const markPaid = async (req, res, next) => {
  try {
    const payroll = await Payroll.findByIdAndUpdate(
      req.params.id,
      { status: 'paid', paidAt: new Date(), paymentMode: req.body.paymentMode || 'bank_transfer' },
      { new: true }
    );
    if (!payroll) throw new ApiError('Payroll not found', 404);
    ApiResponse.success(res, payroll, 'Payroll marked as paid');
  } catch (error) {
    next(error);
  }
};

const getPayrollSummary = async (req, res, next) => {
  try {
    const { month = new Date().getMonth() + 1, year = new Date().getFullYear() } = req.query;
    const summary = await Payroll.aggregate([
      { $match: { month: parseInt(month), year: parseInt(year) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalGross: { $sum: '$grossSalary' },
          totalNet: { $sum: '$netSalary' },
        },
      },
    ]);
    ApiResponse.success(res, summary);
  } catch (error) {
    next(error);
  }
};

module.exports = { processPayroll, getPayrolls, getPayrollById, markPaid, getPayrollSummary };
