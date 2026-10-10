const mongoose = require('mongoose');

// One approver's decision. 'not_required' is used when there is no one to fill the slot
// (e.g. the applicant is the only HR manager), so the request never gets stuck.
const approvalStepSchema = new mongoose.Schema({
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'not_required'], default: 'pending' },
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  at: { type: Date },
  remarks: { type: String, trim: true },
}, { _id: false });

// A named approver (one of the employee's reporting managers / late approvers)
const approverStepSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  at: { type: Date },
  remarks: { type: String, trim: true },
}, { _id: false });

// Two shapes:
//  - steps: every listed approver must approve (used when the employee has reporting managers)
//  - hr + admin: legacy dual approval, used when the employee has no approvers set
const approvalsSchema = new mongoose.Schema({
  steps: { type: [approverStepSchema], default: undefined },
  hr: { type: approvalStepSchema, default: () => ({}) },
  admin: { type: approvalStepSchema, default: () => ({}) },
}, { _id: false });

module.exports = { approvalsSchema };
