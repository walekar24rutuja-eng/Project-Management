import React, { useCallback, useEffect, useState } from 'react';
import API from '../services/api';
import Sidebar from '../components/Sidebar';
import { DEPARTMENTS } from '../constants/departments';

const AdminDashboard = () => {
  const [overview, setOverview] = useState({
    students: [],
    mentors: [],
    projects: [],
    unassignedProjects: []
  });
  const [mentorForm, setMentorForm] = useState({ name: '', email: '', password: '', department: '' });
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
      setMentorForm({ name: '', email: '', password: '', department: '' });
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

  const handleChangeDepartment = async (student, department) => {
    if (!department || department === student.department) return;
    setError('');
    try {
      await API.put(`/admin/students/${student._id}/department`, { department });
      setMessage(`Department updated for ${student.name}.`);
      await loadOverview();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to update department');
    }
  };

  const handleDeleteStudent = async (student) => {
    const confirmed = window.confirm(
      `Delete ${student.name}'s account permanently? This also deletes any projects they lead. This cannot be undone.`
    );
    if (!confirmed) return;

    setError('');
    try {
      await API.delete(`/admin/students/${student._id}`);
      setMessage(`${student.name}'s account was deleted.`);
      await loadOverview();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to delete student account');
    }
  };

  const handleDeleteProject = async (project) => {
    const confirmed = window.confirm(
      `Delete project "${project.topicName}" (${project.projectId}) permanently? This cannot be undone.`
    );
    if (!confirmed) return;

    setError('');
    try {
      await API.delete(`/admin/projects/${encodeURIComponent(project.projectId)}`);
      setMessage(`Project ${project.projectId} was deleted.`);
      await loadOverview();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to delete project');
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
              <label>
                Department
                <select
                  required
                  value={mentorForm.department}
                  onChange={(event) => setMentorForm({ ...mentorForm, department: event.target.value })}
                >
                  <option value="" disabled>Select department</option>
                  {DEPARTMENTS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
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
              {overview.projects.map((project) => {
                const leaderDepartment = project.leader?.department;
                const eligibleMentors = leaderDepartment
                  ? overview.mentors.filter((mentor) => mentor.department === leaderDepartment)
                  : overview.mentors;
                return (
                <article className="admin-project-row" key={project.projectId}>
                  <div>
                    <strong>{project.topicName}</strong>
                    <small>
                      {project.projectId} · {project.status} · Leader: {project.leader?.name || 'Unknown'}
                      {leaderDepartment ? ` (${leaderDepartment})` : ''}
                    </small>
                  </div>
                  <label>
                    Assigned mentor
                    <select
                      value={project.assignedMentor?._id || ''}
                      onChange={(event) => handleAssignMentor(project, event.target.value)}
                    >
                      <option value="">Unassigned</option>
                      {eligibleMentors.map((mentor) => (
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
                  <button
                    type="button"
                    className="admin-danger-button"
                    onClick={() => handleDeleteProject(project)}
                  >
                    Delete project
                  </button>
                </article>
                );
              })}
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
                      <small>
                        {student.email}
                        {student.rollNumber ? ` · ${student.rollNumber}` : ''}
                        {student.department ? ` · ${student.department}` : ''}
                      </small>
                    </div>
                    <span>
                      {studentProjects.length
                        ? studentProjects.map((project) => `${project.projectId}: ${project.topicName}`).join(' | ')
                        : 'No project'}
                    </span>
                    <div className="admin-student-actions">
                      <label>
                        Department
                        <select
                          value={student.department || ''}
                          onChange={(event) => handleChangeDepartment(student, event.target.value)}
                        >
                          <option value="" disabled>Select department</option>
                          {DEPARTMENTS.map(({ value, label }) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        className="admin-danger-button"
                        onClick={() => handleDeleteStudent(student)}
                      >
                        Delete account
                      </button>
                    </div>
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
                    {mentor.name} ({mentor.email}){mentor.department ? ` · ${mentor.department}` : ''} — {assignedCount} assigned project{assignedCount === 1 ? '' : 's'}
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
