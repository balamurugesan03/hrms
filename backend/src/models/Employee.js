const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  street: String,
  city: String,
  state: String,
  country: { type: String, default: 'India' },
  pincode: String,
}, { _id: false });

const documentSchema = new mongoose.Schema({
  documentType: { type: String, enum: ['aadhaar', 'pan', 'passport', 'certificate', 'offer_letter', 'other'] },
  documentName: String,
  filePath: String,
  uploadedAt: { type: Date, default: Date.now },
}, { _id: true });

const employeeSchema = new mongoose.Schema(
  {
    employeeId: { type: String, unique: true, trim: true },
    firstName: { type: String, required: true, trim: true, maxlength: 50 },
    lastName: { type: String, required: true, trim: true, maxlength: 50 },
    fullName: { type: String },
    gender: { type: String, enum: ['male', 'female', 'other'], required: true },
    dob: { type: Date },
    mobile: { type: String, trim: true },
    alternativeMobile: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    address: addressSchema,
    bloodGroup: { type: String, enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] },
    maritalStatus: { type: String, enum: ['single', 'married', 'divorced', 'widowed'] },
    joiningDate: { type: Date, required: true },
    confirmationDate: { type: Date },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    designation: { type: mongoose.Schema.Types.ObjectId, ref: 'Designation', required: true },
    reportingManager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    shift: { type: mongoose.Schema.Types.ObjectId, ref: 'Shift' },
    employmentType: {
      type: String,
      enum: ['full_time', 'part_time', 'contract', 'intern'],
      default: 'full_time',
    },
    salary: { type: Number, min: 0 },
    bankName: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String },
    panNumber: { type: String },
    aadhaarNumber: { type: String },
    photo: { type: String },
    documents: [documentSchema],
    status: { type: String, enum: ['active', 'inactive', 'terminated', 'on_leave'], default: 'active' },
    exitDate: { type: Date },
    exitReason: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

employeeSchema.pre('save', function (next) {
  this.fullName = `${this.firstName} ${this.lastName}`;
  next();
});

employeeSchema.index({ employeeId: 1 });
employeeSchema.index({ email: 1 });
employeeSchema.index({ department: 1 });
employeeSchema.index({ designation: 1 });
employeeSchema.index({ status: 1 });
employeeSchema.index({ firstName: 'text', lastName: 'text', email: 'text', employeeId: 'text' });

module.exports = mongoose.model('Employee', employeeSchema);
