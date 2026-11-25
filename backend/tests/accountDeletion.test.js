const test = require('node:test');
const assert = require('node:assert/strict');
const Project = require('../models/Project');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { deleteMentorAccount } = require('../utils/accountDeletion');

test('mentor deletion enables aggregation-pipeline project updates', async () => {
  const originalMethods = {
    notificationDeleteMany: Notification.deleteMany,
    userUpdateMany: User.updateMany,
    userDeleteOne: User.deleteOne,
    projectUpdateMany: Project.updateMany
  };
  const projectUpdates = [];
  const mentor = { _id: 'mentor-id' };

  Notification.deleteMany = async () => {};
  User.updateMany = async () => {};
  User.deleteOne = async () => {};
  Project.updateMany = async (...args) => {
    projectUpdates.push(args);
  };

  try {
    await deleteMentorAccount(mentor);
    const pipelineUpdate = projectUpdates.find(([, update]) => Array.isArray(update));

    assert.ok(pipelineUpdate);
    assert.deepEqual(pipelineUpdate[2], { updatePipeline: true });
  } finally {
    Notification.deleteMany = originalMethods.notificationDeleteMany;
    User.updateMany = originalMethods.userUpdateMany;
    User.deleteOne = originalMethods.userDeleteOne;
    Project.updateMany = originalMethods.projectUpdateMany;
  }
});
