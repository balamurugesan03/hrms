const LeaveType = require('../models/LeaveType');

// Idempotent setup for data the leave/payroll rules depend on (safe to run on every start)
const ensureDefaults = async () => {
  try {
    await LeaveType.updateOne(
      { leaveCode: 'LOP' },
      {
        $setOnInsert: {
          leaveTypeName: 'Loss of Pay', leaveCode: 'LOP', totalDays: 0, isPaid: false,
          description: 'Unpaid leave — deducted from salary',
        },
      },
      { upsert: true }
    );
  } catch (err) {
    console.error('ensureDefaults error:', err.message);
  }
};

module.exports = ensureDefaults;
