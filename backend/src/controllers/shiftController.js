const Shift = require('../models/Shift');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

const create = async (req, res, next) => {
  try {
    const shift = await Shift.create(req.body);
    ApiResponse.created(res, shift, 'Shift created');
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const shifts = await Shift.find().sort({ shiftName: 1 });
    ApiResponse.success(res, shifts);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const shift = await Shift.findById(req.params.id);
    if (!shift) throw new ApiError('Shift not found', 404);
    ApiResponse.success(res, shift);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const shift = await Shift.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!shift) throw new ApiError('Shift not found', 404);
    ApiResponse.success(res, shift, 'Shift updated');
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const shift = await Shift.findByIdAndDelete(req.params.id);
    if (!shift) throw new ApiError('Shift not found', 404);
    ApiResponse.noContent(res, 'Shift deleted');
  } catch (error) {
    next(error);
  }
};

const assignShift = async (req, res, next) => {
  try {
    const Employee = require('../models/Employee');
    const { employeeId, shiftId } = req.body;
    const employee = await Employee.findByIdAndUpdate(employeeId, { shift: shiftId }, { new: true });
    if (!employee) throw new ApiError('Employee not found', 404);
    ApiResponse.success(res, employee, 'Shift assigned');
  } catch (error) {
    next(error);
  }
};

module.exports = { create, getAll, getById, update, remove, assignShift };
