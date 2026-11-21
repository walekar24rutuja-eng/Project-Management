const test = require('node:test');
const assert = require('node:assert/strict');
const { PROGRESS_TEMPLATE } = require('../config/progressTemplate');
const {
  buildInitialProgress,
  calculateProgress
} = require('../services/projectProgressService');

test('the fixed roadmap contains seven phases and twenty-eight uniquely keyed milestones', () => {
  const phaseKeys = PROGRESS_TEMPLATE.map((phase) => phase.key);
  const milestoneKeys = PROGRESS_TEMPLATE.flatMap((phase) => phase.milestones.map((milestone) => milestone.key));

  assert.equal(PROGRESS_TEMPLATE.length, 7);
  assert.equal(milestoneKeys.length, 28);
  assert.equal(new Set(phaseKeys).size, 7);
  assert.equal(new Set(milestoneKeys).size, 28);
});

test('progress counts only mentor-approved milestones and derives phase completion', () => {
  const progress = buildInitialProgress();
  progress.phases[0].milestones[0].status = 'COMPLETED';
  progress.phases[0].milestones[1].status = 'IN_PROGRESS';
  progress.phases[0].milestones[2].status = 'SUBMITTED';
  progress.phases[0].milestones[3].status = 'COMPLETED';

  const summary = calculateProgress(progress);

  assert.equal(summary.overall.total, 28);
  assert.equal(summary.overall.completed, 2);
  assert.equal(summary.overall.inProgress, 1);
  assert.equal(summary.overall.submitted, 1);
  assert.equal(summary.overall.percentage, 7);
  assert.equal(summary.phases[0].isCompleted, false);
  assert.equal(summary.phases[0].percentage, 50);
});

test('a phase is complete only when every milestone is approved', () => {
  const progress = buildInitialProgress();
  progress.phases[0].milestones.forEach((milestone) => {
    milestone.status = 'COMPLETED';
  });

  const summary = calculateProgress(progress);

  assert.equal(summary.phases[0].isCompleted, true);
  assert.equal(summary.phases[0].percentage, 100);
});
