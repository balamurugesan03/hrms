const mongoose = require('mongoose');
const { approvalsSchema } = require('./approvalSchema');

// Short leave of a few hours within a working day.
// Each employee gets a monthly permission quota (default 2 hours). A request that does not
// fit in the remaining quota is recorded as type 'half_day' and is treated as a half-day
// Loss of Pay in payroll once approved.
const permissionSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    date: { type: Date, required: true },
    fromTime: { type: String, required: true }, // HH:mm
    toTime: { type: String, required: true }, // HH:mm
    minutes: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true, trim: true },
    type: { type: String, enum: ['permission', 'half_day'], default: 'permission' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    approvals: { type: approvalsSchema, default: () => ({}) },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

permissionSchema.index({ employee: 1, date: 1 });
permissionSchema.index({ status: 1 });

module.exports = mongoose.model('Permission', permissionSchema);
