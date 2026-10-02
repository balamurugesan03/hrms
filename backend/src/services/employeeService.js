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
  { path: 'shift', select: 'shiftName startTime endTime' },
];

const createEmployee = async (data, userId, photoPath) => {
  const existing = await Employee.findOne({ email: data.email });
  if (existing) throw new ApiError('Employee with this email already exists', 400);

  const employeeId = await generateEmployeeId();
  const employee = await Employee.create({
    ...data,
    employeeId,
    photo: photoPath || null,
    createdBy: userId,
  });

  // Create user account
  const userPassword = `${employee.firstName}@${new Date(data.joiningDate).getFullYear()}`;
  const user = await User.create({
    name: `${data.firstName} ${data.lastName}`,
    email: data.email,
    password: userPassword,
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

const updateEmployee = async (id, data, photoPath) => {
  const employee = await Employee.findById(id);
  if (!employee) throw new ApiError('Employee not found', 404);

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
  createEmployee, getEmployees, getEmployeeById, updateEmployee,
  deleteEmployee, getEmployeeProfile, exportEmployees, importEmployees,
};
