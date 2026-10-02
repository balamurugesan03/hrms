const Employee = require('../models/Employee');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const fs = require('fs');
const path = require('path');

const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) throw new ApiError('No file uploaded', 400);
    const { employeeId, documentType, documentName } = req.body;

    const employee = await Employee.findById(employeeId);
    if (!employee) throw new ApiError('Employee not found', 404);

    employee.documents.push({
      documentType,
      documentName: documentName || req.file.originalname,
      filePath: req.file.filename,
    });
    await employee.save();

    ApiResponse.success(res, employee.documents, 'Document uploaded');
  } catch (error) {
    next(error);
  }
};

const getDocuments = async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.employeeId).select('documents');
    if (!employee) throw new ApiError('Employee not found', 404);
    ApiResponse.success(res, employee.documents);
  } catch (error) {
    next(error);
  }
};

const deleteDocument = async (req, res, next) => {
  try {
    const { employeeId, documentId } = req.params;
    const employee = await Employee.findById(employeeId);
    if (!employee) throw new ApiError('Employee not found', 404);

    const doc = employee.documents.id(documentId);
    if (!doc) throw new ApiError('Document not found', 404);

    // Delete physical file
    const filePath = path.join(__dirname, '../../uploads/documents', doc.filePath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    employee.documents.pull(documentId);
    await employee.save();

    ApiResponse.noContent(res, 'Document deleted');
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadDocument, getDocuments, deleteDocument };
