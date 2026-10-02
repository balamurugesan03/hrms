const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    departmentCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    departmentName: { type: String, required: true, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

departmentSchema.index({ departmentName: 'text', departmentCode: 'text' });

module.exports = mongoose.model('Department', departmentSchema);
