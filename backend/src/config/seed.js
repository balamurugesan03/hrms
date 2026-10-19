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

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms');
  console.log('MongoDB connected for seeding');
};

// Date helpers so demo data always looks fresh relative to "today"
const today = new Date();
today.setHours(0, 0, 0, 0);
const daysFromNow = (n) => new Date(today.getTime() + n * 86400000);
// Same month/day as `daysFromNow(n)` but in a past year (for DOB / joining date)
const yearsAgoOn = (years, n) => {
  const d = daysFromNow(n);
  return new Date(d.getFullYear() - years, d.getMonth(), d.getDate());
};
const nextOccurrence = (month, day) => {
  const d = new Date(today.getFullYear(), month - 1, day);
  return d < today ? new Date(today.getFullYear() + 1, month - 1, day) : d;
};
const isWeekend = (d) => [0, 6].includes(d.getDay());
const sameDay = (a, b) => a.getTime() === b.getTime();

const seed = async () => {
  await connectDB();

  // Clear existing data
  await Promise.all([
    User.deleteMany({}), Department.deleteMany({}), Designation.deleteMany({}), Employee.deleteMany({}),
    Shift.deleteMany({}), LeaveType.deleteMany({}), Holiday.deleteMany({}), Attendance.deleteMany({}),
    Leave.deleteMany({}), Payroll.deleteMany({}), Expense.deleteMany({}), Asset.deleteMany({}),
    Job.deleteMany({}), Performance.deleteMany({}), Notification.deleteMany({}), Announcement.deleteMany({}),
    Permission.deleteMany({}),
  ]);

  // Users (login accounts)
  const superAdmin = await User.create({ name: 'Super Admin', email: 'admin@hrms.com', password: 'Admin@123', role: 'super_admin' });
  const hrUser = await User.create({ name: 'Priya Sharma', email: 'hr@hrms.com', password: 'Hr@123456', role: 'hr_manager' });
  const johnUser = await User.create({ name: 'John Doe', email: 'john@hrms.com', password: 'Employee@123', role: 'employee' });
  const arunUser = await User.create({ name: 'Arun Kumar', email: 'arun@hrms.com', password: 'Employee@123', role: 'employee' });
  const meenaUser = await User.create({ name: 'Meena Raj', email: 'meena@hrms.com', password: 'Employee@123', role: 'employee' });
  const driverUser = await User.create({ name: 'Murugan Selvam', email: 'driver@hrms.com', password: 'Employee@123', role: 'employee' });

  // Departments
  const depts = await Department.create([
    { departmentCode: 'HR001', departmentName: 'Human Resources', description: 'Hiring, people operations and employee welfare', createdBy: superAdmin._id },
    { departmentCode: 'IT001', departmentName: 'Information Technology', description: 'Product engineering and IT infrastructure', createdBy: superAdmin._id },
    { departmentCode: 'FIN001', departmentName: 'Finance', description: 'Accounts, payroll and compliance', createdBy: superAdmin._id },
    { departmentCode: 'SAL001', departmentName: 'Sales', description: 'Business development and client acquisition', createdBy: superAdmin._id },
    { departmentCode: 'MKT001', departmentName: 'Marketing', description: 'Brand, digital marketing and content', createdBy: superAdmin._id },
    { departmentCode: 'OPS001', departmentName: 'Operations', description: 'Admin, facilities and support', createdBy: superAdmin._id },
  ]);
  const [hrDept, itDept, financeDept, salesDept, mktDept, opsDept] = depts;

  // Designations
  const des = await Designation.create([
    { designationCode: 'HRM001', designationName: 'HR Manager', department: hrDept._id, description: 'Manages HR operations' },
    { designationCode: 'HRE001', designationName: 'HR Executive', department: hrDept._id, description: 'Recruitment and onboarding' },
    { designationCode: 'SE001', designationName: 'Software Engineer', department: itDept._id, description: 'Develops software solutions' },
    { designationCode: 'SSE001', designationName: 'Senior Software Engineer', department: itDept._id, description: 'Leads development' },
    { designationCode: 'QA001', designationName: 'QA Engineer', department: itDept._id, description: 'Testing and quality assurance' },
    { designationCode: 'ACC001', designationName: 'Accountant', department: financeDept._id, description: 'Manages accounts' },
    { designationCode: 'FM001', designationName: 'Finance Manager', department: financeDept._id, description: 'Heads finance team' },
    { designationCode: 'SLE001', designationName: 'Sales Executive', department: salesDept._id, description: 'Client acquisition' },
    { designationCode: 'SLM001', designationName: 'Sales Manager', department: salesDept._id, description: 'Leads sales team' },
    { designationCode: 'MKE001', designationName: 'Digital Marketing Executive', department: mktDept._id, description: 'SEO, social media and campaigns' },
    { designationCode: 'OPE001', designationName: 'Operations Executive', department: opsDept._id, description: 'Admin and facilities' },
    { designationCode: 'DRV001', designationName: 'Driver', department: opsDept._id, description: 'Service car pickups and drops' },
  ]);
  const D = Object.fromEntries(des.map((d) => [d.designationCode, d._id]));

  // Shifts
  const [generalShift, morningShift, nightShift] = await Shift.create([
    { shiftName: 'General Shift', startTime: '09:30', endTime: '18:30', graceTime: 15, workingHours: 8, description: '9:30 AM to 6:30 PM with 1 hour break' },
    { shiftName: 'Morning Shift', startTime: '06:00', endTime: '14:00', graceTime: 10, workingHours: 7.5, description: '6 AM to 2 PM' },
    { shiftName: 'Night Shift', startTime: '22:00', endTime: '06:00', graceTime: 10, workingHours: 7.5, description: '10 PM to 6 AM (support team)' },
  ]);

  // Leave types
  const [casualLeave, sickLeave, earnedLeave] = await LeaveType.create([
    { leaveTypeName: 'Casual Leave', leaveCode: 'CL', totalDays: 12, description: 'For personal matters' },
    { leaveTypeName: 'Sick Leave', leaveCode: 'SL', totalDays: 10, description: 'For illness' },
    { leaveTypeName: 'Earned Leave', leaveCode: 'EL', totalDays: 15, description: 'Accrued leave', isCarryForward: true },
    { leaveTypeName: 'Maternity Leave', leaveCode: 'ML', totalDays: 182, description: 'For expecting mothers', gender: 'female' },
    { leaveTypeName: 'Paternity Leave', leaveCode: 'PL', totalDays: 5, description: 'For new fathers', gender: 'male' },
    { leaveTypeName: 'Loss of Pay', leaveCode: 'LOP', totalDays: 0, description: 'Unpaid leave — deducted from salary', isPaid: false },
    { leaveTypeName: 'Medical Leave', leaveCode: 'MDL', totalDays: 12, description: 'For illness or medical treatment' },
  ]);

  // Holidays (always upcoming)
  await Holiday.create([
    { holidayName: 'Pongal', holidayDate: nextOccurrence(1, 15), holidayType: 'regional' },
    { holidayName: 'Republic Day', holidayDate: nextOccurrence(1, 26), holidayType: 'national' },
    { holidayName: 'Tamil New Year', holidayDate: nextOccurrence(4, 14), holidayType: 'regional' },
    { holidayName: 'May Day', holidayDate: nextOccurrence(5, 1), holidayType: 'national' },
    { holidayName: 'Independence Day', holidayDate: nextOccurrence(8, 15), holidayType: 'national' },
    { holidayName: 'Gandhi Jayanti', holidayDate: nextOccurrence(10, 2), holidayType: 'national' },
    { holidayName: 'Ayudha Pooja', holidayDate: nextOccurrence(10, 20), holidayType: 'regional' },
    { holidayName: 'Deepavali', holidayDate: nextOccurrence(11, 8), holidayType: 'national' },
    { holidayName: 'Christmas', holidayDate: nextOccurrence(12, 25), holidayType: 'national' },
    { holidayName: 'New Year Eve', holidayDate: nextOccurrence(12, 31), holidayType: 'optional' },
  ]);

  // Employees (birthdays / anniversaries placed near today so the dashboard widgets have data)
  const cities = [
    { city: 'Chennai', pincode: '600001' }, { city: 'Coimbatore', pincode: '641001' },
    { city: 'Madurai', pincode: '625001' }, { city: 'Trichy', pincode: '620001' },
  ];
  const bloodGroups = ['A+', 'B+', 'O+', 'AB+', 'O-', 'B-'];
  const employees = [
    { firstName: 'Priya', lastName: 'Sharma', gender: 'female', email: 'hr@hrms.com', department: hrDept._id, designation: D.HRM001, salary: 75000, dob: yearsAgoOn(34, 12), joiningDate: yearsAgoOn(4, 40), user: hrUser._id, maritalStatus: 'married' },
    { firstName: 'John', lastName: 'Doe', gender: 'male', email: 'john@hrms.com', department: itDept._id, designation: D.SE001, salary: 55000, dob: yearsAgoOn(27, 0), joiningDate: yearsAgoOn(2, 3), user: johnUser._id, maritalStatus: 'single' },
    { firstName: 'Arun', lastName: 'Kumar', gender: 'male', email: 'arun@hrms.com', department: itDept._id, designation: D.SSE001, salary: 90000, dob: yearsAgoOn(31, 5), joiningDate: yearsAgoOn(5, 20), user: arunUser._id, maritalStatus: 'married' },
    { firstName: 'Meena', lastName: 'Raj', gender: 'female', email: 'meena@hrms.com', department: financeDept._id, designation: D.ACC001, salary: 48000, dob: yearsAgoOn(29, 60), joiningDate: yearsAgoOn(1, 9), user: meenaUser._id, maritalStatus: 'single' },
    { firstName: 'Karthik', lastName: 'Subramanian', gender: 'male', email: 'karthik@hrms.com', department: itDept._id, designation: D.SE001, salary: 52000, dob: yearsAgoOn(25, 21), joiningDate: yearsAgoOn(3, 90) },
    { firstName: 'Divya', lastName: 'Krishnan', gender: 'female', email: 'divya@hrms.com', department: itDept._id, designation: D.QA001, salary: 46000, dob: yearsAgoOn(26, 3), joiningDate: yearsAgoOn(1, 150) },
    { firstName: 'Suresh', lastName: 'Babu', gender: 'male', email: 'suresh@hrms.com', department: financeDept._id, designation: D.FM001, salary: 110000, dob: yearsAgoOn(42, 75), joiningDate: yearsAgoOn(8, 14), maritalStatus: 'married' },
    { firstName: 'Lakshmi', lastName: 'Narayanan', gender: 'female', email: 'lakshmi@hrms.com', department: hrDept._id, designation: D.HRE001, salary: 38000, dob: yearsAgoOn(24, 8), joiningDate: daysFromNow(-45) },
    { firstName: 'Vignesh', lastName: 'Ravi', gender: 'male', email: 'vignesh@hrms.com', department: salesDept._id, designation: D.SLM001, salary: 85000, dob: yearsAgoOn(36, 120), joiningDate: yearsAgoOn(6, 1), maritalStatus: 'married' },
    { firstName: 'Anitha', lastName: 'Selvam', gender: 'female', email: 'anitha@hrms.com', department: salesDept._id, designation: D.SLE001, salary: 35000, dob: yearsAgoOn(28, 200), joiningDate: yearsAgoOn(2, 30) },
    { firstName: 'Rahul', lastName: 'Verma', gender: 'male', email: 'rahul@hrms.com', department: salesDept._id, designation: D.SLE001, salary: 34000, dob: yearsAgoOn(26, 33), joiningDate: yearsAgoOn(1, 60), employmentType: 'contract' },
    { firstName: 'Kavya', lastName: 'Menon', gender: 'female', email: 'kavya@hrms.com', department: mktDept._id, designation: D.MKE001, salary: 42000, dob: yearsAgoOn(27, 15), joiningDate: yearsAgoOn(3, 6) },
    { firstName: 'Ganesh', lastName: 'Pandian', gender: 'male', email: 'ganesh@hrms.com', department: opsDept._id, designation: D.OPE001, salary: 30000, dob: yearsAgoOn(33, 90), joiningDate: yearsAgoOn(4, 100), shift: morningShift._id, maritalStatus: 'married' },
    { firstName: 'Sneha', lastName: 'Iyer', gender: 'female', email: 'sneha@hrms.com', department: itDept._id, designation: D.SE001, salary: 20000, dob: yearsAgoOn(22, 45), joiningDate: daysFromNow(-20), employmentType: 'intern' },
    { firstName: 'Manoj', lastName: 'Prabhu', gender: 'male', email: 'manoj@hrms.com', department: opsDept._id, designation: D.OPE001, salary: 28000, dob: yearsAgoOn(30, 250), joiningDate: yearsAgoOn(2, 180), shift: nightShift._id },
    { firstName: 'Murugan', lastName: 'Selvam', gender: 'male', email: 'driver@hrms.com', department: opsDept._id, designation: D.DRV001, salary: 22000, dob: yearsAgoOn(38, 70), joiningDate: yearsAgoOn(3, 50), user: driverUser._id, isDriver: true, maritalStatus: 'married' },
    { firstName: 'Selvam', lastName: 'Raju', gender: 'male', email: 'selvam@hrms.com', department: opsDept._id, designation: D.DRV001, salary: 21000, dob: yearsAgoOn(41, 160), joiningDate: yearsAgoOn(2, 75), isDriver: true, maritalStatus: 'married' },
    { firstName: 'Revathi', lastName: 'Sundar', gender: 'female', email: 'revathi@hrms.com', department: mktDept._id, designation: D.MKE001, salary: 40000, dob: yearsAgoOn(29, 300), joiningDate: yearsAgoOn(3, 210), status: 'inactive', exitDate: daysFromNow(-60), exitReason: 'Higher studies' },
  ];

  const created = [];
  for (let i = 0; i < employees.length; i++) {
    const loc = cities[i % cities.length];
    const emp = new Employee({
      shift: generalShift._id,
      employmentType: 'full_time',
      createdBy: superAdmin._id,
      ...employees[i],
      employeeId: `EMP${String(i + 1).padStart(3, '0')}`,
      mobile: `98400${String(10000 + i * 1111).slice(0, 5)}`,
      bloodGroup: bloodGroups[i % bloodGroups.length],
      bankName: i % 2 ? 'HDFC Bank' : 'State Bank of India',
      accountNumber: `30123456${String(i).padStart(2, '0')}`,
      ifscCode: i % 2 ? 'HDFC0001234' : 'SBIN0001234',
      panNumber: `ABCDE${1234 + i}F`,
      aadhaarNumber: `4567 8901 ${String(2345 + i).padStart(4, '0')}`,
      confirmationDate: employees[i].employmentType === 'intern' ? undefined : new Date(new Date(employees[i].joiningDate).getTime() + 180 * 86400000),
      address: { street: `${10 + i}, Gandhi Street`, city: loc.city, state: 'Tamil Nadu', pincode: loc.pincode },
    });
    await emp.save(); // save() so the fullName hook runs
    created.push(emp);
  }
  const E = Object.fromEntries(created.map((e) => [e.firstName.toLowerCase(), e]));
  const active = created.filter((e) => e.status === 'active');

  // Reporting managers
  const managerOf = [
    [E.arun, [E.john, E.karthik, E.divya, E.sneha]],
    [E.suresh, [E.meena]],
    [E.priya, [E.lakshmi, E.ganesh, E.manoj]],
    [E.vignesh, [E.anitha, E.rahul, E.kavya, E.revathi]],
  ];
  for (const [mgr, reports] of managerOf) {
    await Employee.updateMany({ _id: { $in: reports.map((r) => r._id) } }, { reportingManager: mgr._id });
  }
  for (const u of [hrUser, johnUser, arunUser, meenaUser, driverUser]) {
    await User.updateOne({ _id: u._id }, { employee: created.find((e) => e.user?.equals(u._id))._id });
  }

  // Leaves: mix of past approved, upcoming, pending and rejected
  const leaveDefs = [
    { emp: E.john, type: casualLeave, from: -12, days: 1, reason: 'Family function', status: 'approved' },
    { emp: E.karthik, type: sickLeave, from: -7, days: 2, reason: 'Fever and cold', status: 'approved' },
    { emp: E.meena, type: earnedLeave, from: -20, days: 3, reason: 'Vacation to Ooty', status: 'approved' },
    { emp: E.anitha, type: casualLeave, from: -3, days: 1, reason: 'Personal work', status: 'rejected', rejectionReason: 'Quarter-end client meetings' },
    { emp: E.divya, type: sickLeave, from: 0, days: 1, reason: 'Doctor appointment', status: 'approved' },
    { emp: E.john, type: earnedLeave, from: 6, days: 3, reason: 'Trip to hometown for festival', status: 'pending', hrApproved: true },
    { emp: E.kavya, type: casualLeave, from: 3, days: 1, reason: 'Sister\'s engagement', status: 'pending' },
    { emp: E.rahul, type: sickLeave, from: 1, days: 1, reason: 'Dental surgery', status: 'pending' },
    { emp: E.ganesh, type: earnedLeave, from: 14, days: 5, reason: 'Sabarimala pilgrimage', status: 'approved' },
    { emp: E.arun, type: casualLeave, from: 9, days: 0.5, reason: 'Bank work', status: 'pending', halfDay: true, halfDayType: 'second_half' },
    { emp: E.lakshmi, type: casualLeave, from: -5, days: 1, reason: 'Travel', status: 'cancelled' },
  ];
  // approved → HR + Super Admin both approved; rejected → HR rejected; pending → optionally HR already approved
  const seedApprovals = (status, hrApproved, at, remarks) => ({
    hr: status === 'approved' || hrApproved ? { status: 'approved', by: hrUser._id, at }
      : status === 'rejected' ? { status: 'rejected', by: hrUser._id, at, remarks } : { status: 'pending' },
    admin: status === 'approved' ? { status: 'approved', by: superAdmin._id, at } : { status: 'pending' },
  });
  const leaves = await Leave.insertMany(leaveDefs.map((l) => ({
    employee: l.emp._id, leaveType: l.type._id,
    fromDate: daysFromNow(l.from), toDate: daysFromNow(l.from + Math.max(Math.ceil(l.days) - 1, 0)),
    totalDays: l.days, reason: l.reason, status: l.status,
    halfDay: !!l.halfDay, halfDayType: l.halfDayType,
    approvals: seedApprovals(l.status, l.hrApproved, daysFromNow(Math.min(l.from, 0) - 2), l.rejectionReason),
    approvedBy: l.status === 'approved' ? superAdmin._id : l.status === 'rejected' ? hrUser._id : undefined,
    approvedAt: ['approved', 'rejected'].includes(l.status) ? daysFromNow(Math.min(l.from, 0) - 2) : undefined,
    rejectionReason: l.rejectionReason,
  })));
  const onApprovedLeave = (emp, date) => leaves.some((l) => l.status === 'approved' && l.employee.equals(emp._id) && date >= l.fromDate && date <= l.toDate);

  // Attendance: last ~22 weekdays for active staff, plus today for everyone except John/Priya
  // (so check-in can be tried live from those logins)
  const attendance = [];
  const shiftTimes = (emp) => {
    if (emp.shift.equals(morningShift._id)) return { in: '05:55', late: '06:25', out: '14:05' };
    if (emp.shift.equals(nightShift._id)) return { in: '21:55', late: '22:20', out: '06:05' };
    return { in: '09:25', late: '09:58', out: '18:35' };
  };
  const lateMinutesOf = (emp) => (emp.shift.equals(morningShift._id) ? 15 : emp.shift.equals(nightShift._id) ? 10 : 13);
  const lateReasons = ['Heavy traffic near Guindy', 'Bus breakdown on the way', 'Rain — waterlogging on main road', 'Hospital visit for parent in the morning'];
  const pickups = ['Chennai Airport (T1) — client pickup', 'Central Railway Station — guest pickup', 'Tidel Park — MD drop', 'Velachery — staff pickup'];
  const lateInfo = (emp, back, idx) => {
    const underReview = back <= 3;
    const at = daysFromNow(-back);
    return {
      minutes: lateMinutesOf(emp),
      reason: lateReasons[(back + idx) % lateReasons.length],
      pickupLocation: emp.isDriver ? pickups[(back + idx) % pickups.length] : undefined,
      status: underReview ? 'pending' : 'approved',
      approvals: {
        hr: underReview && back > 1 ? { status: 'approved', by: hrUser._id, at } : underReview ? { status: 'pending' } : { status: 'approved', by: hrUser._id, at },
        admin: underReview ? { status: 'pending' } : { status: 'approved', by: superAdmin._id, at },
      },
    };
  };
  let weekdays = 0;
  for (let back = 0; weekdays < 22 && back < 40; back++) {
    const date = daysFromNow(-back);
    if (isWeekend(date)) continue;
    weekdays++;
    active.forEach((emp, idx) => {
      if (emp.joiningDate > date) return;
      if (back === 0 && [E.john, E.priya, E.murugan].some((x) => emp._id.equals(x._id))) return;
      const t = shiftTimes(emp);
      if (onApprovedLeave(emp, date)) {
        attendance.push({ employee: emp._id, date, shift: emp.shift, attendanceStatus: 'on_leave', markedBy: superAdmin._id });
        return;
      }
      const late = (back + idx) % (emp.isDriver ? 4 : 7) === 0;
      const absent = back > 0 && (back + idx) % 13 === 0;
      const half = !absent && (back + idx) % 17 === 0;
      const stillIn = back === 0; // today: checked in, not yet out
      attendance.push({
        employee: emp._id, date, shift: emp.shift,
        checkIn: absent ? undefined : late ? t.late : t.in,
        checkOut: absent || stillIn ? undefined : half ? '13:45' : t.out,
        workingHours: absent || stillIn ? 0 : half ? 4.2 : late ? 8.6 : 9.2,
        overtimeHours: absent || stillIn || half ? 0 : late ? 0.6 : 1.2,
        attendanceStatus: absent ? 'absent' : half ? 'half_day' : late ? 'late' : 'present',
        ...(late && !absent && !half && { late: lateInfo(emp, back, idx), pickupLocation: emp.isDriver ? lateInfo(emp, back, idx).pickupLocation : undefined }),
        markedBy: superAdmin._id,
      });
    });
  }
  await Attendance.insertMany(attendance);

  // Permissions (monthly quota 2h; beyond it the request is a half-day)
  const thisMonthDay = (n) => new Date(today.getFullYear(), today.getMonth(), Math.max(1, Math.min(n, 28)));
  const both = (at) => ({ hr: { status: 'approved', by: hrUser._id, at }, admin: { status: 'approved', by: superAdmin._id, at } });
  const permissions = await Permission.insertMany([
    { employee: E.john._id, date: thisMonthDay(today.getDate() - 4), fromTime: '16:30', toTime: '17:30', minutes: 60, reason: 'Bank visit for home loan documents', type: 'permission', status: 'approved', approvals: both(daysFromNow(-5)), approvedAt: daysFromNow(-5) },
    { employee: E.john._id, date: thisMonthDay(today.getDate() + 2), fromTime: '15:00', toTime: '16:30', minutes: 90, reason: 'Parent-teacher meeting at school', type: 'half_day', status: 'pending', approvals: { hr: { status: 'pending' }, admin: { status: 'pending' } } },
    { employee: E.meena._id, date: thisMonthDay(today.getDate() - 2), fromTime: '09:30', toTime: '10:00', minutes: 30, reason: 'Vehicle service drop-off', type: 'permission', status: 'approved', approvals: both(daysFromNow(-3)), approvedAt: daysFromNow(-3) },
    { employee: E.arun._id, date: thisMonthDay(today.getDate() + 1), fromTime: '17:00', toTime: '18:30', minutes: 90, reason: 'Passport verification appointment', type: 'permission', status: 'pending', approvals: { hr: { status: 'approved', by: hrUser._id, at: daysFromNow(0) }, admin: { status: 'pending' } } },
    { employee: E.murugan._id, date: thisMonthDay(today.getDate() - 1), fromTime: '14:00', toTime: '15:00', minutes: 60, reason: 'Vehicle FC renewal at RTO', type: 'permission', status: 'pending', approvals: { hr: { status: 'pending' }, admin: { status: 'pending' } } },
  ]);

  // Payroll: last 3 months paid (payslip PDFs downloadable), current month as draft for HR to process
  const buildPayroll = (emp, month, year, status) => {
    const basic = Math.round(emp.salary * 0.5);
    const allowances = [
      { name: 'HRA', amount: Math.round(emp.salary * 0.2) },
      { name: 'Special Allowance', amount: Math.round(emp.salary * 0.25) },
      { name: 'Transport', amount: Math.round(emp.salary * 0.05) },
    ];
    const deductions = [
      { name: 'PF (12%)', amount: Math.round(basic * 0.12) },
      { name: 'Professional Tax', amount: 200 },
    ];
    if (emp.salary > 60000) deductions.push({ name: 'TDS', amount: Math.round(emp.salary * 0.08) });
    const totalAllowances = allowances.reduce((s, a) => s + a.amount, 0);
    const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
    const grossSalary = basic + totalAllowances;
    const workingDays = new Date(year, month, 0).getDate();
    const absentDays = (emp.employeeId.charCodeAt(5) + month) % 3;
    const processedAt = new Date(year, month - 1, workingDays - 1);
    return {
      employee: emp._id, month, year, basicSalary: basic, allowances, deductions,
      totalAllowances, totalDeductions, grossSalary, netSalary: grossSalary - totalDeductions,
      workingDays, presentDays: workingDays - absentDays, absentDays, status,
      processedBy: status === 'draft' ? undefined : superAdmin._id,
      processedAt: status === 'draft' ? undefined : processedAt,
      paidAt: status === 'paid' ? new Date(processedAt.getTime() + 86400000) : undefined,
      paymentMode: status === 'paid' ? 'bank_transfer' : undefined,
    };
  };
  const payrolls = [];
  for (let m = 3; m >= 0; m--) {
    const d = new Date(today.getFullYear(), today.getMonth() - m, 1);
    const status = m === 0 ? 'draft' : 'paid';
    created
      .filter((e) => e.joiningDate < new Date(d.getFullYear(), d.getMonth() + 1, 0))
      .filter((e) => e.status === 'active' || (e.exitDate && e.exitDate >= d))
      .forEach((e) => payrolls.push(buildPayroll(e, d.getMonth() + 1, d.getFullYear(), status)));
  }
  await Payroll.insertMany(payrolls);

  // Expenses
  const expenseDefs = [
    { emp: E.vignesh, type: 'travel', amount: 8450, desc: 'Flight to Bangalore for client meeting', on: -18, status: 'approved' },
    { emp: E.vignesh, type: 'accommodation', amount: 6200, desc: 'Hotel stay - 2 nights, Bangalore', on: -17, status: 'approved' },
    { emp: E.anitha, type: 'food', amount: 1850, desc: 'Client lunch at Taj Coromandel', on: -10, status: 'approved' },
    { emp: E.rahul, type: 'travel', amount: 960, desc: 'Cab fare for client visits', on: -6, status: 'pending' },
    { emp: E.john, type: 'training', amount: 4999, desc: 'AWS Cloud Practitioner certification fee', on: -4, status: 'pending' },
    { emp: E.karthik, type: 'communication', amount: 799, desc: 'Mobile data recharge for on-call support', on: -15, status: 'approved' },
    { emp: E.kavya, type: 'other', amount: 3500, desc: 'Printing of marketing brochures', on: -8, status: 'rejected', reason: 'Should go through vendor PO' },
    { emp: E.meena, type: 'medical', amount: 2300, desc: 'Annual health checkup', on: -25, status: 'approved' },
    { emp: E.arun, type: 'training', amount: 12000, desc: 'React Conf India ticket', on: -2, status: 'pending' },
    { emp: E.ganesh, type: 'travel', amount: 450, desc: 'Auto fare - courier to bank', on: -1, status: 'pending' },
  ];
  await Expense.insertMany(expenseDefs.map((x) => ({
    employee: x.emp._id, expenseType: x.type, amount: x.amount, description: x.desc,
    expenseDate: daysFromNow(x.on), status: x.status,
    approvedBy: x.status === 'pending' ? undefined : hrUser._id,
    approvedAt: x.status === 'pending' ? undefined : daysFromNow(x.on + 2),
    rejectionReason: x.reason,
  })));

  // Assets
  const assetDefs = [
    ['AST-LAP-001', 'Dell Latitude 5440', 'laptop', 'Dell', 'Latitude 5440', 72000, E.john, 'good'],
    ['AST-LAP-002', 'MacBook Pro 14"', 'laptop', 'Apple', 'MacBook Pro M3', 185000, E.arun, 'new'],
    ['AST-LAP-003', 'Lenovo ThinkPad E14', 'laptop', 'Lenovo', 'ThinkPad E14 Gen 5', 65000, E.karthik, 'good'],
    ['AST-LAP-004', 'HP ProBook 440', 'laptop', 'HP', 'ProBook 440 G10', 58000, E.divya, 'good'],
    ['AST-LAP-005', 'Lenovo ThinkPad E14', 'laptop', 'Lenovo', 'ThinkPad E14 Gen 5', 65000, null, 'new'],
    ['AST-LAP-006', 'Dell Vostro 3520', 'laptop', 'Dell', 'Vostro 3520', 45000, null, 'fair', 'under_maintenance'],
    ['AST-DSK-001', 'HP ProDesk Desktop', 'desktop', 'HP', 'ProDesk 400 G9', 52000, E.meena, 'good'],
    ['AST-DSK-002', 'Dell OptiPlex', 'desktop', 'Dell', 'OptiPlex 7010', 55000, E.suresh, 'good'],
    ['AST-MOB-001', 'iPhone 15', 'mobile', 'Apple', 'iPhone 15', 79900, E.vignesh, 'new'],
    ['AST-MOB-002', 'Samsung Galaxy A55', 'mobile', 'Samsung', 'Galaxy A55', 39999, E.anitha, 'good'],
    ['AST-TAB-001', 'iPad Air', 'tablet', 'Apple', 'iPad Air M2', 59900, E.kavya, 'good'],
    ['AST-VEH-001', 'Honda Activa (Office)', 'vehicle', 'Honda', 'Activa 6G', 82000, E.ganesh, 'fair'],
    ['AST-FUR-001', 'Ergonomic Chair', 'furniture', 'Featherlite', 'Optima', 14500, null, 'good'],
    ['AST-EQP-001', 'Epson Projector', 'equipment', 'Epson', 'EB-X51', 42000, null, 'good'],
    ['AST-LAP-007', 'Dell Inspiron 15', 'laptop', 'Dell', 'Inspiron 3511', 48000, null, 'poor', 'retired'],
  ];
  await Asset.insertMany(assetDefs.map(([code, name, type, brand, model, price, emp, condition, status], i) => ({
    assetCode: code, assetName: name, assetType: type, brand, model,
    serialNumber: `SN${(980000 + i * 137).toString(36).toUpperCase()}`,
    purchaseDate: yearsAgoOn(1 + (i % 3), -i * 10), purchasePrice: price, condition,
    assignedEmployee: emp?._id, assignedDate: emp ? daysFromNow(-30 - i * 12) : undefined,
    status: status || (emp ? 'assigned' : 'available'),
    description: `${name} - company asset`, createdBy: superAdmin._id,
  })));

  // Recruitment
  const cand = (name, stage, applied, extra = {}) => ({
    name, email: `${name.split(' ')[0].toLowerCase()}.${name.split(' ')[1].toLowerCase()}@gmail.com`,
    mobile: `9${String(876500000 + name.length * 12345).slice(0, 9)}`,
    applicationDate: daysFromNow(applied), stage, ...extra,
  });
  await Job.create([
    {
      jobTitle: 'Full Stack Developer (MERN)', department: itDept._id, openings: 2, experienceMin: 2, experienceMax: 5,
      salaryMin: 600000, salaryMax: 1200000, jobType: 'full_time', location: 'Chennai',
      description: 'Build and maintain web applications using MongoDB, Express, React and Node.js.',
      requirements: 'React, Node.js, MongoDB, REST APIs, Git', status: 'open', closingDate: daysFromNow(30), createdBy: hrUser._id,
      candidates: [
        cand('Hari Prasad', 'interview', -12, { interviewDate: daysFromNow(2), notes: 'Strong React skills' }),
        cand('Nisha Gupta', 'screening', -8),
        cand('Bala Murugan', 'offer', -20, { notes: 'Offer sent - 9.5 LPA' }),
        cand('Deepak Raj', 'rejected', -15, { notes: 'Lacks backend experience' }),
        cand('Fathima Begum', 'applied', -2),
      ],
    },
    {
      jobTitle: 'Sales Executive', department: salesDept._id, openings: 3, experienceMin: 0, experienceMax: 2,
      salaryMin: 300000, salaryMax: 450000, jobType: 'full_time', location: 'Coimbatore',
      description: 'Generate leads and close deals with SME clients.',
      requirements: 'Good communication in Tamil and English, two-wheeler', status: 'open', closingDate: daysFromNow(15), createdBy: hrUser._id,
      candidates: [
        cand('Ramesh Kannan', 'hired', -30, { notes: 'Joining next month' }),
        cand('Pooja Nair', 'interview', -9, { interviewDate: daysFromNow(1) }),
        cand('Vijay Anand', 'applied', -1),
      ],
    },
    {
      jobTitle: 'QA Automation Intern', department: itDept._id, openings: 1, experienceMin: 0, experienceMax: 1,
      salaryMin: 180000, salaryMax: 240000, jobType: 'intern', location: 'Chennai (Hybrid)',
      description: 'Write automated tests using Playwright / Selenium.',
      requirements: 'Basic JavaScript or Python', status: 'on_hold', createdBy: hrUser._id,
      candidates: [cand('Swetha Mohan', 'screening', -5)],
    },
    {
      jobTitle: 'Payroll Accountant', department: financeDept._id, openings: 1, experienceMin: 3, experienceMax: 6,
      salaryMin: 450000, salaryMax: 650000, jobType: 'full_time', location: 'Chennai',
      description: 'Handle payroll processing, PF/ESI and statutory compliance.',
      requirements: 'Tally, PF/ESI filing, Excel', status: 'closed', closingDate: daysFromNow(-10), createdBy: hrUser._id,
      candidates: [cand('Gowri Shankar', 'hired', -40), cand('Mohan Das', 'rejected', -38)],
    },
  ]);

  // Performance reviews
  const quarter = `Q${Math.floor(today.getMonth() / 3) + 1} ${today.getFullYear()}`;
  const lastYear = `Annual ${today.getFullYear() - 1}`;
  const perfDefs = [
    { emp: E.john, reviewer: arunUser, period: lastYear, rating: 4, status: 'acknowledged', strengths: 'Quick learner, delivers on time', improvements: 'Write more unit tests', empComments: 'Thanks, will focus on testing.' },
    { emp: E.karthik, reviewer: arunUser, period: lastYear, rating: 3, status: 'acknowledged', strengths: 'Reliable on support rotations', improvements: 'Take more ownership of features' },
    { emp: E.arun, reviewer: hrUser, period: lastYear, rating: 5, status: 'acknowledged', strengths: 'Excellent technical leadership', improvements: 'Delegate more to juniors' },
    { emp: E.meena, reviewer: hrUser, period: lastYear, rating: 4, status: 'submitted', strengths: 'Accurate bookkeeping', improvements: 'Automate monthly reports' },
    { emp: E.vignesh, reviewer: hrUser, period: lastYear, rating: 4, status: 'acknowledged', strengths: 'Exceeded sales target by 18%', improvements: 'Improve CRM hygiene' },
    { emp: E.anitha, reviewer: hrUser, period: quarter, rating: 3, status: 'draft', strengths: 'Good client rapport', improvements: 'Follow-up consistency' },
    { emp: E.john, reviewer: arunUser, period: quarter, rating: 4, status: 'submitted', strengths: 'Shipped dashboard revamp', improvements: 'Code review turnaround' },
    { emp: E.kavya, reviewer: hrUser, period: quarter, rating: 5, status: 'submitted', strengths: 'Campaign ROI up 2x', improvements: 'Document playbooks' },
  ];
  await Performance.insertMany(perfDefs.map((p, i) => ({
    employee: p.emp._id, reviewer: p.reviewer._id, reviewPeriod: p.period,
    reviewDate: p.period === quarter ? daysFromNow(-3 - i) : new Date(today.getFullYear(), 0, 20 + i),
    overallRating: p.rating,
    kpis: [
      { kpiName: 'Goal completion (%)', target: 100, achieved: 60 + p.rating * 8, rating: p.rating },
      { kpiName: 'Quality', target: 5, achieved: p.rating, rating: p.rating },
      { kpiName: 'Teamwork', target: 5, achieved: Math.min(5, p.rating + 1), rating: Math.min(5, p.rating + 1) },
    ],
    strengths: p.strengths, improvements: p.improvements,
    comments: p.rating >= 4 ? 'Keep up the great work!' : 'Meets expectations, room to grow.',
    employeeComments: p.empComments, status: p.status,
    acknowledgedAt: p.status === 'acknowledged' ? new Date(today.getFullYear(), 0, 25 + i) : undefined,
  })));

  // Announcements
  await Announcement.create([
    {
      title: 'Welcome to the new HRMS 🎉',
      content: 'You can now check in/out from the dashboard, download payslips as PDF, and get notified when your leave or expense is approved.',
      priority: 'important', pinned: true, createdBy: hrUser._id,
    },
    {
      title: 'Deepavali celebrations',
      content: 'Join us for sweets, rangoli competition and team lunch on the last working day before Deepavali. Ethnic wear encouraged!',
      priority: 'normal', createdBy: hrUser._id, expiresAt: nextOccurrence(11, 9),
    },
    {
      title: 'Submit investment declarations',
      content: 'Please submit your 80C / 80D investment proofs to Finance before the 25th to avoid excess TDS.',
      priority: 'urgent', createdBy: superAdmin._id, expiresAt: daysFromNow(20),
    },
    {
      title: 'Production deploy freeze',
      content: 'No production deployments this Friday due to infra maintenance window (10 PM – 2 AM).',
      priority: 'important', department: itDept._id, createdBy: arunUser._id, expiresAt: daysFromNow(5),
    },
    {
      title: 'New sales incentive policy',
      content: 'Quarterly incentives are now 5% of closed revenue above target. Details in the shared drive.',
      priority: 'normal', department: salesDept._id, createdBy: hrUser._id,
    },
  ]);

  // Notifications for the login users
  const notif = (user, title, message, type, link, read, hoursAgo) => ({ user: user._id, title, message, type, link, read, createdAt: new Date(Date.now() - hoursAgo * 3600000) });
  await Notification.insertMany([
    notif(johnUser, 'Leave approved', 'Your casual leave request was approved.', 'leave', '/leaves', true, 260),
    notif(johnUser, 'Payslip available', 'Your payslip for last month is ready to download.', 'payroll', '/payroll', false, 120),
    notif(johnUser, 'Performance review submitted', `Your ${quarter} review has been submitted by Arun Kumar.`, 'performance', '/performance', false, 70),
    notif(johnUser, 'New announcement', 'Production deploy freeze', 'announcement', '/announcements', false, 5),
    notif(hrUser, 'New leave request', 'John Doe applied for 3 days of Earned Leave.', 'leave', '/leaves', false, 20),
    notif(hrUser, 'New leave request', 'Kavya Menon applied for 1 day of Casual Leave.', 'leave', '/leaves', false, 10),
    notif(hrUser, 'Late check-in (driver): Selvam Raju', '13m late · from Chennai Airport (T1) — client pickup', 'attendance', '/attendance?tab=late', false, 26),
    notif(superAdmin, 'Leave awaiting your approval', 'HR has approved John Doe\'s Earned Leave. Your approval is needed.', 'leave', '/leave', false, 18),
    notif(superAdmin, 'Permission awaiting your approval', 'HR has approved Arun Kumar\'s permission. Your approval is needed.', 'permission', '/leave?tab=permissions', false, 3),
    notif(hrUser, 'New expense claim', 'Arun Kumar submitted ₹12,000 for training.', 'expense', '/expenses', false, 40),
    notif(hrUser, 'Payroll pending', 'Payroll for this month is in draft. Process before month end.', 'payroll', '/payroll', true, 96),
    notif(superAdmin, 'New expense claim', 'John Doe submitted ₹4,999 for training.', 'expense', '/expenses', false, 90),
    notif(superAdmin, 'New employee onboarded', 'Sneha Iyer joined IT as an intern.', 'general', '/employees', true, 480),
    notif(arunUser, 'Expense submitted', 'Your claim of ₹12,000 is pending approval.', 'expense', '/expenses', false, 40),
    notif(meenaUser, 'Performance review submitted', 'Your annual review is ready to acknowledge.', 'performance', '/performance', false, 150),
  ]);

  console.log('✅ Seed data created:');
  console.log('   Super Admin: admin@hrms.com / Admin@123');
  console.log('   HR Manager:  hr@hrms.com / Hr@123456     (Priya Sharma)');
  console.log('   Employee:    john@hrms.com / Employee@123 (John Doe)');
  console.log('   Employee:    arun@hrms.com / Employee@123 (Arun Kumar, team lead)');
  console.log('   Employee:    meena@hrms.com / Employee@123 (Meena Raj)');
  console.log('   Driver:      driver@hrms.com / Employee@123 (Murugan Selvam — not checked in today)');
  console.log(`   ${depts.length} departments, ${des.length} designations, ${created.length} employees`);
  console.log(`   ${permissions.length} permissions, ${attendance.length} attendance, ${leaves.length} leaves, ${payrolls.length} payrolls, ${expenseDefs.length} expenses`);
  console.log(`   ${assetDefs.length} assets, 4 jobs, ${perfDefs.length} reviews, 5 announcements, 12 notifications`);

  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
