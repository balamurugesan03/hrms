const Asset = require('../models/Asset');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/pagination');

const create = async (req, res, next) => {
  try {
    const asset = await Asset.create({ ...req.body, createdBy: req.user._id });
    ApiResponse.created(res, asset, 'Asset created');
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, assetType } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (assetType) filter.assetType = assetType;

    const { docs, pagination } = await paginate(Asset, filter, {
      page, limit, sort: { createdAt: -1 },
      populate: { path: 'assignedEmployee', select: 'firstName lastName employeeId' },
    });
    ApiResponse.paginated(res, docs, pagination);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const asset = await Asset.findById(req.params.id).populate('assignedEmployee', 'firstName lastName employeeId');
    if (!asset) throw new ApiError('Asset not found', 404);
    ApiResponse.success(res, asset);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const asset = await Asset.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!asset) throw new ApiError('Asset not found', 404);
    ApiResponse.success(res, asset, 'Asset updated');
  } catch (error) {
    next(error);
  }
};

const assign = async (req, res, next) => {
  try {
    const { employeeId, assignedDate } = req.body;
    const asset = await Asset.findByIdAndUpdate(
      req.params.id,
      { assignedEmployee: employeeId, assignedDate: assignedDate || new Date(), status: 'assigned' },
      { new: true }
    ).populate('assignedEmployee', 'firstName lastName employeeId');
    if (!asset) throw new ApiError('Asset not found', 404);
    ApiResponse.success(res, asset, 'Asset assigned');
  } catch (error) {
    next(error);
  }
};

const returnAsset = async (req, res, next) => {
  try {
    const asset = await Asset.findByIdAndUpdate(
      req.params.id,
      { assignedEmployee: null, returnDate: new Date(), status: 'available' },
      { new: true }
    );
    if (!asset) throw new ApiError('Asset not found', 404);
    ApiResponse.success(res, asset, 'Asset returned');
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await Asset.findByIdAndDelete(req.params.id);
    ApiResponse.noContent(res, 'Asset deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = { create, getAll, getById, update, assign, returnAsset, remove };
