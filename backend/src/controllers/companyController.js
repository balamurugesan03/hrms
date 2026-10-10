const fs = require('fs');
const path = require('path');
const Company = require('../models/Company');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

const FIELDS = ['companyName', 'legalName', 'tagline', 'email', 'phone', 'website', 'gstNumber', 'panNumber', 'tanNumber'];
const photoPath = (file) => path.join(__dirname, '../../uploads/photos', file);

// Company details; falls back to COMPANY_NAME from .env until the Super Admin saves them
const getCompanyDetails = async () => {
  const company = await Company.findOne().lean();
  return company || { companyName: process.env.COMPANY_NAME || 'HRMS', address: {} };
};

const getCompany = async (req, res, next) => {
  try {
    ApiResponse.success(res, await getCompanyDetails());
  } catch (error) {
    next(error);
  }
};

// Super Admin only. Multipart: text fields, `address` as JSON, optional `logo` file, `removeLogo=true`
const updateCompany = async (req, res, next) => {
  const uploaded = req.file?.filename;
  try {
    const body = req.body || {};
    const update = {};
    FIELDS.forEach((f) => { if (body[f] !== undefined) update[f] = String(body[f]).trim(); });
    if (update.companyName === '') throw new ApiError('Company name is required', 400);
    if (body.address !== undefined) {
      try {
        update.address = typeof body.address === 'string' ? JSON.parse(body.address) : body.address;
      } catch { throw new ApiError('Invalid address', 400); }
    }

    let company = await Company.findOne();
    if (!company) {
      if (!update.companyName) throw new ApiError('Company name is required', 400);
      company = new Company();
    }
    const oldLogo = company.logo;
    Object.assign(company, update, { updatedBy: req.user._id });
    if (uploaded) company.logo = uploaded;
    else if (body.removeLogo === 'true' || body.removeLogo === true) company.logo = undefined;
    await company.save();

    // Remove the replaced / removed logo file
    if (oldLogo && oldLogo !== company.logo) fs.unlink(photoPath(oldLogo), () => {});

    ApiResponse.success(res, company, 'Company details updated');
  } catch (error) {
    if (uploaded) fs.unlink(photoPath(uploaded), () => {});
    next(error);
  }
};

module.exports = { getCompany, updateCompany, getCompanyDetails };
