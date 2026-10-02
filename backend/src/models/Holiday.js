const mongoose = require('mongoose');

const holidaySchema = new mongoose.Schema(
  {
    holidayName: { type: String, required: true, trim: true },
    holidayDate: { type: Date, required: true, unique: true },
    description: { type: String, trim: true },
    holidayType: { type: String, enum: ['national', 'regional', 'optional'], default: 'national' },
    year: { type: Number },
  },
  { timestamps: true }
);

holidaySchema.pre('save', function (next) {
  this.year = new Date(this.holidayDate).getFullYear();
  next();
});

holidaySchema.index({ holidayDate: 1 });
holidaySchema.index({ year: 1 });

module.exports = mongoose.model('Holiday', holidaySchema);
