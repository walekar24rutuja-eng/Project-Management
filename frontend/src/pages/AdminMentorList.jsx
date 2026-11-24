import React, { useCallback, useEffect, useState } from 'react';
import API from '../services/api';
import Sidebar from '../components/Sidebar';

const AdminMentorList = () => {
  const [overview, setOverview] = useState({ mentors: [], projects: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadOverview = useCallback(async () => {
    try {
      const response = await API.get('/admin/overview');
      setOverview(response.data);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load mentor accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOverview(); }, [loadOverview]);

  const handleDeleteMentor = async (mentor) => {
    const assignedCount = overview.projects.filter(
      (project) => project.assignedMentor?._id === mentor._id
    ).length;
    const confirmed = window.confirm(
      `Delete ${mentor.name}'s mentor account permanently?${assignedCount ? ` This will unassign them from ${assignedCount} project${assignedCount === 1 ? '' : 's'}.` : ''} This cannot be undone.`
    );
    if (!confirmed) return;
    setError('');
    try {
      await API.delete(`/admin/mentors/${mentor._id}`);
      setMessage(`${mentor.name}'s mentor account was deleted.`);
      await loadOverview();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to delete mentor account');
    }
  };

  if (loading) {
    return <><Sidebar /><div className="dashboard-loading">Loading mentor accounts...</div></>;
  }

  return (
    <>
      <Sidebar />
      <main className="dashboard-page admin-dashboard">
        <h2>Mentor Accounts</h2>
        <p>Review assigned projects and permanently delete mentor accounts.</p>
        {error && <div role="alert" className="students-error">{error}</div>}
        {message && <div role="status" className="student-success">{message}</div>}
        <section className="student-panel">
          <h3>Mentors ({overview.mentors.length})</h3>
          {overview.mentors.length === 0 ? <p>No mentor accounts yet.</p> : (
            <div className="admin-student-list">
              {overview.mentors.map((mentor) => {
                const assignedCount = overview.projects.filter(
                  (project) => project.assignedMentor?._id === mentor._id
                ).length;
                return (
                  <article className="admin-student-row" key={mentor._id}>
                    <div>
                      <strong>{mentor.name}</strong>
                      <small>{mentor.email}{mentor.department ? ` · ${mentor.department}` : ''}</small>
                    </div>
                    <span>{assignedCount} assigned project{assignedCount === 1 ? '' : 's'}</span>
                    <button type="button" className="admin-danger-button" onClick={() => handleDeleteMentor(mentor)}>Delete account</button>
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

export default AdminMentorList;
