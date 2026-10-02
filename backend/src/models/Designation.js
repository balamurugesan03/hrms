const mongoose = require('mongoose');

const designationSchema = new mongoose.Schema(
  {
    designationCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    designationName: { type: String, required: true, trim: true, maxlength: 100 },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    description: { type: String, trim: true, maxlength: 500 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

designationSchema.index({ designationName: 'text', designationCode: 'text' });

module.exports = mongoose.model('Designation', designationSchema);
