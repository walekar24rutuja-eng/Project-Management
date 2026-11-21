import React, { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import API from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import ProjectReportDownload from '../components/ProjectReportDownload';
import MilestoneProgress from '../components/MilestoneProgress';
import './ProjectDetails.css';

const isSameId = (first, second) => String(first?._id || first || '') === String(second?._id || second || '');

const statusLabel = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In progress',
  SUBMITTED: 'Awaiting mentor review',
  COMPLETED: 'Approved'
};

const ProjectDetails = () => {
  const { projectId } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [progress, setProgress] = useState(null);
  const [topicName, setTopicName] = useState('');
  const [reportFilePath, setReportFilePath] = useState('');
  const [notes, setNotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadProject = useCallback(async () => {
    try {
      const response = await API.get(`/projects/${projectId}`);
      setProject(response.data.project);
      setProgress(response.data.progress);
      setTopicName(response.data.project.topicName || '');
      setReportFilePath(response.data.project.reportFilePath || '');
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let active = true;
    API.get(`/projects/${projectId}`)
      .then((response) => {
        if (!active) return;
        setProject(response.data.project);
        setProgress(response.data.progress);
        setTopicName(response.data.project.topicName || '');
        setReportFilePath(response.data.project.reportFilePath || '');
        setError('');
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || 'Failed to load project');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [projectId]);

  const isLeader = project && isSameId(project.leader || project.student, user?.id || user?._id);
  const isMentor = project && isSameId(project.assignedMentor, user?.id || user?._id);
  const isApproved = project?.status === 'APPROVED';

  const handleProjectSubmit = async (event) => {
    event.preventDefault();
    if (!project || !isLeader) return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (['DRAFT', 'REJECTED'].includes(project.status)) {
        await API.put(`/projects/${project._id}/${project.status === 'REJECTED' ? 'resubmit' : 'submit'}`, {
          topicName,
          reportFilePath
        });
      } else {
        await API.put(`/projects/${project._id}/details`, { topicName, reportFilePath });
      }
      setMessage('Project details submitted for mentor review.');
      await loadProject();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to update project details');
    } finally {
      setSaving(false);
    }
  };

  const handleReportSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get('report');
    setMessage('');
    if (!/\.(pdf|pptx?)$/i.test(file.name) || file.size > 10 * 1024 * 1024) {
      setError('Choose a PDF, PPT, or PPTX file of 10 MB or smaller.');
      return;
    }

    setError('');
    setSaving(true);
    setUploadProgress(0);
    try {
      await API.post(`/projects/${project._id}/report`, formData, {
        onUploadProgress: ({ loaded, total }) => {
          if (total) setUploadProgress(Math.round(100 * loaded / total));
        }
      });
      setMessage('Report submitted to your mentor for review.');
      await loadProject();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to submit the report');
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const handleJoinDecision = async (studentId, status) => {
    try {
      await API.put(`/projects/${project._id}/members/${studentId}`, { status });
      setMessage(`Join request ${status.toLowerCase()}.`);
      await loadProject();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to update membership request');
    }
  };

  const handleStart = async (milestoneKey) => {
    try {
      await API.put(`/projects/${project._id}/progress/milestones/${milestoneKey}/start`);
      await loadProject();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to start milestone');
    }
  };

  const handleSubmitMilestone = async (event, milestoneKey) => {
    event.preventDefault();
    const note = notes[milestoneKey] || '';
    try {
      await API.post(`/projects/${project._id}/progress/milestones/${milestoneKey}/submissions`, { note });
      setNotes((current) => ({ ...current, [milestoneKey]: '' }));
      setMessage('Milestone update submitted for mentor review.');
      await loadProject();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to submit milestone update');
    }
  };

  if (loading) {
    return (
      <>
        <Sidebar />
        <main className="dashboard-page project-details-page"><p>Loading project...</p></main>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <Sidebar />
        <main className="dashboard-page project-details-page">
          <div role="alert" className="project-details-error">{error || 'Project not found.'}</div>
        </main>
      </>
    );
  }

  const pendingMembers = isLeader
    ? (project.members || []).filter((member) => member.status === 'PENDING')
    : [];
  const overall = progress?.overall;

  return (
    <>
      <Sidebar />
      <main className="dashboard-page project-details-page">
        <Link className="project-back-link" to={user?.role === 'MENTOR' ? '/mentor-dashboard' : '/student-dashboard'}>
          Back to dashboard
        </Link>
        <header className="project-details-header">
          <div>
            <p className="project-kicker">Project {project.projectId}</p>
            <h2>{project.topicName}</h2>
            <p className="project-details-subtitle">
              Team leader: {project.leader?.name || project.leader?.email || 'Unknown'}
              {' · '}
              Mentor: {project.assignedMentor?.name || 'Not assigned'}
            </p>
          </div>
          <span className={`project-status-badge status-${project.status.toLowerCase()}`}>{project.status}</span>
        </header>

        {error && <div role="alert" className="project-details-error">{error}</div>}
        {message && <div role="status" className="project-details-success">{message}</div>}

        <section className="project-details-card">
          <div className="project-section-heading">
            <div>
              <p className="project-kicker">Overview</p>
              <h3>Project and team</h3>
            </div>
          </div>
          <div className="project-team-grid">
            {(project.members || [])
              .filter((member) => member.status === 'ACCEPTED')
              .map((member) => (
                <div className="project-team-member" key={member.student._id}>
                  <strong>{member.student.name}</strong>
                  <span>{member.student.email}</span>
                </div>
              ))}
          </div>
          {project.reportFile && <ProjectReportDownload project={project} />}
          {project.reportFilePath && (
            <p className="project-submitted-link">
              Project link: <a href={project.reportFilePath} target="_blank" rel="noopener noreferrer">{project.reportFilePath}</a>
            </p>
          )}
          {project.facultyFeedback && <p className="project-faculty-feedback"><strong>Mentor feedback:</strong> {project.facultyFeedback}</p>}

          {isLeader && (
            <form className="project-edit-form" onSubmit={handleProjectSubmit}>
              <h4>{isApproved ? 'Update project topic or link' : 'Project submission'}</h4>
              <label>
                Project topic
                <input required value={topicName} onChange={(event) => setTopicName(event.target.value)} />
              </label>
              <label>
                Project link
                <input
                  type="url"
                  required={['DRAFT', 'REJECTED'].includes(project.status)}
                  placeholder="https://..."
                  value={reportFilePath}
                  onChange={(event) => setReportFilePath(event.target.value)}
                />
              </label>
              <button type="submit" disabled={saving}>
                {saving
                  ? 'Saving...'
                  : ['DRAFT', 'REJECTED'].includes(project.status)
                    ? 'Submit project for mentor approval'
                    : isApproved
                      ? 'Submit changes for mentor approval'
                      : 'Update submitted project details'}
              </button>
            </form>
          )}

          {isLeader && ['DRAFT', 'REJECTED', 'APPROVED'].includes(project.status) && (
            <form key={project._id} className="project-edit-form" onSubmit={handleReportSubmit}>
              <label>
                Report file (PDF, PPT, or PPTX, up to 10 MB)
                <input type="file" name="report" accept=".pdf,.ppt,.pptx" required disabled={saving} />
              </label>
              {isApproved && <p>Submitting a report reopens this project for mentor review.</p>}
              {uploadProgress !== null && <progress value={uploadProgress} max="100" aria-label="Report upload progress" />}
              <button type="submit" disabled={saving}>
                {uploadProgress !== null ? 'Uploading...' : 'Submit report for review'}
              </button>
            </form>
          )}

          {pendingMembers.length > 0 && (
            <div className="project-membership-requests">
              <h4>Join requests</h4>
              {pendingMembers.map((member) => (
                <div className="project-membership-request" key={member.student._id}>
                  <span>{member.student.name} ({member.student.email})</span>
                  <button type="button" onClick={() => handleJoinDecision(member.student._id, 'ACCEPTED')}>Accept</button>
                  <button type="button" className="project-secondary-button" onClick={() => handleJoinDecision(member.student._id, 'REJECTED')}>Reject</button>
                </div>
              ))}
            </div>
          )}
        </section>

        {isApproved && progress && (
          <section className="project-details-card">
            <div className="project-section-heading">
              <div>
                <p className="project-kicker">Phases and milestones</p>
                <h3>Project progress</h3>
              </div>
              {overall && <span className="project-progress-percent">{overall.percentage}%</span>}
            </div>
            {overall && <MilestoneProgress completed={overall.completed} total={overall.total} />}

            <div className="project-phase-list">
              {progress.phases.map((phase) => (
                <details className="project-phase" key={phase.key}>
                  <summary>
                    <span className={`project-phase-indicator${phase.isCompleted ? ' completed' : ''}`}>
                      {phase.isCompleted ? '✓' : phase.order}
                    </span>
                    <span className="project-phase-title">
                      <strong>{phase.name}</strong>
                      <small>{phase.completed}/{phase.total} milestones approved</small>
                    </span>
                    <span className="project-phase-percent">{phase.percentage}%</span>
                  </summary>
                  <p className="project-phase-description">{phase.description}</p>
                  <div className="project-milestone-list">
                    {phase.milestones.map((milestone) => {
                      const latestReview = milestone.reviews[milestone.reviews.length - 1];
                      return (
                        <article className="project-milestone" key={milestone.key}>
                          <div className="project-milestone-heading">
                            <div>
                              <h4>{milestone.title}</h4>
                              <p>{milestone.description}</p>
                            </div>
                            <span className={`milestone-status milestone-status-${milestone.status.toLowerCase()}`}>
                              {statusLabel[milestone.status] || milestone.status}
                            </span>
                          </div>

                          {latestReview && (
                            <div className="milestone-feedback">
                              <strong>Latest mentor feedback</strong>
                              <p>{latestReview.feedback || 'Approved.'}</p>
                              <small>{new Date(latestReview.reviewedAt).toLocaleString()}</small>
                            </div>
                          )}

                          {milestone.submissions.length > 0 && (
                            <details className="milestone-history">
                              <summary>Submission history ({milestone.submissions.length})</summary>
                              {milestone.submissions.map((submission) => (
                                <article key={submission._id} className="milestone-history-entry">
                                  <small>
                                    {submission.submittedBy?.name || 'Student'} · {new Date(submission.submittedAt).toLocaleString()}
                                  </small>
                                  <p>{submission.note}</p>
                                </article>
                              ))}
                              {milestone.reviews.map((review) => (
                                <article key={review._id} className="milestone-history-entry milestone-review-entry">
                                  <small>
                                    {review.reviewedBy?.name || 'Mentor'} · {new Date(review.reviewedAt).toLocaleString()}
                                  </small>
                                  <p>{review.decision === 'APPROVED' ? 'Approved' : 'Changes requested'}{review.feedback ? `: ${review.feedback}` : ''}</p>
                                </article>
                              ))}
                            </details>
                          )}

                          {milestone.status === 'SUBMITTED' && isMentor && (
                            <Link className="project-review-link" to="/mentor/reviews">Review this submission</Link>
                          )}

                          {user?.role === 'STUDENT' && milestone.status === 'PENDING' && (
                            <button type="button" onClick={() => handleStart(milestone.key)}>Start milestone</button>
                          )}
                          {user?.role === 'STUDENT' && milestone.status === 'IN_PROGRESS' && (
                            <form className="milestone-submit-form" onSubmit={(event) => handleSubmitMilestone(event, milestone.key)}>
                              <label>
                                Progress update
                                <textarea
                                  required
                                  maxLength="5000"
                                  rows="3"
                                  value={notes[milestone.key] || ''}
                                  onChange={(event) => setNotes((current) => ({
                                    ...current,
                                    [milestone.key]: event.target.value
                                  }))}
                                />
                              </label>
                              <button type="submit">Submit for mentor review</button>
                            </form>
                          )}
                        </article>
                      );
                    })}
                  </div>
                </details>
              ))}
            </div>
          </section>
        )}

        {project.status !== 'APPROVED' && (
          <section className="project-details-card">
            <h3>Progress tracker</h3>
            <p>The phase and milestone tracker will be available after mentor approval.</p>
          </section>
        )}

        <section className="project-details-card">
          <p className="project-kicker">Project activity</p>
          <h3>Meeting and review history</h3>
          {(project.reviewSchedules || []).length === 0 ? (
            <p>No meetings or reviews have been scheduled.</p>
          ) : (
            <div className="project-meeting-list">
              {project.reviewSchedules
                .slice()
                .sort((first, second) => new Date(second.scheduledFor) - new Date(first.scheduledFor))
                .map((review) => (
                  <article className="project-meeting" key={review._id}>
                    <strong>{review.title}</strong>
                    <span>{new Date(review.scheduledFor).toLocaleString()}</span>
                    {review.notes && <p>{review.notes}</p>}
                  </article>
                ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
};

export default ProjectDetails;
