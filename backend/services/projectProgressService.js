const Project = require('../models/Project');
const {
  PROGRESS_TEMPLATE,
  PROGRESS_TEMPLATE_VERSION
} = require('../config/progressTemplate');

const buildInitialProgress = () => ({
  templateVersion: PROGRESS_TEMPLATE_VERSION,
  initializedAt: new Date(),
  phases: PROGRESS_TEMPLATE.map((phase) => ({
    key: phase.key,
    name: phase.name,
    description: phase.description,
    order: phase.order,
    milestones: phase.milestones.map((milestone) => ({
      ...milestone,
      status: 'PENDING',
      submissions: [],
      reviews: []
    }))
  }))
});

const calculateProgress = (progress) => {
  const phases = (progress?.phases || []).map((phase) => {
    const milestones = phase.milestones || [];
    const total = milestones.length;
    const completed = milestones.filter((milestone) => milestone.status === 'COMPLETED').length;
    return {
      key: phase.key,
      name: phase.name,
      description: phase.description,
      order: phase.order,
      total,
      completed,
      percentage: total ? Math.round((completed / total) * 100) : 0,
      isCompleted: total > 0 && completed === total
    };
  });
  const milestones = (progress?.phases || []).flatMap((phase) => phase.milestones || []);
  const total = milestones.length;
  const completed = milestones.filter((milestone) => milestone.status === 'COMPLETED').length;

  return {
    templateVersion: progress?.templateVersion || PROGRESS_TEMPLATE_VERSION,
    overall: {
      total,
      completed,
      pending: milestones.filter((milestone) => milestone.status === 'PENDING').length,
      inProgress: milestones.filter((milestone) => milestone.status === 'IN_PROGRESS').length,
      submitted: milestones.filter((milestone) => milestone.status === 'SUBMITTED').length,
      percentage: total ? Math.round((completed / total) * 100) : 0
    },
    phases
  };
};

const initializeApprovedProject = async (projectId) => {
  await Project.updateOne(
    {
      _id: projectId,
      status: 'APPROVED',
      $or: [
        { progress: { $exists: false } },
        { progress: null }
      ]
    },
    { $set: { progress: buildInitialProgress() } }
  );
  return Project.findById(projectId);
};

module.exports = {
  buildInitialProgress,
  calculateProgress,
  initializeApprovedProject
};
