const Holiday = require('../models/Holiday');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

const create = async (req, res, next) => {
  try {
    const holiday = await Holiday.create(req.body);
    ApiResponse.created(res, holiday, 'Holiday created');
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const { year = new Date().getFullYear() } = req.query;
    const holidays = await Holiday.find({ year: parseInt(year) }).sort({ holidayDate: 1 });
    ApiResponse.success(res, holidays);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const holiday = await Holiday.findById(req.params.id);
    if (!holiday) throw new ApiError('Holiday not found', 404);
    ApiResponse.success(res, holiday);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const holiday = await Holiday.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!holiday) throw new ApiError('Holiday not found', 404);
    ApiResponse.success(res, holiday, 'Holiday updated');
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const holiday = await Holiday.findByIdAndDelete(req.params.id);
    if (!holiday) throw new ApiError('Holiday not found', 404);
    ApiResponse.noContent(res, 'Holiday deleted');
  } catch (error) {
    next(error);
  }
};

const getUpcoming = async (req, res, next) => {
  try {
    const today = new Date();
    const holidays = await Holiday.find({ holidayDate: { $gte: today } }).sort({ holidayDate: 1 }).limit(5);
    ApiResponse.success(res, holidays);
  } catch (error) {
    next(error);
  }
};

module.exports = { create, getAll, getById, update, remove, getUpcoming };
