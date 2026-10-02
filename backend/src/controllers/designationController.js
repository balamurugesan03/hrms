const desService = require('../services/designationService');
const ApiResponse = require('../utils/ApiResponse');

const create = async (req, res, next) => {
  try {
    const des = await desService.createDesignation(req.body, req.user._id);
    ApiResponse.created(res, des, 'Designation created successfully');
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const { docs, pagination } = await desService.getDesignations(req.query);
    ApiResponse.paginated(res, docs, pagination);
  } catch (error) {
    next(error);
  }
};

const getDropdown = async (req, res, next) => {
  try {
    const designations = await desService.getAllDesignations(req.query.department);
    ApiResponse.success(res, designations);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const des = await desService.getDesignationById(req.params.id);
    ApiResponse.success(res, des);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const des = await desService.updateDesignation(req.params.id, req.body);
    ApiResponse.success(res, des, 'Designation updated successfully');
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await desService.deleteDesignation(req.params.id);
    ApiResponse.noContent(res, 'Designation deleted successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = { create, getAll, getDropdown, getById, update, remove };
