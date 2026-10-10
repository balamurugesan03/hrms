const mongoose = require('mongoose');

// Single document holding the organisation's details (shown in the app and on payslips)
const companySchema = new mongoose.Schema(
  {
    companyName: { type: String, required: true, trim: true, maxlength: 150 },
    legalName: { type: String, trim: true, maxlength: 200 },
    tagline: { type: String, trim: true, maxlength: 150 },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    website: { type: String, trim: true },
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      country: { type: String, trim: true, default: 'India' },
      pincode: { type: String, trim: true },
    },
    gstNumber: { type: String, trim: true, uppercase: true },
    panNumber: { type: String, trim: true, uppercase: true },
    tanNumber: { type: String, trim: true, uppercase: true },
    logo: { type: String }, // file name in uploads/photos
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Company', companySchema);
