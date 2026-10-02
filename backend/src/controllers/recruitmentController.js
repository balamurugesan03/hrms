const Job = require('../models/Job');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const { paginate } = require('../utils/pagination');

const create = async (req, res, next) => {
  try {
    const job = await Job.create({ ...req.body, createdBy: req.user._id });
    ApiResponse.created(res, job, 'Job posted successfully');
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, department } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (department) filter.department = department;

    const { docs, pagination } = await paginate(Job, filter, {
      page, limit, sort: { createdAt: -1 },
      populate: { path: 'department', select: 'departmentName' },
    });
    ApiResponse.paginated(res, docs, pagination);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).populate('department', 'departmentName');
    if (!job) throw new ApiError('Job not found', 404);
    ApiResponse.success(res, job);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!job) throw new ApiError('Job not found', 404);
    ApiResponse.success(res, job, 'Job updated');
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await Job.findByIdAndDelete(req.params.id);
    ApiResponse.noContent(res, 'Job deleted');
  } catch (error) {
    next(error);
  }
};

const addCandidate = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) throw new ApiError('Job not found', 404);

    const resumePath = req.file ? req.file.filename : null;
    job.candidates.push({ ...req.body, resume: resumePath });
    await job.save();

    ApiResponse.success(res, job, 'Candidate added');
  } catch (error) {
    next(error);
  }
};

const updateCandidateStage = async (req, res, next) => {
  try {
    const { candidateId, stage, notes, interviewDate } = req.body;
    const job = await Job.findById(req.params.id);
    if (!job) throw new ApiError('Job not found', 404);

    const candidate = job.candidates.id(candidateId);
    if (!candidate) throw new ApiError('Candidate not found', 404);

    candidate.stage = stage;
    if (notes) candidate.notes = notes;
    if (interviewDate) candidate.interviewDate = interviewDate;
    await job.save();

    ApiResponse.success(res, job, 'Candidate stage updated');
  } catch (error) {
    next(error);
  }
};

module.exports = { create, getAll, getById, update, remove, addCandidate, updateCandidateStage };
