import React, { useCallback, useState, useEffect } from 'react';
import API from '../services/api';
import Sidebar from '../components/Sidebar';
import ProjectReportDownload from '../components/ProjectReportDownload';

const ProjectTaskSection = ({ projectId }) => {
  const [tasks, setTasks] = useState([]);

  const loadTasks = useCallback(async () => {
    try {
      const res = await API.get(`/projects/${projectId}/tasks`);
      setTasks(res.data);
    } catch (err) {
      console.error(err);
    }
  }, [projectId]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleToggleStatus = async (taskId, currentCompleted) => {
    try {
      await API.put(`/projects/tasks/${taskId}/status`, {
        completed: !currentCompleted
      });
      loadTasks();
    } catch (err) {
      console.error('Failed to update task status', err);
    }
  };

  if (tasks.length === 0) return null;

  return (
    <div style={{ marginTop: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px' }}>
      <h5 style={{ margin: '0 0 10px 0', color: '#334155' }}>Assigned Milestones & Student Responses</h5>
      {tasks.map((task) => (
        <div key={task._id} style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', marginBottom: '6px' }}>
            <div>
              <strong>{task.title}</strong>
              <span style={{ marginLeft: '10px', color: task.completed ? '#16a34a' : '#d97706', fontWeight: 'bold' }}>
                ({task.completed ? 'Completed' : 'Pending'})
              </span>
            </div>
            <button
              onClick={() => handleToggleStatus(task._id, task.completed)}
              style={{
                padding: '4px 10px',
                backgroundColor: task.completed ? '#64748b' : '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              {task.completed ? 'Mark as Incomplete' : 'Mark as Completed'}
            </button>
          </div>
          {task.description && <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#64748b' }}>{task.description}</p>}
          {task.studentFollowUp && (
            <div style={{ marginTop: '6px', padding: '8px', backgroundColor: '#eff6ff', borderRadius: '4px', borderLeft: '3px solid #2563eb' }}>
              <strong style={{ fontSize: '12px', color: '#1e3a8a' }}>Student Follow-up:</strong>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#1e293b' }}>{task.studentFollowUp}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const MentorDashboard = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({});
  const [taskInputs, setTaskInputs] = useState({});
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

  const handleAssignTask = async (e, projectId) => {
    e.preventDefault();
    const taskData = taskInputs[projectId] || {};
    if (!taskData.title || !taskData.deadline) {
      alert('Please provide a title and deadline for the task.');
      return;
    }

    try {
      await API.post(`/projects/${projectId}/tasks`, taskData);
      alert('Task assigned successfully!');
      setTaskInputs({
        ...taskInputs,
        [projectId]: { title: '', description: '', deadline: '' }
      });
      fetchProjects();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign task');
    }
  };

  const handleFeedbackChange = (projectId, value) => {
    setFeedback({ ...feedback, [projectId]: value });
  };

  const handleTaskInputChange = (projectId, field, value) => {
    setTaskInputs({
      ...taskInputs,
      [projectId]: {
        ...(taskInputs[projectId] || {}),
        [field]: value
      }
    });
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

  const totalProjects = projects.length;
  const pendingCount = projects.filter(p => ['PENDING', 'ASSIGNED'].includes(p.status)).length;
  const approvedCount = projects.filter(p => p.status === 'APPROVED').length;
  const rejectedCount = projects.filter(p => p.status === 'REJECTED').length;

  return (
    <>
      <Sidebar />
      {loading ? (
        <div className="dashboard-loading">Loading faculty panel...</div>
      ) : (
        <div className="dashboard-page" style={{ maxWidth: '900px', padding: '20px', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#1e293b', marginBottom: '20px' }}>Faculty / Mentor Dashboard</h2>

      {error && (
        <div style={{ padding: '10px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ padding: '16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#fff' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b' }}>Total Projects</p>
          <h3 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>{totalProjects}</h3>
        </div>
        <div style={{ padding: '16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#fff' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b' }}>Pending Reviews</p>
          <h3 style={{ margin: 0, fontSize: '24px', color: '#d97706' }}>{pendingCount}</h3>
        </div>
        <div style={{ padding: '16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#fff' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b' }}>Approved</p>
          <h3 style={{ margin: 0, fontSize: '24px', color: '#16a34a' }}>{approvedCount}</h3>
        </div>
        <div style={{ padding: '16px', border: '1px solid #cbd5e1', borderRadius: '8px', backgroundColor: '#fff' }}>
          <p style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#64748b' }}>Rejected</p>
          <h3 style={{ margin: 0, fontSize: '24px', color: '#dc2626' }}>{rejectedCount}</h3>
        </div>
      </div>

      <h3 style={{ color: '#334155', marginBottom: '16px' }}>Project Submissions</h3>
      {projects.length === 0 ? (
        <p style={{ color: '#64748b' }}>No projects submitted yet.</p>
      ) : (
        projects.map((project) => (
          <div key={project._id} style={{ border: '1px solid #cbd5e1', borderRadius: '8px', padding: '20px', marginBottom: '20px', backgroundColor: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <p style={{ margin: '0 0 4px 0', fontSize: '12px', color: '#64748b' }}>
                  <strong>Project ID:</strong> {project.projectId}
                </p>
                <h4 style={{ margin: '0 0 6px 0', color: '#1e293b', fontSize: '18px' }}>{project.topicName}</h4>
                <p style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#475569' }}>
                  <strong>Leader:</strong> {project.leader?.name || 'N/A'}
                  {project.leader?.rollNumber ? ` (${project.leader.rollNumber})` : ''}
                </p>
                <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#64748b' }}>
                  <strong>Team Leader:</strong> {project.leader?.email || 'N/A'}
                </p>
                {(project.members || []).filter((member) => member.status === 'ACCEPTED').map((member) => (
                  <p key={member.student._id} style={{ margin: '0 0 4px 0', fontSize: '13px', color: '#64748b' }}>
                    <strong>Team Member:</strong> {member.student.name} ({member.student.email})
                  </p>
                ))}
                {project.reportFile && <ProjectReportDownload project={project} />}
                {project.reportFilePath && (
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px' }}>
                    <a href={project.reportFilePath} target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb', textDecoration: 'underline' }}>
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
                    : project.status === 'ASSIGNED' ? '#2563eb' : '#d97706'
              }}>
                {project.status}
              </span>
            </div>

            {['PENDING', 'ASSIGNED'].includes(project.status) && <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '6px', color: '#334155' }}>
                Faculty Feedback & Instructions
              </label>
              <textarea
                rows="2"
                placeholder="Write feedback or revision details for the student group..."
                value={feedback[project._id] !== undefined ? feedback[project._id] : project.facultyFeedback || ''}
                onChange={(e) => handleFeedbackChange(project._id, e.target.value)}
                style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '10px' }}
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
                <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1', backgroundColor: '#f8fafc', padding: '16px', borderRadius: '6px' }}>
                  <h5 style={{ margin: '0 0 12px 0', color: '#334155', fontSize: '15px' }}>Assign New Project Task</h5>
                  <form onSubmit={(e) => handleAssignTask(e, project._id)}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <input
                        type="text"
                        placeholder="Task Title"
                        value={taskInputs[project._id]?.title || ''}
                        onChange={(e) => handleTaskInputChange(project._id, 'title', e.target.value)}
                        style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                      />
                      <input
                        type="date"
                        value={taskInputs[project._id]?.deadline || ''}
                        onChange={(e) => handleTaskInputChange(project._id, 'deadline', e.target.value)}
                        style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Task Instructions / Notes (Optional)"
                      value={taskInputs[project._id]?.description || ''}
                      onChange={(e) => handleTaskInputChange(project._id, 'description', e.target.value)}
                      style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '10px' }}
                    />
                    <button
                      type="submit"
                      style={{ padding: '8px 14px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                      Assign Task
                    </button>
                  </form>
                </div>
                <div style={{ marginTop: '16px', padding: '16px', border: '1px solid #d9e2ff', borderRadius: '6px', backgroundColor: '#f8faff' }}>
                  <h5 style={{ margin: '0 0 12px 0', color: '#334155', fontSize: '15px' }}>Schedule Student Review</h5>
                  <form onSubmit={(event) => handleScheduleReview(event, project._id)}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                      <input
                        type="text"
                        required
                        placeholder="Review title"
                        value={reviewInputs[project._id]?.title || ''}
                        onChange={(event) => handleReviewInputChange(project._id, 'title', event.target.value)}
                        style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                      />
                      <input
                        type="datetime-local"
                        required
                        value={reviewInputs[project._id]?.scheduledFor || ''}
                        onChange={(event) => handleReviewInputChange(project._id, 'scheduledFor', event.target.value)}
                        style={{ padding: '8px', border: '1px solid #cbd5e1', borderRadius: '4px' }}
                      />
                    </div>
                    <input
                      type="text"
                      placeholder="Notification message (optional)"
                      value={reviewInputs[project._id]?.notes || ''}
                      onChange={(event) => handleReviewInputChange(project._id, 'notes', event.target.value)}
                      style={{ width: '100%', padding: '8px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '4px', marginBottom: '10px' }}
                    />
                    <button type="submit" style={{ padding: '8px 14px', backgroundColor: '#7c9cf5', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                      Schedule Review
                    </button>
                  </form>
                  {project.reviewSchedules?.length > 0 && (
                    <div style={{ marginTop: '14px' }}>
                      <strong style={{ fontSize: '13px', color: '#334155' }}>Scheduled reviews</strong>
                      {project.reviewSchedules.map((review) => (
                        <p key={review._id} style={{ margin: '6px 0 0', fontSize: '13px', color: '#64748b' }}>
                          {review.title} - {new Date(review.scheduledFor).toLocaleString()}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <ProjectTaskSection projectId={project._id} />
              </>
            )}
          </div>
        ))
      )}
        </div>
      )}
    </>
  );
};

export default MentorDashboard;