const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Holiday = require('../models/Holiday');
const Payroll = require('../models/Payroll');
const Department = require('../models/Department');
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
      Attendance.countDocuments({ date: { $gte: today, $lt: tomorrow }, attendanceStatus: 'present' }),
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

module.exports = { getDashboardStats, getAttendanceTrend, getEmployeeGrowth, getLeaveAnalytics, getPayrollAnalytics };
