const LeaveType = require('../models/LeaveType');

// Leave types every install must have; existing records are never overwritten
const DEFAULT_LEAVE_TYPES = [
  { leaveTypeName: 'Casual Leave', leaveCode: 'CL', totalDays: 12, description: 'For personal matters' },
  { leaveTypeName: 'Medical Leave', leaveCode: 'MDL', totalDays: 12, description: 'For illness or medical treatment' },
  {
    leaveTypeName: 'Loss of Pay', leaveCode: 'LOP', totalDays: 0, isPaid: false,
    description: 'Unpaid leave — deducted from salary',
  },
];

// Idempotent setup for data the leave/payroll rules depend on (safe to run on every start)
const ensureDefaults = async () => {
  for (const lt of DEFAULT_LEAVE_TYPES) {
    try {
      await LeaveType.updateOne({ leaveCode: lt.leaveCode }, { $setOnInsert: lt }, { upsert: true });
    } catch (err) {
      console.error(`ensureDefaults error (${lt.leaveCode}):`, err.message);
    }
  }
  // Retired leave type: hidden from new requests, kept so past leave records still resolve
  try {
    await LeaveType.updateOne({ leaveCode: 'LWW' }, { $set: { status: 'inactive' } });
  } catch (err) {
    console.error('ensureDefaults error (LWW):', err.message);
  }
};

module.exports = ensureDefaults;
