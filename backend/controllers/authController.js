const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const DEPARTMENTS = require('../utils/departments');
const { deleteStudentAccount, deleteMentorAccount } = require('../utils/accountDeletion');

// Public registration is student-only; mentors and admins are provisioned separately.
exports.register = async (req, res) => {
  try {
    const { name, email, password, role, rollNumber, department } = req.body;

    if (
      typeof name !== 'string' || !name.trim() ||
      typeof email !== 'string' || !email.trim() ||
      typeof password !== 'string' || !password ||
      typeof rollNumber !== 'string' || !rollNumber.trim() ||
      typeof department !== 'string' || !DEPARTMENTS.includes(department)
    ) {
      return res.status(400).json({ message: 'Name, email, password, roll number, and a valid department are required' });
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
      rollNumber: rollNumber.trim(),
      department
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
        rollNumber: user.rollNumber,
        department: user.department
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
        rollNumber: user.rollNumber,
        department: user.department
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Fetch List of Registered Mentors for Registration Dropdown
// Students only see mentors from their own department.
exports.getMentors = async (req, res) => {
  try {
    const filter = { role: 'MENTOR' };
    if (req.user) {
      const currentUser = await User.findById(req.user.id).select('role department');
      if (currentUser?.role === 'STUDENT' && currentUser.department) {
        filter.department = currentUser.department;
      }
    }
    const mentors = await User.find(filter).select('name email department');
    res.json(mentors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update User Profile
exports.updateProfile = async (req, res) => {
  try {
    const { name, rollNumber, department } = req.body;
    if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
      return res.status(400).json({ message: 'Name cannot be empty' });
    }
    if (rollNumber !== undefined && (typeof rollNumber !== 'string' || !rollNumber.trim())) {
      return res.status(400).json({ message: 'Roll number cannot be empty' });
    }
    if (department !== undefined && !DEPARTMENTS.includes(department)) {
      return res.status(400).json({ message: 'Select a valid department' });
    }

    const currentUser = await User.findById(req.user.id).select('role rollNumber department');
    if (!currentUser) return res.status(404).json({ message: 'User not found' });
    if (currentUser.role === 'STUDENT' && !rollNumber?.trim() && !currentUser.rollNumber?.trim()) {
      return res.status(400).json({ message: 'Roll number is required' });
    }
    if (
      (currentUser.role === 'STUDENT' || currentUser.role === 'MENTOR') &&
      !department && !currentUser.department
    ) {
      return res.status(400).json({ message: 'Department is required' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (rollNumber !== undefined) updates.rollNumber = rollNumber.trim();
    if (department !== undefined) updates.department = department;
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
      await deleteStudentAccount(user);
    } else if (user.role === 'MENTOR') {
      await deleteMentorAccount(user);
    }

    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};