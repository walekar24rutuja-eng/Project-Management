const test = require('node:test');
const assert = require('node:assert/strict');
const Project = require('../models/Project');
const User = require('../models/User');
const createProjectId = require('../utils/projectId');
const {
  canAccessProject,
  canReviewProject,
  canSubmitProject,
  canUploadProjectReport,
  getMentorAssignmentStatus,
  getSubmissionStatus,
  isOngoingProject,
  isProjectLeader,
  isProjectStudent
} = require('../utils/projectAccess');

const project = {
  leader: 'leader-1',
  assignedMentor: 'mentor-1',
  status: 'PENDING',
  members: [
    { student: 'member-1', status: 'ACCEPTED' },
    { student: 'pending-1', status: 'PENDING' },
    { student: 'rejected-1', status: 'REJECTED' }
  ]
};

test('only the project leader or accepted members count as project students', () => {
  assert.equal(isProjectLeader(project, 'leader-1'), true);
  assert.equal(isProjectStudent(project, 'leader-1'), true);
  assert.equal(isProjectLeader({ leader: { _id: 'leader-1' } }, 'leader-1'), true);
  assert.equal(isProjectStudent(project, 'member-1'), true);
  assert.equal(isProjectStudent(project, 'pending-1'), false);
  assert.equal(isProjectStudent(project, 'rejected-1'), false);
});

test('project access is scoped to the team or assigned mentor except for admins', () => {
  assert.equal(canAccessProject(project, { id: 'leader-1', role: 'STUDENT' }), true);
  assert.equal(canAccessProject(project, { id: 'member-1', role: 'STUDENT' }), true);
  assert.equal(canAccessProject(project, { id: 'pending-1', role: 'STUDENT' }), false);
  assert.equal(canAccessProject(project, { id: 'mentor-1', role: 'MENTOR' }), true);
  assert.equal(canAccessProject(project, { id: 'other-mentor', role: 'MENTOR' }), false);
  assert.equal(canAccessProject(project, { id: 'admin-1', role: 'ADMIN' }), true);
});

test('only draft or rejected projects can be submitted or resubmitted', () => {
  assert.equal(canSubmitProject({ status: 'DRAFT' }), true);
  assert.equal(canSubmitProject({ status: 'REJECTED' }), true);
  assert.equal(canSubmitProject({ status: 'PENDING' }), false);
  assert.equal(canSubmitProject({ status: 'APPROVED' }), false);
  assert.equal(canSubmitProject({ status: 'ASSIGNED' }), false);
});

test('reports can reopen approved projects but cannot be resubmitted during review', () => {
  assert.equal(canUploadProjectReport({ status: 'DRAFT' }), true);
  assert.equal(canUploadProjectReport({ status: 'REJECTED' }), true);
  assert.equal(canUploadProjectReport({ status: 'APPROVED' }), true);
  assert.equal(canUploadProjectReport({ status: 'PENDING' }), false);
  assert.equal(canUploadProjectReport({ status: 'ASSIGNED' }), false);
});

test('submission and mentor assignment move projects between pending and assigned', () => {
  assert.equal(getSubmissionStatus({ assignedMentor: null }), 'PENDING');
  assert.equal(getSubmissionStatus({ assignedMentor: 'mentor-1' }), 'ASSIGNED');
  assert.equal(getMentorAssignmentStatus({ status: 'PENDING' }, 'mentor-1'), 'ASSIGNED');
  assert.equal(getMentorAssignmentStatus({ status: 'ASSIGNED' }, null), 'PENDING');
  assert.equal(getMentorAssignmentStatus({ status: 'DRAFT' }, 'mentor-1'), 'DRAFT');
  assert.equal(getMentorAssignmentStatus({ status: 'REJECTED' }, 'mentor-1'), 'REJECTED');
  assert.equal(getMentorAssignmentStatus({ status: 'APPROVED' }, null), 'APPROVED');
  assert.equal(canReviewProject({ status: 'ASSIGNED' }), true);
  assert.equal(canReviewProject({ status: 'PENDING' }), true);
  assert.equal(canReviewProject({ status: 'DRAFT' }), false);
});

