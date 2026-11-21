import React, { useState, useEffect } from 'react';
import API from '../services/api';
import { FolderOpen, Clock, CircleCheck, CircleX, Users, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import './MentorDashboard.css';
import Sidebar from '../components/Sidebar';
import ProjectReportDownload from '../components/ProjectReportDownload';
import MilestoneProgress from '../components/MilestoneProgress';

const MentorDashboard = () => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({});
  const [reviewInputs, setReviewInputs] = useState({});

  const fetchProjects = async () => {
    try {
      const res = await API.get('/projects');
      setProjects(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleReview = async (projectId, status) => {
    try {
      const facultyFeedback = feedback[projectId] || '';
      await API.put(`/projects/${projectId}/review`, {
        status,
        facultyFeedback
      });
      fetchProjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to review project');
    }
  };

  const handleFeedbackChange = (projectId, value) => {
    setFeedback({ ...feedback, [projectId]: value });
  };

  const handleReviewInputChange = (projectId, field, value) => {
    setReviewInputs({
      ...reviewInputs,
      [projectId]: {
        ...(reviewInputs[projectId] || {}),
        [field]: value
      }
    });
  };

  const handleScheduleReview = async (event, projectId) => {
    event.preventDefault();
    const reviewData = reviewInputs[projectId] || {};
    if (!reviewData.title || !reviewData.scheduledFor) {
      setError('Please provide a review title and date.');
      return;
    }

    try {
      await API.post(`/projects/${projectId}/reviews`, reviewData);
      setReviewInputs({
        ...reviewInputs,
        [projectId]: { title: '', scheduledFor: '', notes: '' }
      });
      fetchProjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule review');
    }
  };

  const visibleProjects = projects.filter((project) => {
    const matchesStatus = statusFilter === 'ALL' || project.status === statusFilter;
    const searchable = [project.topicName, project.projectId, project.leader?.name].filter(Boolean).join(' ').toLowerCase();
    return matchesStatus && searchable.includes(search.trim().toLowerCase());
  });
  const totalProjects = projects.length;
  const pendingCount = projects.filter(p => ['PENDING', 'ASSIGNED'].includes(p.status)).length;
  const approvedCount = projects.filter(p => p.status === 'APPROVED').length;
  const rejectedCount = projects.filter(p => p.status === 'REJECTED').length;
  const activeProjects = projects
    .filter((project) => project.status === 'APPROVED'
      && (project.progressSummary?.completed || 0) < (project.progressSummary?.total || 0))
    .sort((first, second) => new Date(second.updatedAt) - new Date(first.updatedAt));
  const topActiveProjects = activeProjects.slice(0, 2);

  return (
    <>
      <Sidebar />
      {loading ? (
        <div className="dashboard-loading">Loading faculty panel...</div>
      ) : (
        <div className="dashboard-page mentor-dashboard">
      <h2 style={{ color: 'var(--text-h)', marginBottom: '20px' }}>Faculty / Mentor Dashboard</h2>

      {error && (
        <div role="alert" className="students-error" style={{ marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <p className="mentor-intro">Overview of your assigned projects and activities</p>
      <section className="mentor-stats" aria-label="Project summary">
        {[{ label: 'Total Projects', count: totalProjects, Icon: FolderOpen, tone: 'total' },
          { label: 'Project submissions', count: pendingCount, Icon: Clock, tone: 'pending' },
          { label: 'Approved', count: approvedCount, Icon: CircleCheck, tone: 'approved' },
          { label: 'Rejected', count: rejectedCount, Icon: CircleX, tone: 'rejected' }].map(({label, count, Icon, tone}) => (
          <article className={'mentor-stat ' + tone} key={label}>
            <span className="mentor-stat-icon"><Icon size={30} aria-hidden="true" /></span>
            <div><p>{label}</p><strong>{count}</strong></div>
          </article>
        ))}
      </section>
      <section className="mentor-active-projects">
        <div className="mentor-active-heading">
          <div>
            <p className="project-kicker">Progress at a glance</p>
            <h3>Active project trackers</h3>
          </div>
          <a href="#mentor-project-list">See more</a>
        </div>
        {topActiveProjects.length === 0 ? (
          <p>No approved projects are currently in progress.</p>
        ) : (
          <div className="mentor-active-grid">
            {topActiveProjects.map((project) => (
              <article className="mentor-active-card" key={project._id}>
                <Link to={`/projects/${project._id}`} className="mentor-active-title">
                  {project.topicName}
                </Link>
                <small>{project.projectId}</small>
                <MilestoneProgress
                  completed={project.progressSummary?.completed || 0}
                  total={project.progressSummary?.total || 0}
                />
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="mentor-toolbar" id="mentor-project-list" aria-label="Project filters">
        <h3><FolderOpen size={24} aria-hidden="true" /> Projects</h3>
        <label className="mentor-search"><Search size={18} aria-hidden="true" /><input aria-label="Search projects" placeholder="Search projects..." value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <select aria-label="Filter projects by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="ALL">All projects</option>
          <option value="DRAFT">Draft</option>
          <option value="PENDING">Pending</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
      </section>
      <div className="mentor-project-grid">
      {visibleProjects.length === 0 ? (
        <p>{projects.length === 0 ? 'No projects submitted yet.' : 'No projects match your search.'}</p>
      ) : (
        visibleProjects.map((project) => (
          <article key={project._id} className="mentor-project-card">
            <header className="mentor-card-heading">
              <span className="mentor-project-icon"><FolderOpen size={30} aria-hidden="true" /></span>
              <div>
                <h3><Link to={`/projects/${project._id}`}>{project.topicName}</Link></h3>
                <p>{project.projectId}</p>
              </div>
              <span className={'mentor-status ' + project.status.toLowerCase()}>{project.status}</span>
            </header>
            <div className="mentor-card-meta">
              <span><Users size={16} aria-hidden="true" /> {(project.leader ? 1 : 0) + (project.members || []).filter(member => member.status === 'ACCEPTED').length} members</span>
              <span>Leader · {project.leader?.name || 'Unassigned'}</span>
            </div>
            <details className="mentor-project-details">
              <summary>View details & review</summary>            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: 'var(--muted-text)' }}>
                  <strong>Project ID:</strong> {project.projectId}
                </p>
                <h4 style={{ margin: '0 0 6px 0', color: 'var(--text-h)', fontSize: '18px' }}>{project.topicName}</h4>
                <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--muted-text)' }}>
                  <strong>Leader:</strong> {project.leader?.name || 'N/A'}
                  {project.leader?.rollNumber ? ` (${project.leader.rollNumber})` : ''}
                </p>
                <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--muted-text)' }}>
                  <strong>Team Leader:</strong> {project.leader?.email || 'N/A'}
                </p>
                {(project.members || []).filter((member) => member.status === 'ACCEPTED').map((member) => (
                  <p key={member.student._id} style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--muted-text)' }}>
                    <strong>Team Member:</strong> {member.student.name} ({member.student.email})
                  </p>
                ))}
                {project.reportFile && <ProjectReportDownload project={project} />}
                {project.reportFilePath && (
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
                    <a href={project.reportFilePath} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
                      Open Submitted Project Link
                    </a>
                  </p>
                )}
              </div>
              <span style={{
                padding: '4px 10px',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 'bold',
                backgroundColor: project.status === 'APPROVED'
                  ? '#16a34a'
                  : project.status === 'REJECTED'
                    ? '#dc2626'
                    : project.status === 'ASSIGNED' ? 'var(--accent)' : '#d97706'
              }}>
                {project.status}
              </span>
            </div>

            {['PENDING', 'ASSIGNED'].includes(project.status) && <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: 'var(--text-h)' }}>
                Faculty Feedback & Instructions
              </label>
              <textarea
                rows="2"
                placeholder="Write feedback or revision details for the student group..."
                value={feedback[project._id] !== undefined ? feedback[project._id] : project.facultyFeedback || ''}
                onChange={(e) => handleFeedbackChange(project._id, e.target.value)}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid var(--border)', borderRadius: '4px', marginBottom: '10px' }}
              />
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleReview(project._id, 'APPROVED')}
                  style={{ padding: '8px 16px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Approve Project
                </button>
                <button
                  onClick={() => handleReview(project._id, 'REJECTED')}
                  style={{ padding: '8px 16px', backgroundColor: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Reject Project
                </button>
              </div>
            </div>}

            {project.status === 'APPROVED' && (
              <>
                <div style={{ marginTop: '16px', padding: '16px', border: '1px solid var(--border)', borderRadius: '6px', backgroundColor: 'var(--accent-bg)' }}>
                  <h5 style={{ margin: '0 0 12px 0', color: 'var(--text-h)', fontSize: '15px' }}>Schedule Student Review</h5>
                  <form onSubmit={(event) => handleScheduleReview(event, project._id)}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <input
                        type="text"
                        required
                        placeholder="Review title"
                        value={reviewInputs[project._id]?.title || ''}
                        onChange={(event) => handleReviewInputChange(project._id, 'title', event.target.value)}
                        style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }}
                      />
                      <input
                        type="datetime-local"
                        required
                        value={reviewInputs[project._id]?.scheduledFor || ''}
                        onChange={(event) => handleReviewInputChange(project._id, 'scheduledFor', event.target.value)}
                        style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '4px' }}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Notification message (optional)"
                      value={reviewInputs[project._id]?.notes || ''}
                      onChange={(event) => handleReviewInputChange(project._id, 'notes', event.target.value)}
                      style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid var(--border)', borderRadius: '4px', marginBottom: '10px' }}
                    />
                    <button type="submit" style={{ padding: '8px 14px', backgroundColor: '#7c9cf5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Schedule Review
                    </button>
                  </form>
                  {project.reviewSchedules?.length > 0 && (
                    <div style={{ marginTop: '14px' }}>
                      <strong style={{ fontSize: '13px', color: 'var(--text-h)' }}>Scheduled reviews</strong>
                      {project.reviewSchedules.map((review) => (
                        <p key={review._id} style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--muted-text)' }}>
                          {review.title} - {new Date(review.scheduledFor).toLocaleString()}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
            </details>
          </article>
        ))
      )}
      </div>
        </div>
      )}
    </>
  );
};

export default MentorDashboard;