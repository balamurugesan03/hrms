const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Payroll = require('../models/Payroll');
const Asset = require('../models/Asset');
const ApiResponse = require('../utils/ApiResponse');
const XLSX = require('xlsx');

const generateExcel = (data, sheetName, filename, res) => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
};

const employeeReport = async (req, res, next) => {
  try {
    const { format = 'json', status, department } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (department) filter.department = department;

    const employees = await Employee.find(filter)
      .populate('department', 'departmentName')
      .populate('designation', 'designationName')
      .lean();

    if (format === 'excel') {
      const rows = employees.map((e) => ({
        'Employee ID': e.employeeId,
        'Name': `${e.firstName} ${e.lastName}`,
        'Email': e.email,
        'Mobile': e.mobile,
        'Gender': e.gender,
        'Department': e.department?.departmentName,
        'Designation': e.designation?.designationName,
        'Employment Type': e.employmentType,
        'Joining Date': e.joiningDate ? new Date(e.joiningDate).toLocaleDateString() : '',
        'Status': e.status,
        'Salary': e.salary,
      }));
      return generateExcel(rows, 'Employees', 'employee_report.xlsx', res);
    }

    ApiResponse.success(res, employees);
  } catch (error) {
    next(error);
  }
};

const attendanceReport = async (req, res, next) => {
  try {
    const { format = 'json', month, year, employee } = req.query;
    const filter = {};
    if (employee) filter.employee = employee;
    if (month && year) {
      filter.date = {
        $gte: new Date(year, month - 1, 1),
        $lte: new Date(year, month, 0, 23, 59, 59),
      };
    }

    const records = await Attendance.find(filter)
      .populate('employee', 'firstName lastName employeeId')
      .sort({ date: 1 })
      .lean();

    if (format === 'excel') {
      const rows = records.map((r) => ({
        'Employee ID': r.employee?.employeeId,
        'Employee Name': `${r.employee?.firstName} ${r.employee?.lastName}`,
        'Date': new Date(r.date).toLocaleDateString(),
        'Check In': r.checkIn || '-',
        'Check Out': r.checkOut || '-',
        'Working Hours': r.workingHours?.toFixed(2),
        'Status': r.attendanceStatus,
      }));
      return generateExcel(rows, 'Attendance', 'attendance_report.xlsx', res);
    }

    ApiResponse.success(res, records);
  } catch (error) {
    next(error);
  }
};

const leaveReport = async (req, res, next) => {
  try {
    const { format = 'json', status, employee } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (employee) filter.employee = employee;

    const records = await Leave.find(filter)
      .populate('employee', 'firstName lastName employeeId')
      .populate('leaveType', 'leaveTypeName')
      .lean();

    if (format === 'excel') {
      const rows = records.map((r) => ({
        'Employee ID': r.employee?.employeeId,
        'Employee Name': `${r.employee?.firstName} ${r.employee?.lastName}`,
        'Leave Type': r.leaveType?.leaveTypeName,
        'From Date': new Date(r.fromDate).toLocaleDateString(),
        'To Date': new Date(r.toDate).toLocaleDateString(),
        'Total Days': r.totalDays,
        'Status': r.status,
        'Reason': r.reason,
      }));
      return generateExcel(rows, 'Leave', 'leave_report.xlsx', res);
    }

    ApiResponse.success(res, records);
  } catch (error) {
    next(error);
  }
};

const payrollReport = async (req, res, next) => {
  try {
    const { format = 'json', month, year } = req.query;
    const filter = {};
    if (month) filter.month = parseInt(month);
    if (year) filter.year = parseInt(year);

    const records = await Payroll.find(filter)
      .populate('employee', 'firstName lastName employeeId department designation')
      .lean();

    if (format === 'excel') {
      const rows = records.map((r) => ({
        'Employee ID': r.employee?.employeeId,
        'Employee Name': `${r.employee?.firstName} ${r.employee?.lastName}`,
        'Month': r.month,
        'Year': r.year,
        'Basic Salary': r.basicSalary,
        'Total Allowances': r.totalAllowances,
        'Total Deductions': r.totalDeductions,
        'Gross Salary': r.grossSalary,
        'Net Salary': r.netSalary,
        'Status': r.status,
      }));
      return generateExcel(rows, 'Payroll', 'payroll_report.xlsx', res);
    }

    ApiResponse.success(res, records);
  } catch (error) {
    next(error);
  }
};

const assetReport = async (req, res, next) => {
  try {
    const { format = 'json', status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const records = await Asset.find(filter)
      .populate('assignedEmployee', 'firstName lastName employeeId')
      .lean();

    if (format === 'excel') {
      const rows = records.map((r) => ({
        'Asset Code': r.assetCode,
        'Asset Name': r.assetName,
        'Asset Type': r.assetType,
        'Brand': r.brand,
        'Serial Number': r.serialNumber,
        'Assigned To': r.assignedEmployee ? `${r.assignedEmployee.firstName} ${r.assignedEmployee.lastName}` : '-',
        'Status': r.status,
        'Condition': r.condition,
      }));
      return generateExcel(rows, 'Assets', 'asset_report.xlsx', res);
    }

    ApiResponse.success(res, records);
  } catch (error) {
    next(error);
  }
};

module.exports = { employeeReport, attendanceReport, leaveReport, payrollReport, assetReport };
