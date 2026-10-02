const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/pagination');

const markAttendance = async (req, res, next) => {
  try {
    const { employee, date, checkIn, checkOut, attendanceStatus, notes } = req.body;

    let workingHours = 0;
    if (checkIn && checkOut) {
      const [inH, inM] = checkIn.split(':').map(Number);
      const [outH, outM] = checkOut.split(':').map(Number);
      workingHours = Math.max(0, ((outH * 60 + outM) - (inH * 60 + inM)) / 60);
    }

    const attendance = await Attendance.findOneAndUpdate(
      { employee, date: new Date(date) },
      { employee, date: new Date(date), checkIn, checkOut, workingHours, attendanceStatus, notes, markedBy: req.user._id },
      { upsert: true, new: true, runValidators: true }
    );

    ApiResponse.success(res, attendance, 'Attendance marked');
  } catch (error) {
    next(error);
  }
};

const getAttendance = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, employee, month, year, status, date } = req.query;
    const filter = {};

    if (employee) filter.employee = employee;
    if (status) filter.attendanceStatus = status;
    if (date) {
      filter.date = new Date(date);
    } else if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      filter.date = { $gte: start, $lte: end };
    }

    const { docs, pagination } = await paginate(Attendance, filter, {
      page,
      limit,
      sort: { date: -1 },
      populate: { path: 'employee', select: 'firstName lastName employeeId photo' },
    });

    ApiResponse.paginated(res, docs, pagination);
  } catch (error) {
    next(error);
  }
};

const getTodayAttendance = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalEmployees, attendance] = await Promise.all([
      Employee.countDocuments({ status: 'active' }),
      Attendance.find({ date: { $gte: today, $lt: tomorrow } })
        .populate('employee', 'firstName lastName employeeId photo department')
        .lean(),
    ]);

    const present = attendance.filter((a) => a.attendanceStatus === 'present').length;
    const absent = totalEmployees - present;
    const onLeave = attendance.filter((a) => a.attendanceStatus === 'on_leave').length;
    const late = attendance.filter((a) => a.attendanceStatus === 'late').length;

    ApiResponse.success(res, { totalEmployees, present, absent, onLeave, late, records: attendance });
  } catch (error) {
    next(error);
  }
};

const getMonthlyReport = async (req, res, next) => {
  try {
    const { employee, month, year } = req.query;
    if (!employee || !month || !year) throw new ApiError('employee, month, year are required', 400);

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const records = await Attendance.find({
      employee,
      date: { $gte: start, $lte: end },
    }).sort({ date: 1 });

    const summary = {
      present: records.filter((r) => r.attendanceStatus === 'present').length,
      absent: records.filter((r) => r.attendanceStatus === 'absent').length,
      halfDay: records.filter((r) => r.attendanceStatus === 'half_day').length,
      late: records.filter((r) => r.attendanceStatus === 'late').length,
      onLeave: records.filter((r) => r.attendanceStatus === 'on_leave').length,
      totalWorkingHours: records.reduce((sum, r) => sum + (r.workingHours || 0), 0),
    };

    ApiResponse.success(res, { summary, records });
  } catch (error) {
    next(error);
  }
};

const bulkAttendance = async (req, res, next) => {
  try {
    const { date, records } = req.body; // records: [{employee, attendanceStatus, checkIn, checkOut}]
    const ops = records.map((r) => ({
      updateOne: {
        filter: { employee: r.employee, date: new Date(date) },
        update: { ...r, date: new Date(date), markedBy: req.user._id },
        upsert: true,
      },
    }));

    await Attendance.bulkWrite(ops);
    ApiResponse.success(res, null, `Attendance marked for ${records.length} employees`);
  } catch (error) {
    next(error);
  }
};

module.exports = { markAttendance, getAttendance, getTodayAttendance, getMonthlyReport, bulkAttendance };
