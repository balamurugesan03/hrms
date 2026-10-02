const Employee = require('../models/Employee');

const generateEmployeeId = async () => {
  const prefix = 'EMP';
  const lastEmployee = await Employee.findOne({}, { employeeId: 1 }).sort({ createdAt: -1 });

  if (!lastEmployee || !lastEmployee.employeeId) {
    return `${prefix}001`;
  }

  const lastNum = parseInt(lastEmployee.employeeId.replace(prefix, ''), 10);
  const nextNum = lastNum + 1;
  return `${prefix}${String(nextNum).padStart(3, '0')}`;
};

module.exports = { generateEmployeeId };
