const mongoose = require('mongoose');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const User = require('../models/User');
const Department = require('../models/Department');
const Designation = require('../models/Designation');
const Employee = require('../models/Employee');
const Shift = require('../models/Shift');
const LeaveType = require('../models/LeaveType');
const Holiday = require('../models/Holiday');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Payroll = require('../models/Payroll');
const Expense = require('../models/Expense');
const Asset = require('../models/Asset');
const Job = require('../models/Job');
const Performance = require('../models/Performance');
const Notification = require('../models/Notification');
const Announcement = require('../models/Announcement');
const Permission = require('../models/Permission');
const { dayKey } = require('../utils/time');
const { computeAttendanceSummary, computeSalary } = require('../services/payrollCalculator');

// Small, focused client-demo dataset for the leave / permission / late approval flow
// and LOP payroll. Wipes ALL existing data first (npm run seed:demo).

const today = new Date();
today.setHours(0, 0, 0, 0);
const curMonth = today.getMonth(); // 0-based
const curYear = today.getFullYear();
const prevFirst = new Date(curYear, curMonth - 1, 1);
const prev = { month: prevFirst.getMonth() + 1, year: prevFirst.getFullYear() };

const HOLIDAYS = [
  ['Pongal', 1, 15, 'regional'], ['Republic Day', 1, 26, 'national'], ['Tamil New Year', 4, 14, 'regional'],
  ['May Day', 5, 1, 'national'], ['Independence Day', 8, 15, 'national'], ['Vinayagar Chathurthi', 9, 14, 'regional'],
  ['Gandhi Jayanti', 10, 2, 'national'], ['Ayudha Pooja', 10, 20, 'regional'], ['Deepavali', 11, 8, 'national'],
  ['Christmas', 12, 25, 'national'],
];
const holidayKeys = new Set(HOLIDAYS.map(([, m, d]) => dayKey(new Date(curYear, m - 1, d))));
const isWorkday = (d) => ![0, 6].includes(d.getDay()) && !holidayKeys.has(dayKey(d));

