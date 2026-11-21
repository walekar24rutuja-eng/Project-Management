const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  deadline: { type: Date, required: true },
  completed: { type: Boolean, default: false },
  studentFollowUp: { type: String, default: '' },
  project: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project', 
    required: true 
  }
}, { timestamps: true });

module.exports = mongoose.model('Task', taskSchema);