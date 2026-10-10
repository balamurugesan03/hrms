const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Permission = require('../models/Permission');
const Holiday = require('../models/Holiday');
const Employee = require('../models/Employee');
const ApiError = require('../utils/ApiError');
const { dayKey, monthRange, startOfDay } = require('../utils/time');

// Weekly off days (0 = Sunday … 6 = Saturday). Default Sat + Sun.
const WEEKLY_OFF = (process.env.WEEKLY_OFF_DAYS || '0,6').split(',').map(Number);

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Day-by-day attendance summary for one employee and month, used for Loss of Pay (LOP).
 *
 * Per working day:
 *   present / late                       → paid
 *   approved paid leave                  → paid
 *   approved unpaid (LOP) leave          → 1 LOP (0.5 for half-day)
 *   half-day attendance not covered by paid half-day leave → 0.5 LOP
 *   absent / no record (past days)       → 1 LOP
 *   approved permission beyond the monthly quota (type half_day) → at least 0.5 LOP that day
 * Weekly offs and holidays are paid. Days before joining / after exit are LOP.
 */
const computeAttendanceSummary = async (employeeId, month, year) => {
  const employee = await Employee.findById(employeeId).select('firstName lastName employeeId salary joiningDate exitDate').lean();
  if (!employee) throw new ApiError('Employee not found', 404);

  const { start, end } = monthRange(month, year);
  const [attendance, leaves, permissions, holidays] = await Promise.all([
    Attendance.find({ employee: employeeId, date: { $gte: start, $lt: end } }).lean(),
    Leave.find({ employee: employeeId, status: 'approved', fromDate: { $lt: end }, toDate: { $gte: start } })
      .populate('leaveType', 'leaveTypeName isPaid').lean(),
    Permission.find({ employee: employeeId, status: 'approved', date: { $gte: start, $lt: end } }).lean(),
    Holiday.find({ holidayDate: { $gte: start, $lt: end } }).select('holidayDate holidayName').lean(),
  ]);

  const attByDay = new Map(attendance.map((a) => [dayKey(a.date), a]));
  const holidayByDay = new Map(holidays.map((h) => [dayKey(h.holidayDate), h.holidayName]));
  const leaveByDay = new Map();
  leaves.forEach((l) => {
    for (let d = startOfDay(l.fromDate); d <= l.toDate; d.setDate(d.getDate() + 1)) leaveByDay.set(dayKey(d), l);
  });
  const halfDayPermissionDays = new Set(permissions.filter((p) => p.type === 'half_day').map((p) => dayKey(p.date)));

  const today = startOfDay(new Date());
  const joined = employee.joiningDate ? startOfDay(employee.joiningDate) : null;
  const exited = employee.exitDate ? startOfDay(employee.exitDate) : null;
  const daysInMonth = new Date(year, month, 0).getDate();

  const s = {
    daysInMonth, weeklyOffs: 0, holidays: 0, workingDays: 0,
    presentDays: 0, lateDays: 0, halfDays: 0, absentDays: 0,
    paidLeaveDays: 0, unpaidLeaveDays: 0,
    permissionMinutes: permissions.filter((p) => p.type === 'permission').reduce((n, p) => n + p.minutes, 0),
    permissionHalfDays: 0, notEmployedDays: 0, lopDays: 0,
    attendanceRecords: attendance.length,
  };
  const days = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const key = dayKey(date);
    const att = attByDay.get(key);
    const leave = leaveByDay.get(key);
    const paidLeave = leave && leave.leaveType?.isPaid !== false;
    let kind;
    let lop = 0;

    if ((joined && date < joined) || (exited && date > exited)) {
      kind = 'not_employed'; lop = 1; s.notEmployedDays++;
    } else if (holidayByDay.has(key)) {
      kind = 'holiday'; s.holidays++;
    } else if (WEEKLY_OFF.includes(date.getDay())) {
      kind = 'weekly_off'; s.weeklyOffs++;
    } else {
      s.workingDays++;
      const status = att?.attendanceStatus;
      if (leave && !leave.halfDay) {
        kind = paidLeave ? 'paid_leave' : 'unpaid_leave';
        if (paidLeave) s.paidLeaveDays++; else { s.unpaidLeaveDays++; lop = 1; }
      } else if (leave?.halfDay) {
        // Half-day leave: the leave half is paid/unpaid by type; the other half needs a check-in
        kind = 'half_day_leave'; s.halfDays++;
        const worked = Boolean(att?.checkIn) || date > today;
        if (att?.checkIn) s.presentDays += 0.5;
        if (status === 'late') s.lateDays++;
        if (paidLeave) s.paidLeaveDays += 0.5; else s.unpaidLeaveDays += 0.5;
        lop = (paidLeave ? 0 : 0.5) + (worked ? 0 : 0.5);
      } else if (status === 'present' || status === 'late') {
        kind = status; s.presentDays++;
        if (status === 'late') s.lateDays++;
      } else if (status === 'half_day') {
        kind = 'half_day'; s.halfDays++; s.presentDays += 0.5; lop = 0.5;
      } else if (status === 'on_leave') {
        kind = 'paid_leave'; s.paidLeaveDays++; // marked manually by HR
      } else if (status === 'holiday' || status === 'weekend') {
        kind = status;
      } else if (date >= today) {
        kind = 'upcoming'; // today/future without a check-in yet — not counted as absence
      } else {
        kind = 'absent'; s.absentDays++; lop = 1;
      }

      if (halfDayPermissionDays.has(key)) {
        s.permissionHalfDays++;
        lop = Math.max(lop, 0.5);
      }
    }

    s.lopDays += lop;
    days.push({ date: key, kind, lop, checkIn: att?.checkIn, checkOut: att?.checkOut, late: att?.late?.minutes || 0, leave: leave?.leaveType?.leaveTypeName });
  }

  s.lopDays = round2(s.lopDays);
  s.payableDays = round2(daysInMonth - s.lopDays);
  return { employee, summary: s, days };
};

// Final amounts. LOP is charged on the fixed pay (basic + allowances) per calendar day.
const computeSalary = ({ basicSalary = 0, allowances = [], deductions = [], overtimePay = 0 }, summary) => {
  const totalAllowances = allowances.reduce((n, a) => n + (Number(a.amount) || 0), 0);
  const perDaySalary = round2((Number(basicSalary) + totalAllowances) / summary.daysInMonth);
  const lopDeduction = Math.round(perDaySalary * summary.lopDays);

  const allDeductions = deductions.filter((d) => d.name && !/^Loss of Pay/.test(d.name));
  if (lopDeduction > 0) allDeductions.push({ name: `Loss of Pay (${summary.lopDays} day${summary.lopDays === 1 ? '' : 's'})`, amount: lopDeduction });

  const totalDeductions = allDeductions.reduce((n, d) => n + (Number(d.amount) || 0), 0);
  const grossSalary = Number(basicSalary) + totalAllowances + Number(overtimePay || 0);
  return {
    totalAllowances, deductions: allDeductions, totalDeductions, grossSalary,
    netSalary: Math.max(0, grossSalary - totalDeductions), perDaySalary, lopDeduction,
  };
};

module.exports = { computeAttendanceSummary, computeSalary };
