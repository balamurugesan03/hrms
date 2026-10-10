const Attendance = require('../models/Attendance');
const Employee = require('../models/Employee');
const Shift = require('../models/Shift');
const Permission = require('../models/Permission');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/pagination');
const { toMinutes, nowHHmm, startOfDay, monthRange, formatMinutes } = require('../utils/time');
const {
  initialApprovals, awaitingFilter, visibleToEmployee, recordDecision, notifyApprovers, notifyDecision, approvalPopulate,
} = require('../utils/approval');

const markAttendance = async (req, res, next) => {
  try {
    const { employee, date, checkIn, checkOut, attendanceStatus, notes } = req.body;
    if (!employee) throw new ApiError('Please select an employee', 400);
    if (!date) throw new ApiError('Date is required', 400);
    if (!(await Employee.exists({ _id: employee }))) throw new ApiError('Employee not found', 404);

    const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (checkIn && !HHMM.test(checkIn)) throw new ApiError('Check-in time must be in HH:mm format (e.g. 09:30)', 400);
    if (checkOut && !HHMM.test(checkOut)) throw new ApiError('Check-out time must be in HH:mm format (e.g. 18:30)', 400);

    let workingHours = 0;
    if (checkIn && checkOut) {
      workingHours = Math.round(Math.max(0, (toMinutes(checkOut) - toMinutes(checkIn)) / 60) * 100) / 100;
    }

    // Store at local midnight like self check-in, and match the whole day so an existing
    // check-in record (local or UTC midnight) is updated instead of duplicated
    const day = startOfDay(date);
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const attendance = await Attendance.findOneAndUpdate(
      { employee, date: { $gte: day, $lt: nextDay } },
      { employee, date: day, checkIn, checkOut, workingHours, attendanceStatus, notes, markedBy: req.user._id },
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
    if (req.user.role === 'employee') filter.employee = req.user.employee;
    if (status) filter.attendanceStatus = status;
    if (date) {
      // Match the whole calendar day: records may be stored at local or UTC midnight
      const [y, m, d] = String(date).split('T')[0].split('-').map(Number);
      filter.date = { $gte: new Date(y, m - 1, d), $lt: new Date(y, m - 1, d + 1) };
    } else if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59);
      filter.date = { $gte: start, $lte: end };
    }

    const { docs, pagination } = await paginate(Attendance, filter, {
      page,
      limit,
      sort: { date: -1 },
      populate: [
        { path: 'employee', select: 'firstName lastName employeeId photo isDriver' },
        ...approvalPopulate('late.'),
      ],
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

    const [employees, attendance] = await Promise.all([
      Employee.find({ status: 'active' })
        .select('firstName lastName employeeId photo department shift isDriver')
        .populate('department', 'departmentName')
        .populate('shift', 'shiftName startTime endTime graceTime')
        .lean(),
      Attendance.find({ date: { $gte: today, $lt: tomorrow } })
        .populate('employee', 'firstName lastName employeeId photo department')
        .lean(),
    ]);
    const totalEmployees = employees.length;

    const present = attendance.filter((a) => a.checkIn).length;
    const onLeave = attendance.filter((a) => a.attendanceStatus === 'on_leave').length;
    const late = attendance.filter((a) => a.attendanceStatus === 'late').length;
    const absent = Math.max(0, totalEmployees - present - onLeave);
    const checkedOut = attendance.filter((a) => a.checkOut).length;

    // One row per active employee: their punch in/out today (or not punched yet)
    const byEmployee = new Map(attendance.map((a) => [String(a.employee?._id), a]));
    const punchLog = employees.map((emp) => {
      const rec = byEmployee.get(String(emp._id));
      return {
        _id: emp._id,
        employee: emp,
        shift: emp.shift,
        checkIn: rec?.checkIn || null,
        checkOut: rec?.checkOut || null,
        workingHours: rec?.workingHours || 0,
        attendanceStatus: rec?.attendanceStatus || 'not_punched',
        pickupLocation: rec?.pickupLocation,
        late: rec?.late,
        notes: rec?.notes,
      };
    });

    ApiResponse.success(res, { totalEmployees, present, absent, onLeave, late, checkedOut, records: attendance, punchLog });
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

// ---------- Employee self-service: check-in / check-out ----------

const todayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
};

// Employee's own shift; if none is assigned and the company has exactly one active shift, use that
const SHIFT_FIELDS = 'shiftName startTime endTime graceTime workingHours';
const effectiveShift = async (assigned) => {
  if (assigned) return assigned;
  const active = await Shift.find({ status: 'active' }).select(SHIFT_FIELDS).limit(2).lean();
  return active.length === 1 ? active[0] : null;
};

const requireEmployee = (req) => {
  if (!req.user.employee) throw new ApiError('No employee profile is linked to this account', 400);
  return req.user.employee;
};

const getMyToday = async (req, res, next) => {
  try {
    const employee = requireEmployee(req);
    const { start, end } = todayRange();
    const [record, emp, permission] = await Promise.all([
      Attendance.findOne({ employee, date: { $gte: start, $lt: end } }).lean(),
      Employee.findById(employee).populate('shift', SHIFT_FIELDS).select('shift isDriver').lean(),
      todaysPermission(employee, start, end),
    ]);
    const shift = await effectiveShift(emp?.shift);
    ApiResponse.success(res, {
      record,
      shift,
      isDriver: !!emp?.isDriver,
      permission,
      lateMinutes: lateBy(shift, nowHHmm(), permission),
      serverTime: new Date(),
    });
  } catch (error) {
    next(error);
  }
};

// Minutes after shift start + grace (0 when on time or no shift).
// A permission (pending or approved) that covers the shift start moves the
// cut-off to the permission's end time, so the employee is not asked for a reason.
const lateBy = (shift, time, permission) => {
  if (!shift?.startTime) return 0;
  const grace = shift.graceTime || 0;
  let cutoff = toMinutes(shift.startTime) + grace;
  if (permission && toMinutes(permission.fromTime) <= cutoff) {
    cutoff = Math.max(cutoff, toMinutes(permission.toTime) + grace);
  }
  return Math.max(0, toMinutes(time) - cutoff);
};

const todaysPermission = (employee, start, end) =>
  Permission.findOne({ employee, date: { $gte: start, $lt: end }, status: { $in: ['pending', 'approved'] } })
    .select('fromTime toTime status').lean();

const checkIn = async (req, res, next) => {
  try {
    const employee = requireEmployee(req);
    const { start, end } = todayRange();
    const reason = req.body.lateReason?.trim();
    const pickupLocation = req.body.pickupLocation?.trim();

    const existing = await Attendance.findOne({ employee, date: { $gte: start, $lt: end } });
    if (existing?.checkIn) throw new ApiError(`Already checked in at ${existing.checkIn}`, 400);

    const emp = await Employee.findById(employee).populate('shift', SHIFT_FIELDS).select('shift isDriver firstName lastName').lean();
    const [shift, permission] = await Promise.all([
      effectiveShift(emp?.shift),
      todaysPermission(employee, start, end),
    ]);

    const time = nowHHmm();
    const lateMinutes = lateBy(shift, time, permission);

    // Late check-in is blocked until the employee explains the delay.
    // Drivers also say which pickup they were returning from.
    if (lateMinutes > 0 && (!reason || reason.length < 5)) {
      throw new ApiError(
        `You are ${formatMinutes(lateMinutes)} late. Please enter the reason for the delay to check in.`,
        422, 'LATE_REASON_REQUIRED'
      );
    }
    if (emp?.isDriver && lateMinutes > 0 && !pickupLocation) {
      throw new ApiError('Please enter the pickup location you are returning from', 422, 'LATE_REASON_REQUIRED');
    }

    const update = {
      employee, date: start, checkIn: time, attendanceStatus: lateMinutes > 0 ? 'late' : 'present',
      shift: shift?._id, markedBy: req.user._id,
      ...(pickupLocation && { pickupLocation }),
      ...(req.body.notes && { notes: req.body.notes }),
    };
    if (lateMinutes > 0) {
      update.late = { minutes: lateMinutes, reason, pickupLocation, status: 'pending', approvals: await initialApprovals(employee, 'late') };
    }

    const record = await Attendance.findOneAndUpdate(
      { employee, date: start }, update,
      { upsert: true, new: true, runValidators: true }
    );

    if (lateMinutes > 0) {
      notifyApprovers(update.late.approvals, {
        title: `Late check-in${emp?.isDriver ? ' (driver)' : ''}: ${emp?.firstName} ${emp?.lastName}`,
        message: `${formatMinutes(lateMinutes)} late at ${time}${pickupLocation ? ` · from ${pickupLocation}` : ''} · ${reason}`,
        type: 'attendance',
        link: '/attendance?tab=late',
      }, req.user._id);
    }

    ApiResponse.success(res, record, lateMinutes > 0
      ? `Checked in at ${time} (${formatMinutes(lateMinutes)} late) · reason sent for approval`
      : `Checked in at ${time}`);
  } catch (error) {
    next(error);
  }
};

const checkOut = async (req, res, next) => {
  try {
    const employee = requireEmployee(req);
    const { start, end } = todayRange();

    const record = await Attendance.findOne({ employee, date: { $gte: start, $lt: end } });
    if (!record?.checkIn) throw new ApiError('You have not checked in today', 400);
    if (record.checkOut) throw new ApiError(`Already checked out at ${record.checkOut}`, 400);

    const time = nowHHmm();
    const workingHours = Math.max(0, (toMinutes(time) - toMinutes(record.checkIn)) / 60);

    const shift = record.shift ? await Shift.findById(record.shift).lean() : null;
    const expectedHours = shift?.workingHours || 8;

    record.checkOut = time;
    record.workingHours = Math.round(workingHours * 100) / 100;
    record.overtimeHours = Math.max(0, Math.round((workingHours - expectedHours) * 100) / 100);
    if (workingHours < expectedHours / 2) record.attendanceStatus = 'half_day';
    if (req.body.notes) record.notes = req.body.notes;
    await record.save();

    ApiResponse.success(res, record, `Checked out at ${time} · ${record.workingHours.toFixed(1)} hrs`);
  } catch (error) {
    next(error);
  }
};

// ---------- Late arrival review (late approvers / reporting managers) ----------

const getLateArrivals = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, month, year, status, employee, awaiting } = req.query;
    let filter = { late: { $exists: true } };
    if (status) filter['late.status'] = status;
    if (employee) filter.employee = employee;
    if (month && year) {
      const { start, end } = monthRange(Number(month), Number(year));
      filter.date = { $gte: start, $lt: end };
    }
    if (awaiting === 'me') filter = { ...filter, ...awaitingFilter(req.user, 'late.') };
    else if (req.user.role === 'employee') filter = { ...filter, ...visibleToEmployee(req.user, 'late.') };

    const { docs, pagination } = await paginate(Attendance, filter, {
      page, limit, sort: { date: -1, checkIn: -1 },
      populate: [
        { path: 'employee', select: 'firstName lastName employeeId photo isDriver' },
        { path: 'shift', select: 'shiftName startTime graceTime' },
        { path: 'late.approvals.hr.by', select: 'name' },
        { path: 'late.approvals.admin.by', select: 'name' },
      ],
    });
    ApiResponse.paginated(res, docs, pagination);
  } catch (error) {
    next(error);
  }
};

const decideLate = (decision) => async (req, res, next) => {
  try {
    const record = await Attendance.findById(req.params.id);
    if (!record?.late) throw new ApiError('Late record not found', 404);

    const remarks = req.body?.remarks;
    const result = recordDecision(record.late, { user: req.user, employeeId: record.employee, decision, remarks });
    record.markModified('late');
    await record.save();

    notifyDecision(record.late, result, {
      employeeId: record.employee,
      label: `Late reason (${new Date(record.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })})`,
      link: '/attendance?tab=late',
      type: 'attendance',
    }, req.user);

    const msg = result.final ? `Late reason ${record.late.status}` : `Your review is recorded. Waiting for ${result.waiting} more approver(s).`;
    ApiResponse.success(res, record, msg);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  markAttendance, getAttendance, getTodayAttendance, getMonthlyReport, bulkAttendance,
  getMyToday, checkIn, checkOut,
  getLateArrivals, approveLate: decideLate('approved'), rejectLate: decideLate('rejected'),
};
