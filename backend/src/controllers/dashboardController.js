const mongoose = require('mongoose');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Holiday = require('../models/Holiday');
const Payroll = require('../models/Payroll');
const Department = require('../models/Department');
const LeaveType = require('../models/LeaveType');
const Expense = require('../models/Expense');
const ApiResponse = require('../utils/ApiResponse');

const getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    const [
      totalEmployees,
      activeEmployees,
      todayAttendance,
      onLeaveToday,
      upcomingHolidays,
      monthlyPayroll,
      departmentStats,
      newEmployeesThisMonth,
    ] = await Promise.all([
      Employee.countDocuments(),
      Employee.countDocuments({ status: 'active' }),
      Attendance.countDocuments({ date: { $gte: today, $lt: tomorrow }, attendanceStatus: { $in: ['present', 'late', 'half_day'] } }),
      Leave.countDocuments({
        status: 'approved',
        fromDate: { $lte: today },
        toDate: { $gte: today },
      }),
      Holiday.find({ holidayDate: { $gte: today } }).sort({ holidayDate: 1 }).limit(5).lean(),
      Payroll.aggregate([
        { $match: { month: currentMonth, year: currentYear, status: { $in: ['processed', 'paid'] } } },
        { $group: { _id: null, total: { $sum: '$netSalary' } } },
      ]),
      Department.aggregate([
        {
          $lookup: {
            from: 'employees',
            localField: '_id',
            foreignField: 'department',
            as: 'employees',
          },
        },
        {
          $project: {
            departmentName: 1,
            count: { $size: { $filter: { input: '$employees', cond: { $eq: ['$$this.status', 'active'] } } } },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 8 },
      ]),
      Employee.countDocuments({
        createdAt: { $gte: new Date(currentYear, currentMonth - 1, 1) },
      }),
    ]);

    ApiResponse.success(res, {
      totalEmployees,
      activeEmployees,
      todayAttendance,
      onLeaveToday,
      upcomingHolidays,
      monthlyPayrollCost: monthlyPayroll[0]?.total || 0,
      departmentStats,
      newEmployeesThisMonth,
    });
  } catch (error) {
    next(error);
  }
};

