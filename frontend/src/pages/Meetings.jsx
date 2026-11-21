import React, { useEffect, useState } from 'react';
import API from '../services/api';
import Sidebar from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';

const Meetings = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ projectId: '', title: '', scheduledFor: '', notes: '' });

  const loadMeetings = async () => {
    const response = await API.get('/projects');
    setProjects(response.data);
    const scheduledMeetings = response.data.flatMap((project) =>
      (project.reviewSchedules || []).map((review) => ({
        ...review,
        projectDbId: project._id,
        projectId: project.projectId,
        projectName: project.topicName,
        studentEmail: project.leader?.email,
      }))
    );
    scheduledMeetings.sort((first, second) => new Date(first.scheduledFor) - new Date(second.scheduledFor));
    setMeetings(scheduledMeetings);
  };

  useEffect(() => {
    const fetchMeetings = async () => {
      try {
        await loadMeetings();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load meetings');
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, []);

  const handleScheduleMeeting = async (event) => {
    event.preventDefault();
    try {
      await API.post(`/projects/${form.projectId}/reviews`, {
        title: form.title,
        scheduledFor: form.scheduledFor,
        notes: form.notes
      });
      setForm({ projectId: '', title: '', scheduledFor: '', notes: '' });
      setError('');
      await loadMeetings();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule meeting');
    }
  };

  const handleDeleteMeeting = async (meeting) => {
    if (!window.confirm(`Delete the meeting "${meeting.title}"?`)) return;

    try {
      await API.delete(`/projects/${meeting.projectDbId}/reviews/${meeting._id}`);
      setError('');
      await loadMeetings();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete meeting');
    }
  };

  return (
    <>
      <Sidebar />
      <main className="dashboard-page meetings-page">
        <h2>Meetings</h2>
        <p className="meetings-intro">Scheduled project reviews and faculty meetings.</p>

        {user?.role === 'MENTOR' && (
          <section className="meeting-scheduler">
            <h3>Schedule a meeting</h3>
            <form onSubmit={handleScheduleMeeting}>
              <select
                required
                value={form.projectId}
                onChange={(event) => setForm({ ...form, projectId: event.target.value })}
              >
                <option value="">Select a student project</option>
                {projects.map((project) => (
                  <option key={project._id} value={project._id}>
                    {project.topicName} - {project.leader?.email || 'Student'}
                  </option>
                ))}
              </select>
              <input
                required
                type="text"
                placeholder="Meeting title"
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
              <input
                required
                type="datetime-local"
                value={form.scheduledFor}
                onChange={(event) => setForm({ ...form, scheduledFor: event.target.value })}
              />
              <input
                type="text"
                placeholder="Message for the student (optional)"
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
              />
              <button type="submit">Schedule Meeting</button>
            </form>
          </section>
        )}

        {loading && <p>Loading meetings...</p>}
        {error && <div className="meetings-error">{error}</div>}
        {!loading && !error && meetings.length === 0 && (
          <div className="meetings-empty">
            <h3>No meetings scheduled</h3>
            <p>Scheduled project reviews will appear here.</p>
          </div>
        )}

        <div className="meetings-list">
          {meetings.map((meeting) => (
            <article className="meeting-card" key={meeting._id}>
              <div className="meeting-date">
                <strong>{new Date(meeting.scheduledFor).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</strong>
                <span>{new Date(meeting.scheduledFor).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</span>
              </div>
              <div>
                <h3>{meeting.title}</h3>
                <p>{meeting.projectName}</p>
                <small>Project ID: {meeting.projectId}</small>
                {meeting.studentEmail && <small>{meeting.studentEmail}</small>}
                {meeting.notes && <div className="meeting-notes">{meeting.notes}</div>}
              </div>
              {user?.role === 'MENTOR' && (
                <button
                  className="meeting-delete-button"
                  onClick={() => handleDeleteMeeting(meeting)}
                  type="button"
                >
                  Delete
                </button>
              )}
            </article>
          ))}
        </div>
      </main>
    </>
  );
};

export default Meetings;
