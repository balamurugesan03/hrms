const Designation = require('../models/Designation');
const ApiError = require('../utils/ApiError');
const { paginate, buildSearchQuery } = require('../utils/pagination');

const createDesignation = async (data, userId) => {
  const existing = await Designation.findOne({
    $or: [{ designationCode: data.designationCode.toUpperCase() }, { designationName: data.designationName }],
  });
  if (existing) throw new ApiError('Designation code or name already exists', 400);

  return Designation.create({ ...data, createdBy: userId });
};

const getDesignations = async (query) => {
  const { page = 1, limit = 10, search, status, department } = query;
  const filter = {};
  if (status) filter.status = status;
  if (department) filter.department = department;
  if (search) {
    Object.assign(filter, buildSearchQuery(['designationName', 'designationCode'], search));
  }
  return paginate(Designation, filter, {
    page,
    limit,
    sort: { designationName: 1 },
    populate: { path: 'department', select: 'departmentName departmentCode' },
  });
};

const getAllDesignations = async (departmentId) => {
  const filter = { status: 'active' };
  if (departmentId) filter.department = departmentId;
  return Designation.find(filter)
    .select('designationName designationCode department')
    .populate('department', 'departmentName')
    .sort({ designationName: 1 });
};

const getDesignationById = async (id) => {
  const des = await Designation.findById(id).populate('department', 'departmentName departmentCode');
  if (!des) throw new ApiError('Designation not found', 404);
  return des;
};

const updateDesignation = async (id, data) => {
  const des = await Designation.findById(id);
  if (!des) throw new ApiError('Designation not found', 404);
  return Designation.findByIdAndUpdate(id, data, { new: true, runValidators: true }).populate('department', 'departmentName');
};

const deleteDesignation = async (id) => {
  const des = await Designation.findById(id);
  if (!des) throw new ApiError('Designation not found', 404);

  const Employee = require('../models/Employee');
  const hasEmployees = await Employee.countDocuments({ designation: id });
  if (hasEmployees > 0) throw new ApiError('Cannot delete designation with existing employees', 400);

  await Designation.findByIdAndDelete(id);
};

module.exports = { createDesignation, getDesignations, getAllDesignations, getDesignationById, updateDesignation, deleteDesignation };
