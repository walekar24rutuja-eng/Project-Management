const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const Project = require('../models/Project');
const User = require('../models/User');
const { getMentorAssignmentStatus } = require('../utils/projectAccess');
const { createProjectNotifications, getProjectStudentIds } = require('../services/projectNotificationService');

exports.getOverview = async (req, res) => {
  try {
    const [students, mentors, projects] = await Promise.all([
      User.find({ role: 'STUDENT' }).select('name email rollNumber createdAt').sort({ name: 1 }),
      User.find({ role: 'MENTOR' }).select('name email createdAt').sort({ name: 1 }),
      Project.find({})
        .select('-progress')
        .populate('leader', 'name email rollNumber')
        .populate('members.student', 'name email rollNumber')
        .populate('preferredMentor', 'name email')
        .populate('assignedMentor', 'name email')
        .sort({ createdAt: -1 })
    ]);

    res.json({
      students,
      mentors,
      projects,
      unassignedProjects: projects.filter((project) => !project.assignedMentor)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createMentor = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (
      typeof name !== 'string' || !name.trim() ||
      typeof email !== 'string' || !email.trim() ||
      typeof password !== 'string' || !password
    ) {
      return res.status(400).json({ message: 'Name, email, and temporary password are required' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Temporary password must be at least 8 characters' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail }).select('_id');
    if (existing) {
      return res.status(409).json({ message: 'An account already exists for this email' });
    }

    const mentor = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      role: 'MENTOR'
    });
    res.status(201).json({
      id: mentor._id,
      name: mentor.name,
      email: mentor.email,
      role: mentor.role
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'An account already exists for this email' });
    }
    res.status(500).json({ message: error.message });
  }
};

exports.assignMentor = async (req, res) => {
  try {
    const { mentorId } = req.body;
    const project = await Project.findOne({ projectId: req.params.projectId });
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const previousMentorId = project.assignedMentor?.toString();
    if (mentorId) {
      if (!mongoose.isValidObjectId(mentorId)) {
        return res.status(400).json({ message: 'Select a valid mentor account' });
      }
      const mentor = await User.findOne({ _id: mentorId, role: 'MENTOR' }).select('_id');
      if (!mentor) return res.status(400).json({ message: 'Select a valid mentor account' });
      project.assignedMentor = mentor._id;
    } else {
      project.assignedMentor = null;
    }
    project.status = getMentorAssignmentStatus(project, project.assignedMentor);

    await project.save();
    if (
      project.assignedMentor &&
      project.assignedMentor.toString() !== previousMentorId
    ) {
      await createProjectNotifications({
        project,
        recipients: [project.assignedMentor, ...getProjectStudentIds(project)],
        actor: req.user.id,
        type: 'PROJECT_ASSIGNED',
        title: 'Mentor assigned to project',
        message: `A mentor has been assigned to "${project.topicName}".`
      });
    }
    await project.populate([
      { path: 'leader', select: 'name email rollNumber' },
      { path: 'assignedMentor', select: 'name email' }
    ]);
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
