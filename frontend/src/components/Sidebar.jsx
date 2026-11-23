import React from 'react';
import { Bell, CalendarDays, ClipboardCheck, LayoutDashboard, LogOut, Trash2, Users } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const { user, logout, deleteAccount } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const dashboardPath = {
    ADMIN: '/admin-dashboard',
    MENTOR: '/mentor-dashboard',
    STUDENT: '/student-dashboard'
  }[user?.role] || '/auth';

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      'Delete your account permanently? This action cannot be undone.'
    );
    if (!confirmed) return;

    try {
      await deleteAccount();
      navigate('/auth');
    } catch (error) {
      window.alert(error.response?.data?.message || 'Failed to delete account');
    }
  };

  return (
    <>
      <header className="content-brand-header">
        <img
          className="content-brand-logo"
          src="/images/login-hero.jpg"
          alt="Government College of Engineering Aurangabad, Chhatrapati Sambhajinagar logo"
        />
        <div className="content-brand-text">
          <strong>Government College of Engineering Aurangabad, Chhatrapati Sambhajinagar</strong>
          <span>( An Autonomous Institute of Government of Maharashtra )</span>
        </div>
      </header>

      <aside className="sidebar">
        <div className="sidebar-brand">
          <strong>Project Hub</strong>
          <span>Project management system</span>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <button
            className={`sidebar-link ${location.pathname === dashboardPath ? 'active' : ''}`}
            onClick={() => navigate(dashboardPath)}
          >
            <LayoutDashboard size={18} />
            Dashboard
          </button>
          {user?.role !== 'ADMIN' && (
            <button
              className={`sidebar-link ${location.pathname === '/meetings' ? 'active' : ''}`}
              onClick={() => navigate('/meetings')}
            >
              <CalendarDays size={18} />
              Meetings
            </button>
          )}
          {user?.role === 'STUDENT' && (
            <button
              className={`sidebar-link ${location.pathname === '/notifications' ? 'active' : ''}`}
              onClick={() => navigate('/notifications')}
            >
              <Bell size={18} />
              Notifications
            </button>
          )}
          {user?.role === 'MENTOR' && (
            <>
              <button
                className={`sidebar-link ${location.pathname === '/mentor/reviews' ? 'active' : ''}`}
                onClick={() => navigate('/mentor/reviews')}
              >
                <ClipboardCheck size={18} />
                Milestone reviews
              </button>
              <button
                className={`sidebar-link ${location.pathname === '/notifications' ? 'active' : ''}`}
                onClick={() => navigate('/notifications')}
              >
                <Bell size={18} />
                Updates
              </button>
            </>
          )}
          {user?.role === 'MENTOR' && (
            <button
              className={`sidebar-link ${location.pathname === '/students' ? 'active' : ''}`}
              onClick={() => navigate('/students')}
            >
              <Users size={18} />
              Students
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          {user && (
            <div className="sidebar-user">
              <div className="sidebar-avatar">{user.email?.charAt(0).toUpperCase()}</div>
              <div className="sidebar-user-details">
                <strong>{user.name || user.email}</strong>
                <span>
                  {user.role === 'ADMIN' ? 'Administrator' : user.role === 'MENTOR' ? 'Faculty / Mentor' : 'Student'}
                </span>
              </div>
            </div>
          )}
          <button className="sidebar-logout" onClick={handleLogout}>
            <LogOut size={17} />
            Logout
          </button>
          {user?.role !== 'ADMIN' && (
            <button className="sidebar-delete-account" onClick={handleDeleteAccount}>
              <Trash2 size={16} />
              Delete account
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