const getAttendanceTrend = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));
    startDate.setHours(0, 0, 0, 0);

    const trend = await Attendance.aggregate([
      { $match: { date: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          present: { $sum: { $cond: [{ $eq: ['$attendanceStatus', 'present'] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$attendanceStatus', 'absent'] }, 1, 0] } },
          late: { $sum: { $cond: [{ $eq: ['$attendanceStatus', 'late'] }, 1, 0] } },
          onLeave: { $sum: { $cond: [{ $eq: ['$attendanceStatus', 'on_leave'] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    ApiResponse.success(res, trend);
  } catch (error) {
    next(error);
  }
};

const getEmployeeGrowth = async (req, res, next) => {
  try {
    const growth = await Employee.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$joiningDate' },
            month: { $month: '$joiningDate' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: '$_id.year' }, '-',
              { $toString: '$_id.month' },
            ],
          },
          count: 1,
        },
      },
    ]);

    ApiResponse.success(res, growth);
  } catch (error) {
    next(error);
  }
};

const getLeaveAnalytics = async (req, res, next) => {
  try {
    const currentYear = new Date().getFullYear();
    const analytics = await Leave.aggregate([
      {
        $match: {
          status: 'approved',
          fromDate: { $gte: new Date(`${currentYear}-01-01`) },
        },
      },
      {
        $lookup: { from: 'leavetypes', localField: 'leaveType', foreignField: '_id', as: 'leaveType' },
      },
      { $unwind: '$leaveType' },
      {
        $group: {
          _id: '$leaveType.leaveTypeName',
          total: { $sum: '$totalDays' },
          count: { $sum: 1 },
        },
      },
    ]);

    ApiResponse.success(res, analytics);
  } catch (error) {
    next(error);
  }
};

const getPayrollAnalytics = async (req, res, next) => {
  try {
    const currentYear = new Date().getFullYear();
    const analytics = await Payroll.aggregate([
      { $match: { year: currentYear } },
      {
        $group: {
          _id: '$month',
          totalGross: { $sum: '$grossSalary' },
          totalNet: { $sum: '$netSalary' },
          totalDeductions: { $sum: '$totalDeductions' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    ApiResponse.success(res, analytics);
  } catch (error) {
    next(error);
  }
};

// Birthdays and work anniversaries in the next N days (default 30)
const getCelebrations = async (req, res, next) => {
  try {
    const days = Math.min(parseInt(req.query.days) || 30, 90);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const employees = await Employee.find({ status: 'active' })
      .select('firstName lastName employeeId photo dob joiningDate department')
      .populate('department', 'departmentName')
      .lean();

    // Days until the next occurrence of a month/day, plus that date
    const nextOccurrence = (date) => {
      const d = new Date(date);
      let next = new Date(today.getFullYear(), d.getMonth(), d.getDate());
      if (next < today) next = new Date(today.getFullYear() + 1, d.getMonth(), d.getDate());
      return { next, inDays: Math.round((next - today) / 86400000) };
    };

    const birthdays = [];
    const anniversaries = [];
    for (const e of employees) {
      const base = { _id: e._id, name: `${e.firstName} ${e.lastName}`, employeeId: e.employeeId, photo: e.photo, department: e.department?.departmentName };
      if (e.dob) {
        const { next, inDays } = nextOccurrence(e.dob);
        if (inDays <= days) birthdays.push({ ...base, date: next, inDays });
      }
      if (e.joiningDate) {
        const { next, inDays } = nextOccurrence(e.joiningDate);
        const years = next.getFullYear() - new Date(e.joiningDate).getFullYear();
        if (years > 0 && inDays <= days) anniversaries.push({ ...base, date: next, inDays, years });
      }
    }

    const byDate = (a, b) => a.inDays - b.inDays;
    ApiResponse.success(res, { birthdays: birthdays.sort(byDate), anniversaries: anniversaries.sort(byDate) });
  } catch (error) {
    next(error);
  }
};

// Personal summary for the logged-in employee
const getMySummary = async (req, res, next) => {
  try {
    const employee = req.user.employee;
    if (!employee) return ApiResponse.success(res, null, 'No employee profile linked');

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const yearStart = new Date(now.getFullYear(), 0, 1);

    const [attendance, leaveTypes, takenLeaves, pendingLeaves, pendingExpenses, lastPayslip] = await Promise.all([
      Attendance.find({ employee, date: { $gte: monthStart, $lte: monthEnd } }).select('attendanceStatus workingHours').lean(),
      LeaveType.find({ status: 'active', isPaid: { $ne: false } }).select('leaveTypeName leaveCode totalDays').lean(),
      Leave.aggregate([
        { $match: { employee: mongoose.Types.ObjectId.createFromHexString(String(employee)), status: 'approved', fromDate: { $gte: yearStart } } },
        { $group: { _id: '$leaveType', taken: { $sum: '$totalDays' } } },
      ]),
      Leave.countDocuments({ employee, status: 'pending' }),
      Expense.countDocuments({ employee, status: 'pending' }),
      Payroll.findOne({ employee, status: { $in: ['processed', 'paid'] } }).sort({ year: -1, month: -1 }).select('month year netSalary status').lean(),
    ]);

    const count = (s) => attendance.filter((a) => s.includes(a.attendanceStatus)).length;
    const takenMap = Object.fromEntries(takenLeaves.map((l) => [String(l._id), l.taken]));

    ApiResponse.success(res, {
      attendance: {
        present: count(['present', 'late', 'half_day']),
        late: count(['late']),
        absent: count(['absent']),
        onLeave: count(['on_leave']),
        hours: Math.round(attendance.reduce((s, a) => s + (a.workingHours || 0), 0) * 10) / 10,
      },
      leaveBalance: leaveTypes.map((lt) => ({
        _id: lt._id,
        name: lt.leaveTypeName,
        code: lt.leaveCode,
        allocated: lt.totalDays,
        taken: takenMap[String(lt._id)] || 0,
        remaining: lt.totalDays - (takenMap[String(lt._id)] || 0),
      })),
      pendingLeaves,
      pendingExpenses,
      lastPayslip,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats, getAttendanceTrend, getEmployeeGrowth, getLeaveAnalytics, getPayrollAnalytics,
  getCelebrations, getMySummary,
};
