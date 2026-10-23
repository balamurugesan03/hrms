const LeaveType = require('../models/LeaveType');
const Leave = require('../models/Leave');

// Leave types every install must have; existing records are never overwritten
const DEFAULT_LEAVE_TYPES = [
  { leaveTypeName: 'Casual Leave', leaveCode: 'CL', totalDays: 12, description: 'For personal matters' },
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
  // Removed leave type: deleted outright unless past leave records still point to it
  try {
    const mdl = await LeaveType.findOne({ leaveCode: 'MDL' }).select('_id').lean();
    if (mdl) {
      const inUse = await Leave.exists({ leaveType: mdl._id });
      if (inUse) await LeaveType.updateOne({ _id: mdl._id }, { $set: { status: 'inactive' } });
      else await LeaveType.deleteOne({ _id: mdl._id });
    }
  } catch (err) {
    console.error('ensureDefaults error (MDL):', err.message);
  }
};

module.exports = ensureDefaults;
