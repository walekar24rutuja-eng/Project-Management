const idString = (value) => {
  const id = value && typeof value === 'object' && value._id ? value._id : value;
  return id?.toString();
};

const isSameId = (first, second) => idString(first) === idString(second);

const isProjectLeader = (project, userId) => (
  isSameId(project.leader || project.student, userId)
);

const isAcceptedProjectMember = (project, userId) => (project.members || []).some(
  (member) => member.status === 'ACCEPTED' && isSameId(member.student, userId)
);

const isProjectStudent = (project, userId) => (
  isProjectLeader(project, userId) || isAcceptedProjectMember(project, userId)
);

const isAssignedMentor = (project, userId) => isSameId(project.assignedMentor, userId);

const canAccessProject = (project, user) => (
  user.role === 'ADMIN' ||
  (user.role === 'MENTOR' && isAssignedMentor(project, user.id)) ||
  (user.role === 'STUDENT' && isProjectStudent(project, user.id))
);

const isOngoingProject = (project) => Boolean(project && project.status !== 'APPROVED');

const canSubmitProject = (project) => (
  ['DRAFT', 'REJECTED'].includes(project.status)
);

const canUploadProjectReport = (project) => (
  ['DRAFT', 'REJECTED', 'APPROVED'].includes(project.status)
);

const getSubmissionStatus = (project) => (
  project.assignedMentor ? 'ASSIGNED' : 'PENDING'
);

const getMentorAssignmentStatus = (project, mentorId) => {
  if (!['PENDING', 'ASSIGNED'].includes(project.status)) return project.status;
  return mentorId ? 'ASSIGNED' : 'PENDING';
};

const canReviewProject = (project) => (
  ['PENDING', 'ASSIGNED'].includes(project.status)
);

module.exports = {
  canAccessProject,
  canReviewProject,
  canSubmitProject,
  canUploadProjectReport,
  getMentorAssignmentStatus,
  getSubmissionStatus,
  isAcceptedProjectMember,
  isAssignedMentor,
  isOngoingProject,
  isProjectLeader,
  isProjectStudent
};
