const Employee = require('../models/Employee');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const { paginate, buildSearchQuery } = require('../utils/pagination');
const { generateEmployeeId } = require('../utils/generateId');
const XLSX = require('xlsx');
const path = require('path');

const POPULATE_FIELDS = [
  { path: 'department', select: 'departmentName departmentCode' },
  { path: 'designation', select: 'designationName designationCode' },
  { path: 'reportingManager', select: 'firstName lastName employeeId' },
  { path: 'reportingManagers', select: 'name email role' },
  { path: 'lateApprovers', select: 'name email role' },
  { path: 'shift', select: 'shiftName startTime endTime' },
];

// Approver lists must reference active login users; the employee cannot approve themselves
const checkApprovers = async (ids, label, ownUserId) => {
  if (!Array.isArray(ids)) throw new ApiError(`${label} must be a list`, 400);
  const unique = [...new Set(ids.map(String))];
  if (ownUserId && unique.includes(String(ownUserId))) throw new ApiError(`An employee cannot be their own ${label.toLowerCase().replace(/s$/, '')}`, 400);
  const found = await User.countDocuments({ _id: { $in: unique }, status: 'active' });
  if (found !== unique.length) throw new ApiError(`${label}: one or more selected users are not active`, 400);
  return unique;
};

const getApproverOptions = () => User.find({ status: 'active' }).select('name email role employee').sort({ name: 1 }).lean();

const checkPassword = (password) => {
  if (password && String(password).length < 6) throw new ApiError('Password must be at least 6 characters', 400);
};

const createEmployee = async ({ password, ...data }, userId, photoPath) => {
  if (!password) throw new ApiError('Login password is required', 400);
  if (!data.shift) throw new ApiError('Shift is required', 400);
  if (!data.reportingManagers?.length) throw new ApiError('Select at least one reporting manager', 400);
  checkPassword(password);
  data.reportingManagers = await checkApprovers(data.reportingManagers, 'Reporting managers');
  data.lateApprovers = await checkApprovers(data.lateApprovers || [], 'Late approvers');
  const existing = await Employee.findOne({ email: data.email });
  if (existing) throw new ApiError('Employee with this email already exists', 400);

  const employeeId = await generateEmployeeId();
  const employee = await Employee.create({
    ...data,
    employeeId,
    photo: photoPath || null,
    createdBy: userId,
  });

  const user = await User.create({
    name: `${data.firstName} ${data.lastName}`,
    email: data.email,
    password,
    role: 'employee',
    employee: employee._id,
  });

  employee.user = user._id;
  await employee.save();

  return employee;
};

const getEmployees = async (query) => {
  const { page = 1, limit = 10, search, status, department, designation, employmentType } = query;
  const filter = {};

  if (status) filter.status = status;
  if (department) filter.department = department;
  if (designation) filter.designation = designation;
  if (employmentType) filter.employmentType = employmentType;

  if (search) {
    const regex = new RegExp(search, 'i');
    filter.$or = [
      { firstName: regex }, { lastName: regex }, { email: regex }, { employeeId: regex }, { mobile: regex },
    ];
  }

  return paginate(Employee, filter, {
    page,
    limit,
    sort: { createdAt: -1 },
    populate: POPULATE_FIELDS,
  });
};

const getEmployeeById = async (id) => {
  const employee = await Employee.findById(id).populate(POPULATE_FIELDS);
  if (!employee) throw new ApiError('Employee not found', 404);
  return employee;
};

const updateEmployee = async (id, { password, ...data }, photoPath) => {
  checkPassword(password);
  const employee = await Employee.findById(id);
  if (!employee) throw new ApiError('Employee not found', 404);
  if (data.reportingManagers !== undefined) {
    if (!data.reportingManagers?.length) throw new ApiError('Select at least one reporting manager', 400);
    data.reportingManagers = await checkApprovers(data.reportingManagers, 'Reporting managers', employee.user);
  }
  if (data.lateApprovers !== undefined) data.lateApprovers = await checkApprovers(data.lateApprovers || [], 'Late approvers', employee.user);

  // Optional login password reset by HR / Admin (save() so the hash hook runs)
  if (password) {
    const user = employee.user ? await User.findById(employee.user) : await User.findOne({ email: employee.email });
    if (!user) throw new ApiError('No login account is linked to this employee', 400);
    user.password = password;
    await user.save();
  }

  if (photoPath) data.photo = photoPath;

  return Employee.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate(POPULATE_FIELDS);
};

const deleteEmployee = async (id) => {
  const employee = await Employee.findById(id);
  if (!employee) throw new ApiError('Employee not found', 404);
  await Employee.findByIdAndDelete(id);
  if (employee.user) await User.findByIdAndDelete(employee.user);
};

const getEmployeeProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user || !user.employee) throw new ApiError('Employee profile not found', 404);
  return Employee.findById(user.employee).populate(POPULATE_FIELDS);
};

const exportEmployees = async (filter = {}) => {
  const employees = await Employee.find(filter)
    .populate('department', 'departmentName')
    .populate('designation', 'designationName')
    .lean();

  const rows = employees.map((emp) => ({
    'Employee ID': emp.employeeId,
    'First Name': emp.firstName,
    'Last Name': emp.lastName,
    'Email': emp.email,
    'Mobile': emp.mobile,
    'Gender': emp.gender,
    'Department': emp.department?.departmentName,
    'Designation': emp.designation?.designationName,
    'Employment Type': emp.employmentType,
    'Joining Date': emp.joiningDate ? new Date(emp.joiningDate).toLocaleDateString() : '',
    'Status': emp.status,
    'Salary': emp.salary,
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Employees');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

const importEmployees = async (filePath, userId) => {
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws);

  const results = { success: 0, failed: 0, errors: [] };

  for (const row of rows) {
    try {
      const employeeId = await generateEmployeeId();
      await Employee.create({
        employeeId,
        firstName: row['First Name'],
        lastName: row['Last Name'],
        email: row['Email'],
        mobile: row['Mobile'],
        gender: row['Gender']?.toLowerCase(),
        joiningDate: new Date(row['Joining Date']),
        status: 'active',
        createdBy: userId,
      });
      results.success++;
    } catch (err) {
      results.failed++;
      results.errors.push({ row: row['Email'], error: err.message });
    }
  }

  return results;
};

module.exports = {
  createEmployee, getApproverOptions, getEmployees, getEmployeeById, updateEmployee,
  deleteEmployee, getEmployeeProfile, exportEmployees, importEmployees,
};