test('mentor approval is the only project status that releases ongoing participation', () => {
  assert.equal(isOngoingProject({ status: 'DRAFT' }), true);
  assert.equal(isOngoingProject({ status: 'PENDING' }), true);
  assert.equal(isOngoingProject({ status: 'ASSIGNED' }), true);
  assert.equal(isOngoingProject({ status: 'REJECTED' }), true);
  assert.equal(isOngoingProject({ status: 'APPROVED' }), false);
  assert.equal(isOngoingProject(null), false);
});

test('projects have a unique stable project ID separate from MongoDB document IDs', () => {
  const projectIdIndex = Project.schema.indexes().find(([fields]) => fields.projectId === 1);
  assert.deepEqual(projectIdIndex[1], { unique: true, sparse: true });
  assert.equal(Project.schema.path('projectId').instance, 'String');
  assert.ok(Project.schema.path('status').enumValues.includes('ASSIGNED'));
  const generatedIds = Array.from({ length: 10 }, createProjectId);
  assert.ok(generatedIds.every((projectId) => /^PRJ-[A-F0-9]{20}$/.test(projectId)));
  assert.equal(new Set(generatedIds).size, generatedIds.length);
});

test('student accounts can hold only one active project reference and admin is a supported role', () => {
  assert.deepEqual(User.schema.path('role').enumValues, ['STUDENT', 'MENTOR', 'ADMIN']);
  assert.equal(User.schema.path('activeProject').instance, 'ObjectId');
});

test('student roll numbers are required while mentor and admin roll numbers remain optional', async () => {
  const missingStudentRoll = new User({
    name: 'Student',
    email: 'student@example.test',
    password: 'hashed',
    role: 'STUDENT'
  });
  await assert.rejects(missingStudentRoll.validate(), (error) => Boolean(error.errors.rollNumber));

  const blankStudentRoll = new User({
    name: 'Student',
    email: 'student@example.test',
    password: 'hashed',
    role: 'STUDENT',
    rollNumber: '   '
  });
  await assert.rejects(blankStudentRoll.validate(), (error) => Boolean(error.errors.rollNumber));

  const mentorWithoutRoll = new User({
    name: 'Mentor',
    email: 'mentor@example.test',
    password: 'hashed',
    role: 'MENTOR',
    department: 'IT'
  });
  await mentorWithoutRoll.validate();

  const adminWithoutRoll = new User({
    name: 'Admin',
    email: 'admin@example.test',
    password: 'hashed',
    role: 'ADMIN'
  });
  await adminWithoutRoll.validate();
});

test('students and mentors require a known department while admins do not', async () => {
  const studentWithoutDepartment = new User({
    name: 'Student',
    email: 'student@example.test',
    password: 'hashed',
    role: 'STUDENT',
    rollNumber: '21IT001'
  });
  await assert.rejects(studentWithoutDepartment.validate(), (error) => Boolean(error.errors.department));

  const mentorWithoutDepartment = new User({
    name: 'Mentor',
    email: 'mentor@example.test',
    password: 'hashed',
    role: 'MENTOR'
  });
  await assert.rejects(mentorWithoutDepartment.validate(), (error) => Boolean(error.errors.department));

  const unknownDepartment = new User({
    name: 'Student',
    email: 'student@example.test',
    password: 'hashed',
    role: 'STUDENT',
    rollNumber: '21IT001',
    department: 'ARTS'
  });
  await assert.rejects(unknownDepartment.validate(), (error) => Boolean(error.errors.department));

  const studentWithDepartment = new User({
    name: 'Student',
    email: 'student@example.test',
    password: 'hashed',
    role: 'STUDENT',
    rollNumber: '21IT001',
    department: 'CS'
  });
  await studentWithDepartment.validate();
});
