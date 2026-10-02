const empService = require('../services/employeeService');
const ApiResponse = require('../utils/ApiResponse');

const create = async (req, res, next) => {
  try {
    const photoPath = req.file ? req.file.path.replace(/\\/g, '/').split('uploads/')[1] : null;
    const employee = await empService.createEmployee(req.body, req.user._id, photoPath);
    ApiResponse.created(res, employee, 'Employee created successfully');
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const { docs, pagination } = await empService.getEmployees(req.query);
    ApiResponse.paginated(res, docs, pagination);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const employee = await empService.getEmployeeById(req.params.id);
    ApiResponse.success(res, employee);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const photoPath = req.file ? req.file.path.replace(/\\/g, '/').split('uploads/')[1] : null;
    const employee = await empService.updateEmployee(req.params.id, req.body, photoPath);
    ApiResponse.success(res, employee, 'Employee updated successfully');
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await empService.deleteEmployee(req.params.id);
    ApiResponse.noContent(res, 'Employee deleted successfully');
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const employee = await empService.getEmployeeProfile(req.user._id);
    ApiResponse.success(res, employee);
  } catch (error) {
    next(error);
  }
};

const exportExcel = async (req, res, next) => {
  try {
    const buffer = await empService.exportEmployees(req.query);
    res.setHeader('Content-Disposition', 'attachment; filename=employees.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};

const importExcel = async (req, res, next) => {
  try {
    if (!req.file) throw new Error('No file uploaded');
    const results = await empService.importEmployees(req.file.path, req.user._id);
    ApiResponse.success(res, results, `Import complete: ${results.success} success, ${results.failed} failed`);
  } catch (error) {
    next(error);
  }
};

module.exports = { create, getAll, getById, update, remove, getProfile, exportExcel, importExcel };
