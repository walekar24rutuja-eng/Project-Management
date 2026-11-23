const mongoose = require('mongoose');
const DEPARTMENTS = require('../utils/departments');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['STUDENT', 'MENTOR', 'ADMIN'], default: 'STUDENT' },
  rollNumber: {
    type: String,
    trim: true,
    required: function requiredStudentRollNumber() {
      return this.role === 'STUDENT';
    }
  },
  department: {
    type: String,
    enum: DEPARTMENTS,
    required: function requiredDepartment() {
      return this.role === 'STUDENT' || this.role === 'MENTOR';
    }
  },
  assignedMentor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    default: null 
  },
  activeProject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);