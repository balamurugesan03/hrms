const Department = require('../models/Department');
const ApiError = require('../utils/ApiError');
const { paginate, buildSearchQuery } = require('../utils/pagination');

const createDepartment = async (data, userId) => {
  const existing = await Department.findOne({
    $or: [{ departmentCode: data.departmentCode.toUpperCase() }, { departmentName: data.departmentName }],
  });
  if (existing) throw new ApiError('Department code or name already exists', 400);

  return Department.create({ ...data, createdBy: userId });
};

const getDepartments = async (query) => {
  const { page = 1, limit = 10, search, status } = query;
  const filter = {};
  if (status) filter.status = status;
  if (search) {
    Object.assign(filter, buildSearchQuery(['departmentName', 'departmentCode', 'description'], search));
  }
  return paginate(Department, filter, { page, limit, sort: { departmentName: 1 } });
};

const getAllDepartments = async () => {
  return Department.find({ status: 'active' }).select('departmentName departmentCode').sort({ departmentName: 1 });
};

const getDepartmentById = async (id) => {
  const dept = await Department.findById(id);
  if (!dept) throw new ApiError('Department not found', 404);
  return dept;
};

const updateDepartment = async (id, data) => {
  const dept = await Department.findById(id);
  if (!dept) throw new ApiError('Department not found', 404);

  if (data.departmentCode && data.departmentCode !== dept.departmentCode) {
    const existing = await Department.findOne({ departmentCode: data.departmentCode.toUpperCase(), _id: { $ne: id } });
    if (existing) throw new ApiError('Department code already exists', 400);
  }

  return Department.findByIdAndUpdate(id, data, { new: true, runValidators: true });
};

const deleteDepartment = async (id) => {
  const dept = await Department.findById(id);
  if (!dept) throw new ApiError('Department not found', 404);

  const Employee = require('../models/Employee');
  const hasEmployees = await Employee.countDocuments({ department: id });
  if (hasEmployees > 0) throw new ApiError('Cannot delete department with existing employees', 400);

  await Department.findByIdAndDelete(id);
};

module.exports = { createDepartment, getDepartments, getAllDepartments, getDepartmentById, updateDepartment, deleteDepartment };
