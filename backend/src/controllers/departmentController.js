const deptService = require('../services/departmentService');
const ApiResponse = require('../utils/ApiResponse');

const create = async (req, res, next) => {
  try {
    const dept = await deptService.createDepartment(req.body, req.user._id);
    ApiResponse.created(res, dept, 'Department created successfully');
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const { docs, pagination } = await deptService.getDepartments(req.query);
    ApiResponse.paginated(res, docs, pagination);
  } catch (error) {
    next(error);
  }
};

const getDropdown = async (req, res, next) => {
  try {
    const departments = await deptService.getAllDepartments();
    ApiResponse.success(res, departments);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const dept = await deptService.getDepartmentById(req.params.id);
    ApiResponse.success(res, dept);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const dept = await deptService.updateDepartment(req.params.id, req.body);
    ApiResponse.success(res, dept, 'Department updated successfully');
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await deptService.deleteDepartment(req.params.id);
    ApiResponse.noContent(res, 'Department deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = { create, getAll, getDropdown, getById, update, remove };