// nth working day (1-based) of a month; month is 1-based
const workday = ({ month, year }, n) => {
  let count = 0;
  for (let d = new Date(year, month - 1, 1); d.getMonth() === month - 1; d.setDate(d.getDate() + 1)) {
    if (isWorkday(d) && ++count === n) return new Date(d);
  }
  throw new Error(`Month ${month}/${year} has fewer than ${n} working days`);
};
// Next working day on/after today + n days
const upcomingWorkday = (n) => {
  const d = new Date(today.getTime() + n * 86400000);
  while (!isWorkday(d)) d.setDate(d.getDate() + 1);
  return d;
};
const cur = { month: curMonth + 1, year: curYear };

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms');
  console.log('MongoDB connected — clearing all data');

  await Promise.all([User, Department, Designation, Employee, Shift, LeaveType, Holiday, Attendance, Leave,
    Payroll, Expense, Asset, Job, Performance, Notification, Announcement, Permission].map((M) => M.deleteMany({})));

  // Logins
  const admin = await User.create({ name: 'Super Admin', email: 'admin@hrms.com', password: 'Admin@123', role: 'super_admin' });
  const hrUser = await User.create({ name: 'Priya Sharma', email: 'hr@hrms.com', password: 'Hr@123456', role: 'hr_manager' });
  const johnUser = await User.create({ name: 'John Doe', email: 'john@hrms.com', password: 'Employee@123', role: 'employee' });
  const meenaUser = await User.create({ name: 'Meena Raj', email: 'meena@hrms.com', password: 'Employee@123', role: 'employee' });
  const driverUser = await User.create({ name: 'Murugan Selvam', email: 'driver@hrms.com', password: 'Employee@123', role: 'employee' });

  // Masters
  const [hrDept, itDept, finDept, opsDept] = await Department.create([
    { departmentCode: 'HR001', departmentName: 'Human Resources', createdBy: admin._id },
    { departmentCode: 'IT001', departmentName: 'Information Technology', createdBy: admin._id },
    { departmentCode: 'FIN001', departmentName: 'Finance', createdBy: admin._id },
    { departmentCode: 'OPS001', departmentName: 'Operations', createdBy: admin._id },
  ]);
  const [hrm, se, acc, drv] = await Designation.create([
    { designationCode: 'HRM001', designationName: 'HR Manager', department: hrDept._id },
    { designationCode: 'SE001', designationName: 'Software Engineer', department: itDept._id },
    { designationCode: 'ACC001', designationName: 'Accountant', department: finDept._id },
    { designationCode: 'DRV001', designationName: 'Driver', department: opsDept._id },
  ]);
  const shift = await Shift.create({ shiftName: 'General Shift', startTime: '09:30', endTime: '18:30', graceTime: 15, workingHours: 8, description: '9:30 AM to 6:30 PM' });
  const [cl, sl, el, lop] = await LeaveType.create([
    { leaveTypeName: 'Casual Leave', leaveCode: 'CL', totalDays: 12, description: 'For personal matters' },
    { leaveTypeName: 'Sick Leave', leaveCode: 'SL', totalDays: 10, description: 'For illness' },
    { leaveTypeName: 'Earned Leave', leaveCode: 'EL', totalDays: 15, description: 'Accrued leave', isCarryForward: true },
    { leaveTypeName: 'Loss of Pay', leaveCode: 'LOP', totalDays: 0, description: 'Unpaid leave — deducted from salary', isPaid: false },
  ]);
  await Holiday.create([
    ...HOLIDAYS.map(([holidayName, m, d, holidayType]) => ({ holidayName, holidayDate: new Date(curYear, m - 1, d), holidayType })),
    { holidayName: 'Pongal', holidayDate: new Date(curYear + 1, 0, 15), holidayType: 'regional' },
    { holidayName: 'Republic Day', holidayDate: new Date(curYear + 1, 0, 26), holidayType: 'national' },
  ]);

  // Employees
  const empDefs = [
    { firstName: 'Priya', lastName: 'Sharma', gender: 'female', email: 'hr@hrms.com', department: hrDept._id, designation: hrm._id, salary: 75000, user: hrUser._id },
    { firstName: 'John', lastName: 'Doe', gender: 'male', email: 'john@hrms.com', department: itDept._id, designation: se._id, salary: 55000, user: johnUser._id },
    { firstName: 'Meena', lastName: 'Raj', gender: 'female', email: 'meena@hrms.com', department: finDept._id, designation: acc._id, salary: 48000, user: meenaUser._id },
    { firstName: 'Murugan', lastName: 'Selvam', gender: 'male', email: 'driver@hrms.com', department: opsDept._id, designation: drv._id, salary: 22000, user: driverUser._id, isDriver: true },
    { firstName: 'Karthik', lastName: 'Subramanian', gender: 'male', email: 'karthik@hrms.com', department: itDept._id, designation: se._id, salary: 52000 },
  ];
  const emps = [];
  for (const [i, def] of empDefs.entries()) {
    const emp = new Employee({
      ...def, employeeId: `EMP${String(i + 1).padStart(3, '0')}`, shift: shift._id, employmentType: 'full_time',
      joiningDate: new Date(curYear - 2, 0, 10 + i), dateOfBirth: new Date(1990 + i, 3, 5 + i),
      mobile: `98400${String(10000 + i * 1111).slice(0, 5)}`, bankName: 'State Bank of India',
      accountNumber: `30123456${String(i).padStart(2, '0')}`, ifscCode: 'SBIN0001234', createdBy: admin._id,
      address: { city: 'Chennai', state: 'Tamil Nadu', pincode: '600001' },
    });
    await emp.save();
    emps.push(emp);
  }
  const [priya, john, meena, murugan, karthik] = emps;
  for (const u of [hrUser, johnUser, meenaUser, driverUser]) {
    await User.updateOne({ _id: u._id }, { employee: emps.find((e) => e.user?.equals(u._id))._id });
  }

  // ---- Leaves: one example of every approval state ----
  const approved = (at) => ({ hr: { status: 'approved', by: hrUser._id, at }, admin: { status: 'approved', by: admin._id, at } });
  const hrOnly = (at) => ({ hr: { status: 'approved', by: hrUser._id, at }, admin: { status: 'pending' } });
  const waiting = { hr: { status: 'pending' }, admin: { status: 'pending' } };
  const day = (d, n = 0) => new Date(d.getTime() + n * 86400000);
  const leaveDefs = [
    // previous month (feeds into the paid payroll)
    { emp: john, type: cl, from: workday(prev, 6), days: 1, reason: 'Family function', status: 'approved', approvals: approved(workday(prev, 4)) },
    { emp: meena, type: lop, from: workday(prev, 10), days: 2, reason: 'Native trip — no paid leave left', status: 'approved', approvals: approved(workday(prev, 8)) },
    { emp: karthik, type: sl, from: workday(prev, 15), days: 1, reason: 'Fever', status: 'approved', approvals: approved(workday(prev, 15)) },
    // current month / upcoming
    { emp: karthik, type: cl, from: upcomingWorkday(3), days: 1, reason: 'Personal work', status: 'rejected',
      approvals: { hr: { status: 'rejected', by: hrUser._id, at: today, remarks: 'Release week — please take next week' }, admin: { status: 'pending' } },
      rejectionReason: 'Release week — please take next week' },
    { emp: john, type: el, from: upcomingWorkday(7), days: 3, reason: 'Trip to hometown for festival', status: 'pending', approvals: hrOnly(today) },
    { emp: meena, type: cl, from: upcomingWorkday(4), days: 1, reason: 'Sister\'s engagement', status: 'pending', approvals: waiting },
    { emp: murugan, type: cl, from: upcomingWorkday(5), days: 0.5, reason: 'Bank work', status: 'pending', approvals: waiting, halfDay: true, halfDayType: 'second_half' },
  ];
  const leaves = await Leave.insertMany(leaveDefs.map((l) => ({
    employee: l.emp._id, leaveType: l.type._id, fromDate: l.from, toDate: day(l.from, Math.max(Math.ceil(l.days) - 1, 0)),
    totalDays: l.days, reason: l.reason, status: l.status, approvals: l.approvals,
    halfDay: !!l.halfDay, halfDayType: l.halfDayType, rejectionReason: l.rejectionReason,
    approvedBy: l.status === 'approved' ? admin._id : l.status === 'rejected' ? hrUser._id : undefined,
    approvedAt: ['approved', 'rejected'].includes(l.status) ? l.approvals.hr.at : undefined,
  })));
  // Multi-day leaves must cover only working days for the demo numbers to read cleanly
  const leaveDays = new Map();
  leaves.filter((l) => l.status === 'approved').forEach((l) => {
    for (let d = new Date(l.fromDate); d <= l.toDate; d.setDate(d.getDate() + 1)) leaveDays.set(`${l.employee}|${dayKey(d)}`, true);
  });

  // ---- Attendance: previous month + current month till today ----
  // Exceptions per employee: absent days, half days and late days (with reason)
  const k = (d) => dayKey(d);
  const exceptions = {
    [john._id]: { absent: [k(workday(prev, 12))], late: [k(workday(prev, 3)), k(workday(prev, 18)), k(upcomingWorkday(-2))] },
    [meena._id]: { half: [k(workday(prev, 16))], late: [k(workday(prev, 7))] },
    [murugan._id]: { late: [k(workday(prev, 2)), k(workday(prev, 9)), k(workday(prev, 14)), k(workday(prev, 20)), k(workday(cur, 2)), k(upcomingWorkday(-1))] },
    [karthik._id]: {},
    [priya._id]: {},
  };
  const lateReasons = ['Heavy traffic near Guindy', 'Bus breakdown on the way', 'Rain — waterlogging on main road'];
  const pickups = ['Chennai Airport (T1) — client pickup', 'Central Railway Station — guest pickup', 'Tidel Park — MD drop'];
  const attendance = [];
  for (let d = new Date(prevFirst); d <= today; d.setDate(d.getDate() + 1)) {
    if (!isWorkday(d)) continue;
    const date = new Date(d);
    const isToday = date.getTime() === today.getTime();
    const recent = (today - date) / 86400000 <= 3;
    emps.forEach((emp, idx) => {
      // John and the driver have not checked in today, so check-in / late reason can be shown live
      if (isToday && (emp === john || emp === murugan)) return;
      const ex = exceptions[emp._id];
      const key = k(date);
      if (leaveDays.has(`${emp._id}|${key}`)) {
        attendance.push({ employee: emp._id, date, shift: shift._id, attendanceStatus: 'on_leave', markedBy: admin._id });
        return;
      }
      if (ex.absent?.includes(key)) return; // no record → absent → LOP
      const late = ex.late?.includes(key);
      const half = ex.half?.includes(key);
      const n = idx + date.getDate();
      attendance.push({
        employee: emp._id, date, shift: shift._id,
        checkIn: late ? '10:05' : '09:25',
        checkOut: isToday ? undefined : half ? '13:45' : '18:35',
        workingHours: isToday ? 0 : half ? 4.2 : late ? 8.5 : 9.2,
        attendanceStatus: half ? 'half_day' : late ? 'late' : 'present',
        ...(late && {
          pickupLocation: emp.isDriver ? pickups[n % pickups.length] : undefined,
          late: {
            minutes: 20,
            reason: emp.isDriver ? 'Returned late from airport pickup' : lateReasons[n % lateReasons.length],
            pickupLocation: emp.isDriver ? pickups[n % pickups.length] : undefined,
            status: recent ? 'pending' : 'approved',
            approvals: recent ? (emp === murugan ? waiting : hrOnly(date)) : approved(date),
          },
        }),
        markedBy: admin._id,
      });
    });
  }
  await Attendance.insertMany(attendance);

  // ---- Permissions: 2h/month quota; beyond it → half-day LOP ----
  const perm = (emp, date, fromTime, toTime, minutes, reason, type, status, approvals) => ({
    employee: emp._id, date, fromTime, toTime, minutes, reason, type, status, approvals,
    approvedAt: status === 'approved' ? approvals.admin.at : undefined,
  });
  await Permission.insertMany([
    // Driver used the full 2h last month, the 3rd request became a half-day LOP
    perm(murugan, workday(prev, 4), '14:00', '15:00', 60, 'Vehicle FC renewal at RTO', 'permission', 'approved', approved(workday(prev, 4))),
    perm(murugan, workday(prev, 11), '16:30', '17:30', 60, 'Son\'s school meeting', 'permission', 'approved', approved(workday(prev, 11))),
    perm(murugan, workday(prev, 17), '15:00', '16:30', 90, 'Hospital visit with mother', 'half_day', 'approved', approved(workday(prev, 17))),
    // John this month: 1h approved, the next 1.5h exceeds the remaining 1h → half-day, waiting for approval
    perm(john, workday(cur, 1), '16:30', '17:30', 60, 'Bank visit for home loan documents', 'permission', 'approved', approved(workday(cur, 1))),
    perm(john, upcomingWorkday(2), '15:00', '16:30', 90, 'Parent-teacher meeting at school', 'half_day', 'pending', waiting),
    // Meena: within quota, HR approved, waiting for Super Admin
    perm(meena, upcomingWorkday(1), '09:30', '10:30', 60, 'Vehicle service drop-off', 'permission', 'pending', hrOnly(today)),
  ]);

  // ---- Payroll: previous month paid, calculated with the real LOP engine ----
  const structure = (emp) => {
    const basicSalary = Math.round(emp.salary * 0.5);
    const deductions = [{ name: 'PF (12%)', amount: Math.round(basicSalary * 0.12) }, { name: 'Professional Tax', amount: 200 }];
    if (emp.salary > 60000) deductions.push({ name: 'TDS', amount: Math.round(emp.salary * 0.08) });
    return {
      basicSalary,
      allowances: [
        { name: 'HRA', amount: Math.round(emp.salary * 0.2) },
        { name: 'Special Allowance', amount: Math.round(emp.salary * 0.25) },
        { name: 'Transport', amount: Math.round(emp.salary * 0.05) },
      ],
      deductions,
    };
  };
  const processedAt = new Date(curYear, curMonth, 1, 11);
  const payrolls = [];
  for (const emp of emps) {
    const { summary: s } = await computeAttendanceSummary(emp._id, prev.month, prev.year);
    const st = structure(emp);
    const pay = computeSalary(st, s);
    payrolls.push({
      employee: emp._id, month: prev.month, year: prev.year, basicSalary: st.basicSalary, allowances: st.allowances,
      deductions: pay.deductions, totalAllowances: pay.totalAllowances, totalDeductions: pay.totalDeductions,
      grossSalary: pay.grossSalary, netSalary: pay.netSalary, perDaySalary: pay.perDaySalary, lopDeduction: pay.lopDeduction,
      workingDays: s.workingDays, presentDays: s.presentDays, absentDays: s.absentDays,
      leaveDays: s.paidLeaveDays + s.unpaidLeaveDays, weeklyOffs: s.weeklyOffs, holidays: s.holidays,
      lateDays: s.lateDays, halfDays: s.halfDays, paidLeaveDays: s.paidLeaveDays, unpaidLeaveDays: s.unpaidLeaveDays,
      permissionMinutes: s.permissionMinutes, permissionHalfDays: s.permissionHalfDays, lopDays: s.lopDays, payableDays: s.payableDays,
      status: 'paid', processedBy: admin._id, processedAt, paidAt: new Date(processedAt.getTime() + 86400000), paymentMode: 'bank_transfer',
    });
  }
  await Payroll.insertMany(payrolls);

  // ---- Notifications pointing at the pending approvals ----
  const notif = (user, title, message, type, link, hoursAgo) => ({ user: user._id, title, message, type, link, read: false, createdAt: new Date(Date.now() - hoursAgo * 3600000) });
  await Notification.insertMany([
    notif(admin, 'Leave awaiting your approval', 'HR has approved John Doe\'s Earned Leave (3 days). Your approval is needed.', 'leave', '/leave', 2),
    notif(admin, 'Permission awaiting your approval', 'HR has approved Meena Raj\'s permission. Your approval is needed.', 'permission', '/leave?tab=permissions', 1),
    notif(hrUser, 'New leave request', 'Meena Raj applied for 1 day of Casual Leave.', 'leave', '/leave', 3),
    notif(hrUser, 'Permission beyond quota', 'John Doe requested 1.5h — exceeds monthly 2h quota, will be a half-day LOP.', 'permission', '/leave?tab=permissions', 4),
    notif(hrUser, 'Late check-in (driver): Murugan Selvam', '20m late · Returned late from airport pickup', 'attendance', '/attendance?tab=late', 20),
    notif(johnUser, 'Leave: HR approved', 'Waiting for Super Admin approval', 'leave', '/leave', 2),
    notif(meenaUser, 'Payslip available', 'Your payslip for last month is ready (includes 2.5 days LOP).', 'payroll', '/payroll', 30),
  ]);

  console.log('✅ Demo data created (leave / permission / payroll)');
  console.log('   Super Admin: admin@hrms.com / Admin@123');
  console.log('   HR Manager:  hr@hrms.com / Hr@123456');
  console.log('   Employees:   john@hrms.com, meena@hrms.com, driver@hrms.com / Employee@123');
  console.log(`   ${emps.length} employees, ${leaves.length} leaves, 6 permissions, ${attendance.length} attendance`);
  payrolls.forEach((p, i) => console.log(`   Payroll ${prev.month}/${prev.year} ${emps[i].fullName || emps[i].firstName}: LOP ${p.lopDays} day(s) → net ₹${p.netSalary.toLocaleString('en-IN')}`));
  process.exit(0);
};

seed().catch((err) => {
  console.error('Demo seed error:', err);
  process.exit(1);
});
