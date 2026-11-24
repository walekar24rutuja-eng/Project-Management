const Project = require('../models/Project');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { removeStoredReport } = require('./reportCleanup');

const deleteStudentAccount = async (user) => {
  const projects = await Project.find({ $or: [{ leader: user._id }, { student: user._id }] })
    .select('_id reportFile');
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
  await Promise.all(projects.map((project) => removeStoredReport(project.reportFile)));
  await Project.deleteMany({ _id: { $in: projectIds } });
  await Project.updateMany(
    { 'members.student': user._id },
    { $pull: { members: { student: user._id } } }
  );

  await User.deleteOne({ _id: user._id });
};

const deleteMentorAccount = async (user) => {
  await Notification.deleteMany({ recipient: user._id });
  await User.updateMany(
    { assignedMentor: user._id },
    { $set: { assignedMentor: null } }
  );
  await Project.updateMany(
    { assignedMentor: user._id },
    [
      {
        $set: {
          assignedMentor: null,
          status: {
            $switch: {
              branches: [
                { case: { $eq: ['$status', 'APPROVED'] }, then: 'APPROVED' },
                { case: { $eq: ['$status', 'REJECTED'] }, then: 'REJECTED' },
                { case: { $eq: ['$status', 'DRAFT'] }, then: 'DRAFT' }
              ],
              default: 'PENDING'
            }
          }
        }
      }
    ]
  );
  await Project.updateMany(
    { preferredMentor: user._id },
    { $set: { preferredMentor: null } }
  );

  await User.deleteOne({ _id: user._id });
};

module.exports = { deleteStudentAccount, deleteMentorAccount };
