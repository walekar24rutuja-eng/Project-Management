const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED'], default: 'PENDING' },
  requestedAt: { type: Date, default: Date.now },
  decidedAt: { type: Date, default: null }
}, { _id: false });

const reportFileSchema = new mongoose.Schema({
  storageName: { type: String, required: true },
  storageProvider: { type: String, enum: ['local', 'r2'], default: 'local' },
  originalName: { type: String, required: true },
  contentType: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
}, { _id: false });

const projectSchema = new mongoose.Schema({
  projectId: { type: String, trim: true },
  topicName: { type: String, required: true },
  groupMembers: { type: String, default: '' },
  rollNumbers: { type: String, default: '' },
  reportFilePath: { type: String, default: '' },
  reportFile: { type: reportFileSchema, default: null },
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING', 'ASSIGNED', 'APPROVED', 'REJECTED'],
    default: 'DRAFT'
  },
  facultyFeedback: { type: String, default: '' },
  leader: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  members: { type: [memberSchema], default: [] },
  preferredMentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  assignedMentor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  submittedAt: { type: Date, default: null },
  reviewSchedules: [{
    title: { type: String, required: true },
    scheduledFor: { type: Date, required: true },
    notes: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
  }],
  student: {
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null
  }
}, { timestamps: true });

projectSchema.index({ projectId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Project', projectSchema);