const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: '../../.env' });

const User = require('../models/User');
const Department = require('../models/Department');
const Designation = require('../models/Designation');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms');
  console.log('MongoDB connected for seeding');
};

const seed = async () => {
  await connectDB();

  // Clear existing data
  await User.deleteMany({});
  await Department.deleteMany({});
  await Designation.deleteMany({});

  // Create departments
  const hrDept = await Department.create({
    departmentCode: 'HR001',
    departmentName: 'Human Resources',
    description: 'HR Department',
    status: 'active',
  });

  const itDept = await Department.create({
    departmentCode: 'IT001',
    departmentName: 'Information Technology',
    description: 'IT Department',
    status: 'active',
  });

  const financeDept = await Department.create({
    departmentCode: 'FIN001',
    departmentName: 'Finance',
    description: 'Finance Department',
    status: 'active',
  });

  // Create designations
  const hrManagerDes = await Designation.create({
    designationCode: 'HRM001',
    designationName: 'HR Manager',
    department: hrDept._id,
    description: 'Manages HR operations',
    status: 'active',
  });

  const softwareEngDes = await Designation.create({
    designationCode: 'SE001',
    designationName: 'Software Engineer',
    department: itDept._id,
    description: 'Develops software solutions',
    status: 'active',
  });

  // Create Super Admin
  const superAdmin = await User.create({
    name: 'Super Admin',
    email: 'admin@hrms.com',
    password: 'Admin@123',
    role: 'super_admin',
    status: 'active',
  });

  // Create HR Manager
  const hrManager = await User.create({
    name: 'HR Manager',
    email: 'hr@hrms.com',
    password: 'Hr@123456',
    role: 'hr_manager',
    status: 'active',
  });

  // Create Employee User
  const employee = await User.create({
    name: 'John Doe',
    email: 'john@hrms.com',
    password: 'Employee@123',
    role: 'employee',
    status: 'active',
  });

  console.log('✅ Seed data created:');
  console.log('   Super Admin: admin@hrms.com / Admin@123');
  console.log('   HR Manager:  hr@hrms.com / Hr@123456');
  console.log('   Employee:    john@hrms.com / Employee@123');
  console.log('   Departments:', hrDept.departmentName, '|', itDept.departmentName, '|', financeDept.departmentName);

  process.exit(0);
};

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
