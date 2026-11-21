import React, { useCallback, useEffect, useState } from 'react';
import API from '../services/api';
import Sidebar from '../components/Sidebar';

const AdminDashboard = () => {
  const [overview, setOverview] = useState({
    students: [],
    mentors: [],
    projects: [],
    unassignedProjects: []
  });
  const [mentorForm, setMentorForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadOverview = useCallback(async () => {
    try {
      const response = await API.get('/admin/overview');
      setOverview(response.data);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load administration data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const handleCreateMentor = async (event) => {
    event.preventDefault();
    try {
      const response = await API.post('/admin/mentors', mentorForm);
      setMentorForm({ name: '', email: '', password: '' });
      setMessage(`Mentor account created for ${response.data.email}. Share the temporary password securely.`);
      await loadOverview();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to create mentor account');
    }
  };

  const handleAssignMentor = async (project, mentorId) => {
    try {
      await API.put(`/admin/projects/${encodeURIComponent(project.projectId)}/mentor`, {
        mentorId: mentorId || null
      });
      setMessage(`Mentor assignment updated for ${project.projectId}.`);
      await loadOverview();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to assign mentor');
    }
  };

  if (loading) {
    return (
      <>
        <Sidebar />
        <div className="dashboard-loading">Loading administration dashboard...</div>
      </>
    );
  }

  return (
    <>
      <Sidebar />
      <main className="dashboard-page admin-dashboard">
        <h2>Admin Dashboard</h2>
        <p>Manage students, mentor accounts, project assignments, and unassigned projects.</p>
        {error && <div role="alert" className="students-error">{error}</div>}
        {message && <div role="status" className="student-success">{message}</div>}

        <section className="student-project-options">
          <article className="student-panel">
            <h3>Create mentor account</h3>
            <p>Provide a temporary password to the mentor through a secure channel.</p>
            <form className="student-form" onSubmit={handleCreateMentor}>
              <label>
                Mentor name
                <input
                  required
                  value={mentorForm.name}
                  onChange={(event) => setMentorForm({ ...mentorForm, name: event.target.value })}
                />
              </label>
              <label>
                Email
                <input
                  required
                  type="email"
                  value={mentorForm.email}
                  onChange={(event) => setMentorForm({ ...mentorForm, email: event.target.value })}
                />
              </label>
              <label>
                Temporary password (at least 8 characters)
                <input
                  required
                  type="password"
                  minLength={8}
                  value={mentorForm.password}
                  onChange={(event) => setMentorForm({ ...mentorForm, password: event.target.value })}
                />
              </label>
              <button type="submit">Create mentor</button>
            </form>
          </article>
        </section>

        <section className="student-panel">
          <h3>Project mentor assignment</h3>
          <p>
            {overview.unassignedProjects.length} project{overview.unassignedProjects.length === 1 ? '' : 's'} currently unassigned.
          </p>
          {overview.projects.length === 0 ? <p>No projects have been created.</p> : (
            <div className="admin-project-list">
              {overview.projects.map((project) => (
                <article className="admin-project-row" key={project.projectId}>
                  <div>
                    <strong>{project.topicName}</strong>
                    <small>{project.projectId} · {project.status} · Leader: {project.leader?.name || 'Unknown'}</small>
                  </div>
                  <label>
                    Assigned mentor
                    <select
                      value={project.assignedMentor?._id || ''}
                      onChange={(event) => handleAssignMentor(project, event.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {overview.mentors.map((mentor) => (
                        <option key={mentor._id} value={mentor._id}>
                          {mentor.name} ({mentor.email})
                        </option>
                      ))}
                    </select>
                  </label>
                  {project.preferredMentor && (
                    <small>Student preference: {project.preferredMentor.name}</small>
                  )}
                  <small>
                    Team: {[project.leader, ...(project.members || [])
                      .filter((member) => member.status === 'ACCEPTED')
                      .map((member) => member.student)]
                      .filter(Boolean)
                      .map((student) => student.name)
                      .join(', ') || 'No members'}
                  </small>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="student-panel">
          <h3>Students ({overview.students.length})</h3>
          {overview.students.length === 0 ? <p>No student accounts yet.</p> : (
            <div className="admin-student-list">
              {overview.students.map((student) => {
                const studentProjects = overview.projects.filter((project) => (
                  project.leader?._id === student._id ||
                  (project.members || []).some((member) => (
                    member.status === 'ACCEPTED' && member.student?._id === student._id
                  ))
                ));
                return (
                  <article className="admin-student-row" key={student._id}>
                    <div>
                      <strong>{student.name}</strong>
                      <small>{student.email}{student.rollNumber ? ` · ${student.rollNumber}` : ''}</small>
                    </div>
                    <span>
                      {studentProjects.length
                        ? studentProjects.map((project) => `${project.projectId}: ${project.topicName}`).join(' | ')
                        : 'No project'}
                    </span>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="student-panel">
          <h3>Mentors ({overview.mentors.length})</h3>
          {overview.mentors.length === 0 ? <p>No mentor accounts yet.</p> : (
            <ul>
              {overview.mentors.map((mentor) => {
                const assignedCount = overview.projects.filter(
                  (project) => project.assignedMentor?._id === mentor._id
                ).length;
                return (
                  <li key={mentor._id}>
                    {mentor.name} ({mentor.email}) — {assignedCount} assigned project{assignedCount === 1 ? '' : 's'}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </>
  );
};

export default AdminDashboard;
