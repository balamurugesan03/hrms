const mongoose = require('mongoose');

const kpiSchema = new mongoose.Schema({
  kpiName: String,
  target: Number,
  achieved: Number,
  rating: { type: Number, min: 1, max: 5 },
}, { _id: false });

const performanceSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewPeriod: { type: String, required: true }, // e.g., "Q1 2024", "Annual 2024"
    reviewDate: { type: Date, required: true },
    kpis: [kpiSchema],
    overallRating: { type: Number, min: 1, max: 5, required: true },
    strengths: { type: String },
    improvements: { type: String },
    comments: { type: String },
    employeeComments: { type: String },
    status: { type: String, enum: ['draft', 'submitted', 'acknowledged'], default: 'draft' },
    acknowledgedAt: { type: Date },
  },
  { timestamps: true }
);

performanceSchema.index({ employee: 1, reviewDate: -1 });

module.exports = mongoose.model('Performance', performanceSchema);
