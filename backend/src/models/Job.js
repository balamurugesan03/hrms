const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  mobile: String,
  resume: String,
  applicationDate: { type: Date, default: Date.now },
  stage: {
    type: String,
    enum: ['applied', 'screening', 'interview', 'offer', 'hired', 'rejected'],
    default: 'applied',
  },
  interviewDate: Date,
  notes: String,
}, { timestamps: true });

const jobSchema = new mongoose.Schema(
  {
    jobTitle: { type: String, required: true, trim: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    openings: { type: Number, required: true, min: 1 },
    experienceMin: { type: Number, default: 0 },
    experienceMax: { type: Number },
    salaryMin: { type: Number },
    salaryMax: { type: Number },
    jobType: { type: String, enum: ['full_time', 'part_time', 'contract', 'intern'], default: 'full_time' },
    location: { type: String },
    description: { type: String, required: true },
    requirements: { type: String },
    status: { type: String, enum: ['open', 'closed', 'on_hold'], default: 'open' },
    closingDate: { type: Date },
    candidates: [candidateSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Job', jobSchema);
