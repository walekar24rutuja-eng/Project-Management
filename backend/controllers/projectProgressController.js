const mongoose = require('mongoose');
const Project = require('../models/Project');
const {
  canAccessProject,
  isAssignedMentor,
  isProjectStudent
} = require('../utils/projectAccess');
const {
  calculateProgress,
  initializeApprovedProject
} = require('../services/projectProgressService');
const {
  createProjectNotifications,
  getProjectStudentIds
} = require('../services/projectNotificationService');

const findProject = (id) => (
  mongoose.isValidObjectId(id) ? Project.findById(id) : null
);

const findMilestone = (project, milestoneKey) => {
  for (const phase of project.progress?.phases || []) {
    const milestone = phase.milestones.find((item) => item.key === milestoneKey);
    if (milestone) return { phase, milestone };
  }
  return null;
};

const populateProgressHistory = async (project) => project.populate([
  { path: 'progress.phases.milestones.submissions.submittedBy', select: 'name email' },
  { path: 'progress.phases.milestones.reviews.reviewedBy', select: 'name email' }
]);

const progressResponse = (project) => ({
  ...calculateProgress(project.progress),
  initializedAt: project.progress.initializedAt,
  phases: project.progress.phases.map((phase) => ({
    ...phase.toObject(),
    isCompleted: phase.milestones.length > 0
      && phase.milestones.every((milestone) => milestone.status === 'COMPLETED')
  }))
});

const loadApprovedProject = async (projectId) => {
  let project = await findProject(projectId);
  if (!project) return { error: { status: 404, message: 'Project not found' } };
  if (project.status !== 'APPROVED') {
    return { error: { status: 409, message: 'Progress tracking is available after mentor approval' } };
  }
  if (!project.progress) {
    project = await initializeApprovedProject(project._id);
  }
  if (!project?.progress) {
    return { error: { status: 500, message: 'Could not initialize project progress' } };
  }
  return { project };
};

