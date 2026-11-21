import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../services/api';
import Sidebar from '../components/Sidebar';
import './StudentDashboard.css';
import ProjectReportDownload from '../components/ProjectReportDownload';
import MilestoneProgress from '../components/MilestoneProgress';
import { useAuth } from '../context/AuthContext';

const StudentDashboard = () => {
  const notificationPreviewCount = 3;
  const navigate = useNavigate();
  const { user, updateProfile } = useAuth();
  const [projects, setProjects] = useState([]);
  const [requests, setRequests] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [topicName, setTopicName] = useState('');
  const [preferredMentor, setPreferredMentor] = useState('');
  const [joinProjectId, setJoinProjectId] = useState('');
  const [submissionLinks, setSubmissionLinks] = useState({});
  const [rollNumber, setRollNumber] = useState(user?.rollNumber || '');

  const fetchStudentData = useCallback(async () => {
    try {
      const [projectResponse, requestResponse, mentorResponse, notificationResponse] = await Promise.all([
        API.get('/projects'),
        API.get('/projects/my-requests'),
        API.get('/auth/mentors'),
        API.get('/projects/notifications')
      ]);
      const loadedProjects = projectResponse.data;
      setProjects(loadedProjects);
      setRequests(requestResponse.data);
      setMentors(mentorResponse.data);
      setNotifications(notificationResponse.data);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load student data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudentData();
    const timer = setInterval(async () => {
      try {
        const response = await API.get('/projects/notifications');
        setNotifications(response.data);
      } catch (requestError) {
        console.error('Failed to refresh notifications', requestError);
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [fetchStudentData]);

  const activeProject = projects.find((project) => project.status !== 'APPROVED');
  const canStartProject = !activeProject;
  const needsRollNumber = !user?.rollNumber?.trim();

  const handleSaveRollNumber = async (event) => {
    event.preventDefault();
    try {
      await updateProfile({ rollNumber });
      setMessage('Roll number saved to your profile.');
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to save your roll number');
    }
  };

  const handleCreateProject = async (event) => {
    event.preventDefault();
    try {
      const response = await API.post('/projects', { topicName, preferredMentor: preferredMentor || null });
      setTopicName('');
      setPreferredMentor('');
      setMessage(`Project created. Share this project ID with your team: ${response.data.projectId}`);
      await fetchStudentData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to create project');
    }
  };

  const handleJoinProject = async (event) => {
    event.preventDefault();
    try {
      const response = await API.post('/projects/join', { projectId: joinProjectId });
      setJoinProjectId('');
      setMessage(response.data.message);
      await fetchStudentData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to request project membership');
    }
  };

  const handleProjectSubmission = async (event, project) => {
    event.preventDefault();
    try {
      await API.put(`/projects/${project._id}/${project.status === 'REJECTED' ? 'resubmit' : 'submit'}`, {
        reportFilePath: submissionLinks[project._id] || project.reportFilePath,
        topicName: project.topicName
      });
      setMessage('Project link submitted to the assigned mentor.');
      await fetchStudentData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to submit project link');
    }
  };

  const handleJoinDecision = async (project, studentId, status) => {
    try {
      await API.put(`/projects/${project._id}/members/${studentId}`, { status });
      setMessage(`Join request ${status.toLowerCase()}.`);
      await fetchStudentData();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to process join request');
    }
  };

  return (
    <>
      <Sidebar />
      {loading ? (
        <div className="dashboard-loading">Loading student portal...</div>
      ) : (
        <main className="dashboard-page student-team-page">
          <h2>Student Dashboard</h2>
          <p>Signed in as {user?.name || user?.email}</p>

          <div className="student-desktop-layout">
          <div className="student-workspace">
          {error && <div role="alert" className="students-error">{error}</div>}
          {message && <div role="status" className="student-success">{message}</div>}

          {needsRollNumber && (
            <section className="student-panel">
              <h3>Complete your student profile</h3>
              <p>A roll number is required to create a project, join a team, or submit project work.</p>
              <form className="student-form" onSubmit={handleSaveRollNumber}>
                <label>
                  Roll Number
                  <input
                    required
                    value={rollNumber}
                    onChange={(event) => setRollNumber(event.target.value)}
                  />
                </label>
                <button type="submit">Save roll number</button>
              </form>
            </section>
          )}

          {notifications.length > 0 && (
            <section className="student-panel">
              <h3>Review Notifications</h3>
              {notifications.slice(0, notificationPreviewCount).map((notification) => (
                <article key={notification._id} className="student-notification">
                  <strong>{notification.title}</strong>
                  <p>{notification.message}</p>
                  <small>{new Date(notification.scheduledFor).toLocaleString()}</small>
                </article>
              ))}
              {notifications.length > notificationPreviewCount && (
                <button
                  type="button"
                  className="student-notifications-toggle"
                  onClick={() => navigate('/notifications')}
                >
                  See more ({notifications.length - notificationPreviewCount})
                </button>
              )}
            </section>
          )}

          {activeProject && (
            <p className="student-project-notice">
              You are currently in an ongoing project. You can start or join another project after a mentor approves it.
            </p>
          )}

          {requests.length > 0 && (
            <section className="student-panel">
              <h3>My join requests</h3>
              {requests.map((request) => (
                <p key={`${request.projectId}-${request.requestedAt}`}>
                  <strong>{request.topicName}</strong> ({request.projectId}): {request.status.toLowerCase()}
                </p>
              ))}
            </section>
          )}

          <section className="student-project-list">
            <h3>My projects</h3>
            {projects.length === 0 ? (
              <p>No projects yet. Use the project sidebar to create a project or request to join one.</p>
            ) : projects.map((project) => {
              const isLeader = project.leader?._id === user?.id || project.leader?._id === user?._id;
              const pendingMembers = isLeader
                ? (project.members || []).filter((member) => member.status === 'PENDING')
                : [];
              const teamMembers = [
                project.leader,
                ...(project.members || [])
                  .filter((member) => member.status === 'ACCEPTED')
                  .map((member) => member.student)
              ].filter(Boolean);

              return (
                <article className="student-panel student-project-card" key={project._id}>
                  <header className="student-project-heading">
                    <div>
                      <small>Project ID: <strong>{project.projectId}</strong></small>
                      <h4>{project.topicName}</h4>
                    </div>
                    <span className={`status-${project.status.toLowerCase()}`}>{project.status}</span>
                  </header>
                  {project.status === 'APPROVED' && project.progressSummary && (
                    <MilestoneProgress
                      completed={project.progressSummary.completed}
                      total={project.progressSummary.total}
                    />
                  )}
                  <button type="button" onClick={() => navigate(`/projects/${project._id}`)}>
                    View project details
                  </button>
                  <p>Team leader: {project.leader?.name || project.leader?.email || 'Unknown'}</p>
                  <p>Assigned mentor: {project.assignedMentor?.name || 'Awaiting admin assignment'}</p>
                  {project.preferredMentor && (
                    <p>Preferred mentor: {project.preferredMentor.name}</p>
                  )}
                  <div className="student-team-members">
                    <strong>Team members</strong>
                    <ul>
                      {teamMembers.map((member) => (
                        <li key={member._id}>{member.name} ({member.email})</li>
                      ))}
                    </ul>
                  </div>
                  {project.reportFile && <ProjectReportDownload project={project} />}
                  {project.reportFilePath && (
                    <p><a href={project.reportFilePath} target="_blank" rel="noopener noreferrer">Open submitted project link</a></p>
                  )}
                  {project.facultyFeedback && <p><strong>Mentor feedback:</strong> {project.facultyFeedback}</p>}

                  {isLeader && ['DRAFT', 'REJECTED'].includes(project.status) && (
                    <form className="student-form" onSubmit={(event) => handleProjectSubmission(event, project)}>
                      <label>
                        {project.status === 'REJECTED' ? 'Resubmit project link' : 'Submit project link'}
                        <input
                          required
                          type="url"
                          placeholder="https://..."
                          value={submissionLinks[project._id] ?? project.reportFilePath ?? ''}
                          onChange={(event) => setSubmissionLinks({
                            ...submissionLinks,
                            [project._id]: event.target.value
                          })}
                        />
                      </label>
                      <button type="submit">
                        {project.status === 'REJECTED' ? 'Resubmit to mentor' : 'Submit to mentor'}
                      </button>
                    </form>
                  )}

                  {isLeader && pendingMembers.length > 0 && (
                    <section className="join-request-list">
                      <h5>Membership requests</h5>
                      {pendingMembers.map((member) => (
                        <div className="join-request" key={member.student._id}>
                          <span>{member.student.name} ({member.student.email})</span>
                          <button type="button" onClick={() => handleJoinDecision(project, member.student._id, 'ACCEPTED')}>
                            Approve
                          </button>
                          <button type="button" onClick={() => handleJoinDecision(project, member.student._id, 'REJECTED')}>
                            Reject
                          </button>
                        </div>
                      ))}
                    </section>
                  )}
                </article>
              );
            })}
          </section>

          </div>
          {canStartProject && !needsRollNumber && (
            <aside className="student-project-options student-actions-sidebar" aria-label="Create or join a project">
              <article className="student-panel">
                <h3>Create a project</h3>
                <p>You will be its leader and receive a stable project ID to share with your team.</p>
                <form onSubmit={handleCreateProject} className="student-form">
                  <label>
                    Project topic
                    <input
                      required
                      value={topicName}
                      onChange={(event) => setTopicName(event.target.value)}
                    />
                  </label>
                  <label>
                    Preferred mentor
                    <select
                      value={preferredMentor}
                      onChange={(event) => setPreferredMentor(event.target.value)}
                    >
                      <option value="">No preference</option>
                      {mentors.map((mentor) => (
                        <option key={mentor._id} value={mentor._id}>
                          {mentor.name} ({mentor.email})
                        </option>
                      ))}
                    </select>
                  </label>
                  <button type="submit">Create project and get ID</button>
                </form>
              </article>

              <article className="student-panel">
                <h3>Join a project</h3>
                <p>Enter a project ID to send a request. Membership starts only after the leader accepts.</p>
                <form onSubmit={handleJoinProject} className="student-form">
                  <label>
                    Project ID
                    <input
                      required
                      value={joinProjectId}
                      onChange={(event) => setJoinProjectId(event.target.value.toUpperCase())}
                      placeholder="PRJ-..."
                    />
                  </label>
                  <button type="submit">Request to join</button>
                </form>
              </article>
            </aside>
          )}

          </div>
        </main>
      )}
    </>
  );
};

export default StudentDashboard;
