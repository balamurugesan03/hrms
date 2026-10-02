const mongoose = require('mongoose');

const leaveTypeSchema = new mongoose.Schema(
  {
    leaveTypeName: { type: String, required: true, unique: true, trim: true },
    leaveCode: { type: String, required: true, unique: true, uppercase: true },
    totalDays: { type: Number, required: true, min: 0 },
    description: { type: String },
    isCarryForward: { type: Boolean, default: false },
    gender: { type: String, enum: ['all', 'male', 'female'], default: 'all' },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LeaveType', leaveTypeSchema);
