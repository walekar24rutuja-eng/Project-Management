const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  reviewSchedule: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  scheduledFor: { type: Date, required: true },
  read: { type: Boolean, default: false }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, scheduledFor: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
