import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../services/api';
import Sidebar from '../components/Sidebar';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const response = await API.get('/projects/notifications');
        setNotifications(response.data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Failed to load notifications');
      } finally {
        setLoading(false);
      }
    };
    loadNotifications();
  }, []);

  const markRead = async (notification) => {
    if (notification.read) return;
    try {
      const response = await API.put(`/projects/notifications/${notification._id}/read`);
      setNotifications((current) => current.map((item) => (
        item._id === response.data._id ? response.data : item
      )));
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to update notification');
    }
  };

  return (
    <>
      <Sidebar />
      {loading ? (
        <div className="dashboard-loading">Loading notifications...</div>
      ) : (
        <main className="dashboard-page student-team-page">
          <h2>Notifications</h2>
          <p>Project assignments, reports, milestone updates, and scheduled reviews.</p>

          {error && <div role="alert" className="students-error">{error}</div>}

          <section className="student-panel">
            {notifications.length === 0 ? (
              <p>You have no notifications yet.</p>
            ) : notifications.map((notification) => (
              <article
                key={notification._id}
                className={`student-notification${notification.read ? '' : ' notification-unread'}`}
              >
                <strong>{notification.title}</strong>
                <p>{notification.message}</p>
                <small>{new Date(notification.scheduledFor).toLocaleString()}</small>
                <div className="notification-actions">
                  {notification.path && (
                    <Link to={notification.path} onClick={() => markRead(notification)}>Open update</Link>
                  )}
                  {!notification.read && (
                    <button type="button" onClick={() => markRead(notification)}>Mark as read</button>
                  )}
                </div>
              </article>
            ))}
          </section>
        </main>
      )}
    </>
  );
};

export default Notifications;
