const mongoose = require('mongoose');

const shiftSchema = new mongoose.Schema(
  {
    shiftName: { type: String, required: true, unique: true, trim: true },
    startTime: { type: String, required: true }, // HH:mm
    endTime: { type: String, required: true }, // HH:mm
    graceTime: { type: Number, default: 15 }, // minutes
    workingHours: { type: Number },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    description: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Shift', shiftSchema);
