const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema(
  {
    assetCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    assetName: { type: String, required: true, trim: true },
    assetType: {
      type: String,
      enum: ['laptop', 'desktop', 'mobile', 'tablet', 'vehicle', 'furniture', 'equipment', 'other'],
      required: true,
    },
    brand: { type: String },
    model: { type: String },
    serialNumber: { type: String },
    purchaseDate: { type: Date },
    purchasePrice: { type: Number },
    assignedEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    assignedDate: { type: Date },
    returnDate: { type: Date },
    condition: { type: String, enum: ['new', 'good', 'fair', 'poor'], default: 'good' },
    status: { type: String, enum: ['available', 'assigned', 'under_maintenance', 'retired'], default: 'available' },
    description: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

assetSchema.index({ assetCode: 1 });
assetSchema.index({ status: 1 });
assetSchema.index({ assignedEmployee: 1 });

module.exports = mongoose.model('Asset', assetSchema);
