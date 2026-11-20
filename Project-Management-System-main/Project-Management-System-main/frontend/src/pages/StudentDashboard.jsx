import React, { useCallback, useEffect, useMemo, useState } from 'react';
import API from '../services/api';
import Sidebar from '../components/Sidebar';
import ProjectReportDownload from '../components/ProjectReportDownload';
import { useAuth } from '../context/AuthContext';

const StudentDashboard = () => {
  const notificationPreviewCount = 3;
  const { user, updateProfile } = useAuth();
  const [projects, setProjects] = useState([]);
  const [requests, setRequests] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notificationsExpanded, setNotificationsExpanded] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [topicName, setTopicName] = useState('');
  const [preferredMentor, setPreferredMentor] = useState('');
  const [joinProjectId, setJoinProjectId] = useState('');
  const [submissionLinks, setSubmissionLinks] = useState({});
  const [followUpTexts, setFollowUpTexts] = useState({});
  const [rollNumber, setRollNumber] = useState(user?.rollNumber || '');

  const loadTasks = useCallback(async (projectId) => {
    if (!projectId) {
      setTasks([]);
      return;
    }
    try {
      const response = await API.get(`/projects/${projectId}/tasks`);
      setTasks(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load project tasks');
      setTasks([]);
    }
  }, []);

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

      const nextProject = loadedProjects.find((project) => project.status !== 'APPROVED')
        || loadedProjects[0];
      setSelectedProjectId(nextProject?._id || '');
      if (nextProject?.status === 'APPROVED') {
        await loadTasks(nextProject._id);
      } else {
        setTasks([]);
      }
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load student data');
    } finally {
      setLoading(false);
    }
  }, [loadTasks]);

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

  const selectedProject = useMemo(
    () => projects.find((project) => project._id === selectedProjectId),
    [projects, selectedProjectId]
  );
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

  const handleFollowUp = async (taskId, existingValue) => {
    try {
      await API.put(`/projects/tasks/${taskId}/followup`, {
        studentFollowUp: followUpTexts[taskId] ?? existingValue ?? ''
      });
      setMessage('Follow-up saved.');
      await loadTasks(selectedProjectId);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to save follow-up');
    }
  };

  const handleSelectProject = async (project) => {
    setSelectedProjectId(project._id);
    setTasks([]);
    if (project.status === 'APPROVED') await loadTasks(project._id);
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
              {(notificationsExpanded
                ? notifications
                : notifications.slice(0, notificationPreviewCount)
              ).map((notification) => (
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
                  aria-expanded={notificationsExpanded}
                  onClick={() => setNotificationsExpanded((expanded) => !expanded)}
                >
                  {notificationsExpanded ? 'View less' : 'View more'}
                  {!notificationsExpanded && ` (${notifications.length - notificationPreviewCount})`}
                </button>
              )}
            </section>
          )}

          {canStartProject && !needsRollNumber && (
            <section className="student-project-options">
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
              <p>No projects yet. Create a project or request to join one above.</p>
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

          {projects.length > 1 && (
            <section className="student-panel">
              <label>
                Select project to view milestones
                <select
                  value={selectedProjectId}
                  onChange={(event) => {
                    const project = projects.find((item) => item._id === event.target.value);
                    if (project) handleSelectProject(project);
                  }}
                >
                  {projects.map((project) => (
                    <option key={project._id} value={project._id}>{project.topicName} — {project.status}</option>
                  ))}
                </select>
              </label>
            </section>
          )}

          {selectedProject?.status === 'APPROVED' && (
            <section className="student-panel">
              <h3>Milestones: {selectedProject.topicName}</h3>
              {tasks.length === 0 ? <p>No tasks assigned by the mentor yet.</p> : tasks.map((task) => (
                <article className="student-task" key={task._id}>
                  <h4>{task.title} {task.completed ? '(Completed)' : '(In progress)'}</h4>
                  <p>Due: {new Date(task.deadline).toLocaleDateString()}</p>
                  {task.description && <p>{task.description}</p>}
                  <label>
                    Progress follow-up
                    <textarea
                      rows="3"
                      value={followUpTexts[task._id] ?? task.studentFollowUp ?? ''}
                      onChange={(event) => setFollowUpTexts({
                        ...followUpTexts,
                        [task._id]: event.target.value
                      })}
                    />
                  </label>
                  <button type="button" onClick={() => handleFollowUp(task._id, task.studentFollowUp)}>
                    Save follow-up
                  </button>
                </article>
              ))}
            </section>
          )}
        </main>
      )}
    </>
  );
};

export default StudentDashboard;
