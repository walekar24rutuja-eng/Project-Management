import React from 'react';

const MilestoneProgress = ({ completed = 0, total = 0, compact = false }) => {
  if (!total) return null;

  const safeCompleted = Math.min(Math.max(completed, 0), total);
  const percentage = Math.round((safeCompleted / total) * 100);

  return (
    <div className={`milestone-progress${compact ? ' milestone-progress-compact' : ''}`}>
      <div
        className="milestone-progress-track"
        role="progressbar"
        aria-label="Project milestone progress"
        aria-valuemin="0"
        aria-valuemax={total}
        aria-valuenow={safeCompleted}
        aria-valuetext={`${safeCompleted} of ${total} milestones approved`}
      >
        <span className="milestone-progress-fill" style={{ width: `${percentage}%` }} />
      </div>
      <span className="milestone-progress-label">
        {safeCompleted}/{total} milestones approved
      </span>
    </div>
  );
};

export default MilestoneProgress;
