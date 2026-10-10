const Payroll = require('../models/Payroll');
const Employee = require('../models/Employee');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/pagination');
const { notifyEmployee } = require('../utils/notify');
const { generatePayslip } = require('../utils/payslipPdf');
const { computeAttendanceSummary, computeSalary } = require('../services/payrollCalculator');
const { getCompanyDetails } = require('./companyController');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const assertOwnPayroll = (req, payroll) => {
  const empId = payroll.employee?._id || payroll.employee;
  if (req.user.role === 'employee' && String(empId) !== String(req.user.employee)) {
    throw new ApiError('You can only view your own payslips', 403);
  }
};

// Attendance / leave / permission breakdown + suggested salary structure, before processing
const previewPayroll = async (req, res, next) => {
  try {
    const { employee, month, year } = req.query;
    if (!employee || !month || !year) throw new ApiError('employee, month and year are required', 400);
    const { employee: emp, summary, days } = await computeAttendanceSummary(employee, Number(month), Number(year));
    const existing = await Payroll.findOne({ employee, month, year }).select('status').lean();
    ApiResponse.success(res, { employee: emp, summary, days, existingStatus: existing?.status || null });
  } catch (error) {
    next(error);
  }
};

const processPayroll = async (req, res, next) => {
  try {
    const { employee, basicSalary, allowances = [], deductions = [], overtimePay = 0, remarks } = req.body;
    const month = Number(req.body.month);
    const year = Number(req.body.year);
    if (!employee || !month || !year || basicSalary == null || basicSalary === '') {
      throw new ApiError('Employee, month, year and basic salary are required', 400);
    }

    // A draft can be re-processed; processed/paid payroll is final
    const existing = await Payroll.findOne({ employee, month, year });
    if (existing && existing.status !== 'draft') throw new ApiError('Payroll already processed for this month', 400);

    const { summary } = await computeAttendanceSummary(employee, month, year);
    const cleanAllowances = allowances.filter((x) => x?.name && Number(x.amount) > 0).map((x) => ({ name: x.name, amount: Number(x.amount) }));
    const cleanDeductions = deductions.filter((x) => x?.name && Number(x.amount) > 0).map((x) => ({ name: x.name, amount: Number(x.amount) }));
    const pay = computeSalary({ basicSalary: Number(basicSalary), allowances: cleanAllowances, deductions: cleanDeductions, overtimePay: Number(overtimePay) || 0 }, summary);

    const data = {
      employee, month, year,
      basicSalary: Number(basicSalary),
      allowances: cleanAllowances,
      deductions: pay.deductions,
      totalAllowances: pay.totalAllowances,
      totalDeductions: pay.totalDeductions,
      overtimePay: Number(overtimePay) || 0,
      grossSalary: pay.grossSalary,
      netSalary: pay.netSalary,
      perDaySalary: pay.perDaySalary,
      lopDeduction: pay.lopDeduction,
      workingDays: summary.workingDays,
      presentDays: summary.presentDays,
      absentDays: summary.absentDays,
      leaveDays: summary.paidLeaveDays + summary.unpaidLeaveDays,
      weeklyOffs: summary.weeklyOffs,
      holidays: summary.holidays,
      lateDays: summary.lateDays,
      halfDays: summary.halfDays,
      paidLeaveDays: summary.paidLeaveDays,
      unpaidLeaveDays: summary.unpaidLeaveDays,
      permissionMinutes: summary.permissionMinutes,
      permissionHalfDays: summary.permissionHalfDays,
      lopDays: summary.lopDays,
      payableDays: summary.payableDays,
      status: 'processed',
      processedBy: req.user._id,
      processedAt: new Date(),
      remarks,
    };
    const payroll = existing
      ? await Object.assign(existing, data).save()
      : await Payroll.create(data);

    notifyEmployee(employee, {
      title: `Payslip ready for ${MONTHS[month - 1]} ${year}`,
      message: `Net pay: Rs. ${pay.netSalary.toLocaleString('en-IN')}${summary.lopDays ? ` (LOP ${summary.lopDays} day(s))` : ''}`,
      type: 'payroll',
      link: '/payroll',
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
    assertOwnPayroll(req, payroll);
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
    notifyEmployee(payroll.employee, {
      title: `Salary credited for ${MONTHS[payroll.month - 1]} ${payroll.year}`,
      message: `Rs. ${payroll.netSalary.toLocaleString('en-IN')} has been paid`,
      type: 'payroll',
      link: '/payroll',
    });
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

const downloadPayslip = async (req, res, next) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate({
        path: 'employee',
        select: 'firstName lastName employeeId department designation bankName accountNumber panNumber',
        populate: [
          { path: 'department', select: 'departmentName' },
          { path: 'designation', select: 'designationName' },
        ],
      })
      .lean();
    if (!payroll) throw new ApiError('Payroll not found', 404);
    assertOwnPayroll(req, payroll);

    const filename = `Payslip_${payroll.employee?.employeeId || 'EMP'}_${MONTHS[payroll.month - 1]}_${payroll.year}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    generatePayslip(payroll, res, await getCompanyDetails());
  } catch (error) {
    next(error);
  }
};

module.exports = { previewPayroll, processPayroll, getPayrolls, getPayrollById, markPaid, getPayrollSummary, downloadPayslip };
