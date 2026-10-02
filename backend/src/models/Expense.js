const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    expenseType: {
      type: String,
      enum: ['travel', 'food', 'accommodation', 'communication', 'training', 'medical', 'other'],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, required: true, trim: true },
    expenseDate: { type: Date, required: true },
    attachment: { type: String },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

expenseSchema.index({ employee: 1, status: 1 });
expenseSchema.index({ expenseDate: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
