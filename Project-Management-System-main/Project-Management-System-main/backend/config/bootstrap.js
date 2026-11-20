const bcrypt = require('bcryptjs');
const Project = require('../models/Project');
const User = require('../models/User');
const createProjectId = require('../utils/projectId');

const migrateLegacyProjects = async () => {
  const projects = await Project.collection.find({}).toArray();

  for (const project of projects) {
    const updates = {};
    const leaderId = project.leader || project.student;

    if (!project.projectId) {
      let projectId = createProjectId();
      while (await Project.exists({ projectId })) {
        projectId = createProjectId();
      }
      updates.projectId = projectId;
    }

    if (leaderId && !project.leader) updates.leader = leaderId;
    if (leaderId && !project.student) updates.student = leaderId;
    if (!Array.isArray(project.members)) updates.members = [];

    let assignedMentor = project.assignedMentor;
    if (!assignedMentor && leaderId) {
      const leader = await User.findById(leaderId).select('assignedMentor');
      if (leader?.assignedMentor) {
        assignedMentor = leader.assignedMentor;
        updates.assignedMentor = assignedMentor;
      }
    }

    if (project.status === 'PENDING' && assignedMentor) updates.status = 'ASSIGNED';
    if (!project.submittedAt && project.status !== 'DRAFT' && project.reportFilePath) {
      updates.submittedAt = project.createdAt || new Date();
    }

    if (Object.keys(updates).length > 0) {
      await Project.collection.updateOne({ _id: project._id }, { $set: updates });
    }
  }

  const approvedProjects = await Project.find({ status: 'APPROVED' }).select('_id');
  if (approvedProjects.length > 0) {
    await User.updateMany(
      { activeProject: { $in: approvedProjects.map((project) => project._id) } },
      { $set: { activeProject: null } }
    );
  }

  const projectIds = await Project.distinct('_id');
  await User.updateMany(
    { activeProject: { $ne: null, $nin: projectIds } },
    { $set: { activeProject: null } }
  );

  const ongoingProjects = await Project.find({
    status: { $ne: 'APPROVED' },
    leader: { $ne: null }
  }).sort({ createdAt: -1 }).select('_id leader members');

  for (const project of ongoingProjects) {
    const studentIds = [
      project.leader,
      ...project.members
        .filter((member) => member.status === 'ACCEPTED')
        .map((member) => member.student)
    ];
    await User.updateMany(
      { _id: { $in: studentIds }, activeProject: null },
      { $set: { activeProject: project._id } }
    );
  }
};

const ensureInitialAdmin = async () => {
  const hasAdmin = await User.exists({ role: 'ADMIN' });
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  const supplied = [ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD].filter(Boolean).length;

  if (supplied === 0) {
    if (!hasAdmin) {
      throw new Error('Configure ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD to create the initial admin');
    }
    return;
  }

  if (supplied !== 3) {
    throw new Error('ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD must all be configured together');
  }
  if (!ADMIN_NAME.trim() || !ADMIN_EMAIL.trim() || ADMIN_PASSWORD.length < 8) {
    throw new Error('Set a non-empty admin name/email and an initial password of at least 8 characters');
  }

  const normalizedEmail = ADMIN_EMAIL.trim().toLowerCase();
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    if (existingUser.role !== 'ADMIN') {
      throw new Error('ADMIN_EMAIL is already registered to a non-admin account');
    }
    return;
  }

  const password = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await User.create({
    name: ADMIN_NAME,
    email: normalizedEmail,
    password,
    role: 'ADMIN'
  });
  console.log(`Initial admin account created for ${normalizedEmail}`);
};

const bootstrapData = async () => {
  await migrateLegacyProjects();
  await ensureInitialAdmin();
};

module.exports = bootstrapData;
