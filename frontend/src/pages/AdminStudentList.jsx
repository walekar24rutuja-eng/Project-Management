import React, { useCallback, useEffect, useState } from 'react';
import API from '../services/api';
import Sidebar from '../components/Sidebar';
import { DEPARTMENTS } from '../constants/departments';

const AdminStudentList = () => {
  const [overview, setOverview] = useState({ students: [], projects: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadOverview = useCallback(async () => {
    try {
      const response = await API.get('/admin/overview');
      setOverview(response.data);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load student accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

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

  if (loading) {
    return <><Sidebar /><div className="dashboard-loading">Loading student accounts...</div></>;
  }

  return (
    <>
      <Sidebar />
      <main className="dashboard-page admin-dashboard">
        <h2>Student Accounts</h2>
        <p>Manage student departments and permanently delete accounts.</p>
        {error && <div role="alert" className="students-error">{error}</div>}
        {message && <div role="status" className="student-success">{message}</div>}
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
                      <small>{student.email}{student.rollNumber ? ` · ${student.rollNumber}` : ''}{student.department ? ` · ${student.department}` : ''}</small>
                    </div>
                    <span>{studentProjects.length ? studentProjects.map((project) => `${project.projectId}: ${project.topicName}`).join(' | ') : 'No project'}</span>
                    <div className="admin-student-actions">
                      <label>Department
                        <select value={student.department || ''} onChange={(event) => handleChangeDepartment(student, event.target.value)}>
                          <option value="" disabled>Select department</option>
                          {DEPARTMENTS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                        </select>
                      </label>
                      <button type="button" className="admin-danger-button" onClick={() => handleDeleteStudent(student)}>Delete account</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </>
  );
};

export default AdminStudentList;
