const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Permission = require('../models/Permission');
const Holiday = require('../models/Holiday');
const Employee = require('../models/Employee');
const ApiError = require('../utils/ApiError');
const { dayKey, payrollPeriod, startOfDay } = require('../utils/time');

// Weekly off days (0 = Sunday … 6 = Saturday). Default Sat + Sun.
const WEEKLY_OFF = (process.env.WEEKLY_OFF_DAYS || '0,6').split(',').map(Number);

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Day-by-day attendance summary for one employee over the payroll period of month/year
 * (26th of the previous month to the 25th — see payrollPeriod), used for Loss of Pay (LOP).
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

  const { start, end, days: daysInPeriod } = payrollPeriod(month, year);
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

  const s = {
    daysInPeriod, periodStart: dayKey(start), periodEnd: dayKey(new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1)),
    weeklyOffs: 0, holidays: 0, workingDays: 0,
    presentDays: 0, lateDays: 0, halfDays: 0, absentDays: 0,
    paidLeaveDays: 0, unpaidLeaveDays: 0,
    permissionMinutes: permissions.filter((p) => p.type === 'permission').reduce((n, p) => n + p.minutes, 0),
    permissionHalfDays: 0, notEmployedDays: 0, lopDays: 0,
    attendanceRecords: attendance.length,
  };
  const days = [];

  for (let i = 0; i < daysInPeriod; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
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
  s.payableDays = round2(daysInPeriod - s.lopDays);
  return { employee, summary: s, days };
};

// ESI: employees who joined on/after this date use the new Basic + DA rule; earlier joiners keep the old gross rule
const ESI_NEW_RULE_FROM = startOfDay(process.env.ESI_NEW_RULE_FROM || '2026-09-17');
const ESI_WAGE_LIMIT = 21000;
const ESI_RATE = 0.0075;

// An allowance named "DA" / "Dearness Allowance" counts as DA
const isDA = (name = '') => /^\s*(da\b|dearness)/i.test(name);
const ESI_ROW = /^ESI\b/i;
const esiRuleFor = (joiningDate) => (joiningDate && startOfDay(joiningDate) >= ESI_NEW_RULE_FROM ? 'new' : 'old');

/**
 * Statutory amounts on the monthly Basic + DA:
 *   Bonus    = (Basic + DA) × 8.33%
 *   EL       = (Basic + DA) / 26 × 1.3
 *   Gratuity = (Basic + DA) / 26 × 15 / 12
 *   ESI (joined on/after ESI_NEW_RULE_FROM) = IF(Basic + DA > 21000, 0, (Basic + DA) × 0.75%)
 *   ESI (joined before)                     = IF(Gross > 21000, 0, Salary earned × 0.75%)
 * Bonus / EL / Gratuity are employer contributions (not part of gross or net); ESI is deducted from net.
 */
const computeStatutory = ({ basicSalary, allowances, fixedGross, salaryEarned, joiningDate }) => {
  const basicDA = Number(basicSalary) + allowances.filter((a) => isDA(a.name)).reduce((n, a) => n + (Number(a.amount) || 0), 0);
  const esiRule = esiRuleFor(joiningDate);
  const esi = esiRule === 'new'
    ? (basicDA > ESI_WAGE_LIMIT ? 0 : basicDA * ESI_RATE)
    : (fixedGross > ESI_WAGE_LIMIT ? 0 : salaryEarned * ESI_RATE);
  return {
    basicDA,
    esiRule,
    esi: Math.round(esi),
    contributions: [
      { name: 'Bonus (8.33%)', amount: Math.round(basicDA * 0.0833) },
      { name: 'EL', amount: Math.round((basicDA / 26) * 1.3) },
      { name: 'Gratuity', amount: Math.round(((basicDA / 26) * 15) / 12) },
    ],
  };
};

// Final amounts. LOP is charged on the fixed pay (basic + allowances) per day of the payroll period.
const computeSalary = ({ basicSalary = 0, allowances = [], deductions = [], overtimePay = 0 }, summary, employee = {}) => {
  const totalAllowances = allowances.reduce((n, a) => n + (Number(a.amount) || 0), 0);
  const fixedGross = Number(basicSalary) + totalAllowances;
  const perDaySalary = round2(fixedGross / summary.daysInPeriod);
  const lopDeduction = Math.round(perDaySalary * summary.lopDays);
  const grossSalary = fixedGross + Number(overtimePay || 0);

  const statutory = computeStatutory({
    basicSalary, allowances, fixedGross, salaryEarned: Math.max(0, grossSalary - lopDeduction), joiningDate: employee.joiningDate,
  });

  // LOP and ESI are always recalculated, never taken from the form
  const allDeductions = deductions.filter((d) => d.name && !/^Loss of Pay/.test(d.name) && !ESI_ROW.test(d.name));
  if (statutory.esi > 0) allDeductions.push({ name: 'ESI (0.75%)', amount: statutory.esi });
  if (lopDeduction > 0) allDeductions.push({ name: `Loss of Pay (${summary.lopDays} day${summary.lopDays === 1 ? '' : 's'})`, amount: lopDeduction });

  const totalDeductions = allDeductions.reduce((n, d) => n + (Number(d.amount) || 0), 0);
  return {
    totalAllowances, deductions: allDeductions, totalDeductions, grossSalary,
    netSalary: Math.max(0, grossSalary - totalDeductions), perDaySalary, lopDeduction,
    esi: statutory.esi, esiRule: statutory.esiRule, basicDA: statutory.basicDA, contributions: statutory.contributions,
  };
};

module.exports = { computeAttendanceSummary, computeSalary, esiRuleFor, ESI_NEW_RULE_FROM };
