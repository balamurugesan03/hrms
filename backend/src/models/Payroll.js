const mongoose = require('mongoose');

const allowanceSchema = new mongoose.Schema({
  name: String,
  amount: { type: Number, default: 0 },
}, { _id: false });

const deductionSchema = new mongoose.Schema({
  name: String,
  amount: { type: Number, default: 0 },
}, { _id: false });

const payrollSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    year: { type: Number, required: true },
    basicSalary: { type: Number, required: true, min: 0 },
    allowances: [allowanceSchema],
    deductions: [deductionSchema],
    totalAllowances: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },
    overtimePay: { type: Number, default: 0 },
    grossSalary: { type: Number, default: 0 },
    netSalary: { type: Number, default: 0 },
    workingDays: { type: Number },
    presentDays: { type: Number },
    absentDays: { type: Number },
    leaveDays: { type: Number },
    // Attendance / leave breakdown used for the Loss of Pay calculation
    weeklyOffs: { type: Number, default: 0 },
    holidays: { type: Number, default: 0 },
    lateDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    paidLeaveDays: { type: Number, default: 0 },
    unpaidLeaveDays: { type: Number, default: 0 },
    permissionMinutes: { type: Number, default: 0 },
    permissionHalfDays: { type: Number, default: 0 },
    lopDays: { type: Number, default: 0 },
    payableDays: { type: Number },
    // Payroll period (default 26th of previous month → 25th)
    periodStart: { type: Date },
    periodEnd: { type: Date },
    daysInPeriod: { type: Number },
    // Statutory: ESI is in deductions; Bonus / EL / Gratuity are employer contributions (not in net)
    basicDA: { type: Number, default: 0 },
    esi: { type: Number, default: 0 },
    esiRule: { type: String, enum: ['new', 'old'] },
    contributions: [allowanceSchema],
    perDaySalary: { type: Number, default: 0 },
    lopDeduction: { type: Number, default: 0 },
    overtimeHours: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'processed', 'paid'], default: 'draft' },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    processedAt: { type: Date },
    paidAt: { type: Date },
    paymentMode: { type: String, enum: ['bank_transfer', 'cash', 'cheque'] },
    remarks: { type: String },
  },
  { timestamps: true }
);

payrollSchema.index({ employee: 1, month: 1, year: 1 }, { unique: true });
payrollSchema.index({ month: 1, year: 1 });
payrollSchema.index({ status: 1 });

module.exports = mongoose.model('Payroll', payrollSchema);
