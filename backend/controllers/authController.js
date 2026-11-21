const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Public registration is student-only; mentors and admins are provisioned separately.
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, rollNumber } = req.body;

    if (
      typeof name !== 'string' || !name.trim() ||
      typeof email !== 'string' || !email.trim() ||
      typeof password !== 'string' || !password ||
      typeof rollNumber !== 'string' || !rollNumber.trim()
    ) {
      return res.status(400).json({ message: 'Name, email, password, and roll number are required' });
    }

    if (role && role !== 'STUDENT') {
      return res.status(403).json({ message: 'Only student accounts can be registered here' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: 'STUDENT',
      rollNumber: rollNumber.trim()
    });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.rollNumber
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login User
exports.login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (typeof email !== 'string' || !email.trim() || typeof password !== 'string' || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (role && user.role !== role) {
      return res.status(400).json({ 
        message: `Account found, but it is registered as ${user.role}. Please select the correct role.` 
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        rollNumber: user.rollNumber
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Fetch List of Registered Mentors for Registration Dropdown
exports.getMentors = async (req, res) => {
  try {
    const mentors = await User.find({ role: 'MENTOR' }).select('name email');
    res.json(mentors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update User Profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, rollNumber } = req.body;
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ message: 'Name cannot be empty' });
    }
    if (rollNumber !== undefined && (typeof rollNumber !== 'string' || !rollNumber.trim())) {
      return res.status(400).json({ message: 'Roll number cannot be empty' });
    }

    const currentUser = await User.findById(req.user.id).select('role rollNumber');
    if (!currentUser) return res.status(404).json({ message: 'User not found' });
    if (currentUser.role === 'STUDENT' && !rollNumber?.trim() && !currentUser.rollNumber?.trim()) {
      return res.status(400).json({ message: 'Roll number is required' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (rollNumber !== undefined) updates.rollNumber = rollNumber.trim();
    const user = await User.findByIdAndUpdate(
      req.user.id, 
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete the authenticated account and its owned data.
exports.deleteAccount = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.role === 'ADMIN') {
      return res.status(403).json({ message: 'Admin accounts cannot be deleted here' });
    }

    if (user.role === 'STUDENT') {
      const projects = await Project.find({ $or: [{ leader: user._id }, { student: user._id }] }).select('_id');
      const projectIds = projects.map((project) => project._id);

      await User.updateMany(
        { activeProject: { $in: projectIds } },
        { $set: { activeProject: null } }
      );
      await Task.deleteMany({ project: { $in: projectIds } });
      await Notification.deleteMany({
        $or: [
          { recipient: user._id },
          { project: { $in: projectIds } }
        ]
      });
      await Project.deleteMany({ _id: { $in: projectIds } });
      await Project.updateMany(
        { 'members.student': user._id },
        { $pull: { members: { student: user._id } } }
      );
    } else if (user.role === 'MENTOR') {
      await User.updateMany(
        { assignedMentor: user._id },
        { $set: { assignedMentor: null } }
      );
      await Project.updateMany(
        { assignedMentor: user._id },
        { $set: { assignedMentor: null } }
      );
      await Project.updateMany(
        { preferredMentor: user._id },
        { $set: { preferredMentor: null } }
      );
    }

    await User.deleteOne({ _id: user._id });
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};