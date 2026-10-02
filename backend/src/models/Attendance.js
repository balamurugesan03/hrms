const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    checkIn: { type: String }, // HH:mm
    checkOut: { type: String }, // HH:mm
    workingHours: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    attendanceStatus: {
      type: String,
      enum: ['present', 'absent', 'half_day', 'late', 'on_leave', 'holiday', 'weekend'],
      default: 'absent',
    },
    notes: { type: String },
    shift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
    markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });
attendanceSchema.index({ attendanceStatus: 1 });

module.exports = mongoose.model('Attendance', attendanceSchema);
