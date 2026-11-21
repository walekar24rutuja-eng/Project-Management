const Notification = require('../models/Notification');

const createProjectNotifications = async ({
  project,
  recipients,
  actor,
  type,
  title,
  message,
  path
}) => {
  const recipientIds = [...new Set((recipients || []).filter(Boolean).map((id) => id.toString()))];
  if (!recipientIds.length) return [];

  return Notification.insertMany(recipientIds.map((recipient) => ({
    recipient,
    project: project._id,
    actor: actor || null,
    type,
    title,
    message,
    path: path || `/projects/${project._id}`,
    scheduledFor: new Date()
  })));
};

const getProjectStudentIds = (project) => [
  project.leader || project.student,
  ...(project.members || [])
    .filter((member) => member.status === 'ACCEPTED')
    .map((member) => member.student)
].filter(Boolean);

module.exports = {
  createProjectNotifications,
  getProjectStudentIds
};
