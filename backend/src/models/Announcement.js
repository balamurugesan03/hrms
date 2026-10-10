const mongoose = require('mongoose');

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, trim: true },
    priority: { type: String, enum: ['normal', 'important', 'urgent'], default: 'normal' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' }, // empty = everyone
    pinned: { type: Boolean, default: false },
    expiresAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

announcementSchema.index({ pinned: -1, createdAt: -1 });

module.exports = mongoose.model('Announcement', announcementSchema);