const getProjectDetails = async (req, res) => {
  try {
    let project = await findProject(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (!canAccessProject(project, req.user)) {
      return res.status(403).json({ message: 'You are not a member of this project' });
    }

    if (project.status === 'APPROVED' && !project.progress) {
      project = await initializeApprovedProject(project._id);
    }
    await project.populate([
      { path: 'leader', select: 'name email rollNumber' },
      { path: 'members.student', select: 'name email rollNumber' },
      { path: 'assignedMentor', select: 'name email' },
      { path: 'preferredMentor', select: 'name email' },
      { path: 'progress.phases.milestones.submissions.submittedBy', select: 'name email' },
      { path: 'progress.phases.milestones.reviews.reviewedBy', select: 'name email' }
    ]);

    res.json({
      project,
      progress: project.progress ? progressResponse(project) : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProjectProgress = async (req, res) => {
  try {
    const accessProject = await findProject(req.params.id);
    if (!accessProject) return res.status(404).json({ message: 'Project not found' });
    if (!canAccessProject(accessProject, req.user)) {
      return res.status(403).json({ message: 'You are not a member of this project' });
    }

    const { project, error } = await loadApprovedProject(req.params.id);
    if (error) return res.status(error.status).json({ message: error.message });
    await populateProgressHistory(project);
    res.json({ success: true, progress: progressResponse(project) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const startMilestone = async (req, res) => {
  try {
    const accessProject = await findProject(req.params.id);
    if (!accessProject) return res.status(404).json({ message: 'Project not found' });
    if (!isProjectStudent(accessProject, req.user.id)) {
      return res.status(403).json({ message: 'Only project students can start milestones' });
    }

    const { project, error } = await loadApprovedProject(req.params.id);
    if (error) return res.status(error.status).json({ message: error.message });

    const target = findMilestone(project, req.params.milestoneKey);
    if (!target) return res.status(404).json({ message: 'Milestone not found' });
    if (target.milestone.status === 'IN_PROGRESS') {
      return res.json({
        success: true,
        milestone: { key: target.milestone.key, status: target.milestone.status }
      });
    }
    if (target.milestone.status !== 'PENDING') {
      return res.status(409).json({ message: 'This milestone cannot be started in its current state' });
    }

    const startedAt = new Date();
    const result = await Project.updateOne(
      {
        _id: project._id,
        status: 'APPROVED',
        'progress.phases.milestones': {
          $elemMatch: { key: target.milestone.key, status: 'PENDING' }
        }
      },
      {
        $set: {
          'progress.phases.$[phase].milestones.$[milestone].status': 'IN_PROGRESS',
          'progress.phases.$[phase].milestones.$[milestone].startedAt': startedAt
        }
      },
      {
        arrayFilters: [
          { 'phase.key': target.phase.key },
          { 'milestone.key': target.milestone.key, 'milestone.status': 'PENDING' }
        ]
      }
    );
    if (!result.modifiedCount) {
      return res.status(409).json({ message: 'This milestone has already changed' });
    }
    res.json({
      success: true,
      milestone: { key: target.milestone.key, status: 'IN_PROGRESS', startedAt }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const submitMilestone = async (req, res) => {
  try {
    const note = req.body?.note;
    if (typeof note !== 'string' || !note.trim()) {
      return res.status(400).json({ message: 'A progress note is required' });
    }
    if (note.trim().length > 5000) {
      return res.status(400).json({ message: 'Progress notes must be 5000 characters or fewer' });
    }

    const accessProject = await findProject(req.params.id);
    if (!accessProject) return res.status(404).json({ message: 'Project not found' });
    if (!isProjectStudent(accessProject, req.user.id)) {
      return res.status(403).json({ message: 'Only project students can submit milestone progress' });
    }

    const { project, error } = await loadApprovedProject(req.params.id);
    if (error) return res.status(error.status).json({ message: error.message });
    const target = findMilestone(project, req.params.milestoneKey);
    if (!target) return res.status(404).json({ message: 'Milestone not found' });
    if (target.milestone.status !== 'IN_PROGRESS') {
      return res.status(409).json({ message: 'Start this milestone before submitting progress' });
    }

    const submittedAt = new Date();
    const result = await Project.updateOne(
      {
        _id: project._id,
        status: 'APPROVED',
        'progress.phases.milestones': {
          $elemMatch: { key: target.milestone.key, status: 'IN_PROGRESS' }
        }
      },
      {
        $set: { 'progress.phases.$[phase].milestones.$[milestone].status': 'SUBMITTED' },
        $push: {
          'progress.phases.$[phase].milestones.$[milestone].submissions': {
            submittedBy: req.user.id,
            note: note.trim(),
            submittedAt
          }
        }
      },
      {
        arrayFilters: [
          { 'phase.key': target.phase.key },
          { 'milestone.key': target.milestone.key, 'milestone.status': 'IN_PROGRESS' }
        ]
      }
    );
    if (!result.modifiedCount) {
      return res.status(409).json({ message: 'This milestone has already changed' });
    }

    if (project.assignedMentor) {
      await createProjectNotifications({
        project,
        recipients: [project.assignedMentor],
        actor: req.user.id,
        type: 'MILESTONE_SUBMITTED',
        title: 'Milestone update submitted',
        message: `A student submitted an update for "${target.milestone.title}".`
      });
    }
    res.status(201).json({
      success: true,
      message: 'Progress submitted for mentor review.',
      milestone: { key: target.milestone.key, status: 'SUBMITTED', submittedAt }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const reviewMilestone = async (req, res) => {
  try {
    const { decision, feedback = '' } = req.body || {};
    if (!['APPROVED', 'CHANGES_REQUESTED'].includes(decision)) {
      return res.status(400).json({ message: 'Decision must be APPROVED or CHANGES_REQUESTED' });
    }
    if (typeof feedback !== 'string' || feedback.length > 5000) {
      return res.status(400).json({ message: 'Feedback must be text of 5000 characters or fewer' });
    }
    if (decision === 'CHANGES_REQUESTED' && !feedback.trim()) {
      return res.status(400).json({ message: 'Feedback is required when requesting changes' });
    }

    const accessProject = await findProject(req.params.id);
    if (!accessProject) return res.status(404).json({ message: 'Project not found' });
    if (!isAssignedMentor(accessProject, req.user.id)) {
      return res.status(403).json({ message: 'Only the assigned mentor can review milestones' });
    }

    const { project, error } = await loadApprovedProject(req.params.id);
    if (error) return res.status(error.status).json({ message: error.message });
    const target = findMilestone(project, req.params.milestoneKey);
    if (!target) return res.status(404).json({ message: 'Milestone not found' });
    if (target.milestone.status !== 'SUBMITTED') {
      return res.status(409).json({ message: 'Only submitted milestones can be reviewed' });
    }

    const reviewedAt = new Date();
    const status = decision === 'APPROVED' ? 'COMPLETED' : 'IN_PROGRESS';
    const update = {
      $set: { 'progress.phases.$[phase].milestones.$[milestone].status': status },
      $push: {
        'progress.phases.$[phase].milestones.$[milestone].reviews': {
          reviewedBy: req.user.id,
          decision,
          feedback: feedback.trim(),
          reviewedAt
        }
      }
    };
    if (decision === 'APPROVED') {
      update.$set['progress.phases.$[phase].milestones.$[milestone].completedAt'] = reviewedAt;
    } else {
      update.$unset = {
        'progress.phases.$[phase].milestones.$[milestone].completedAt': ''
      };
    }

    const result = await Project.updateOne(
      {
        _id: project._id,
        status: 'APPROVED',
        assignedMentor: req.user.id,
        'progress.phases.milestones': {
          $elemMatch: { key: target.milestone.key, status: 'SUBMITTED' }
        }
      },
      update,
      {
        arrayFilters: [
          { 'phase.key': target.phase.key },
          { 'milestone.key': target.milestone.key, 'milestone.status': 'SUBMITTED' }
        ]
      }
    );
    if (!result.modifiedCount) {
      return res.status(409).json({ message: 'This milestone has already been reviewed' });
    }

    await createProjectNotifications({
      project,
      recipients: getProjectStudentIds(project),
      actor: req.user.id,
      type: decision === 'APPROVED' ? 'MILESTONE_APPROVED' : 'MILESTONE_CHANGES_REQUESTED',
      title: decision === 'APPROVED' ? 'Milestone approved' : 'Milestone update requested',
      message: decision === 'APPROVED'
        ? `The mentor approved "${target.milestone.title}".`
        : `The mentor requested changes to "${target.milestone.title}": ${feedback.trim()}`
    });

    res.json({
      success: true,
      message: decision === 'APPROVED' ? 'Milestone approved.' : 'Changes requested.',
      milestone: { key: target.milestone.key, status, reviewedAt }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPendingReviews = async (req, res) => {
  try {
    const projects = await Project.find({
      assignedMentor: req.user.id,
      status: 'APPROVED',
      'progress.phases.milestones.status': 'SUBMITTED'
    })
      .populate('leader', 'name email')
      .populate('progress.phases.milestones.submissions.submittedBy', 'name email');
    const reviews = [];

    projects.forEach((project) => {
      project.progress.phases.forEach((phase) => {
        phase.milestones
          .filter((milestone) => milestone.status === 'SUBMITTED')
          .forEach((milestone) => {
            reviews.push({
              project: {
                _id: project._id,
                projectId: project.projectId,
                topicName: project.topicName,
                leader: project.leader
              },
              phase: { key: phase.key, name: phase.name },
              milestone: {
                key: milestone.key,
                title: milestone.title,
                description: milestone.description,
                submissions: milestone.submissions
              }
            });
          });
      });
    });
    reviews.sort((first, second) => (
      new Date(first.milestone.submissions.at(-1)?.submittedAt || 0)
      - new Date(second.milestone.submissions.at(-1)?.submittedAt || 0)
    ));
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getPendingReviews,
  getProjectDetails,
  getProjectProgress,
  reviewMilestone,
  startMilestone,
  submitMilestone
};
