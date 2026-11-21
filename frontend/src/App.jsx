import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import StudentDashboard from './pages/StudentDashboard';
import MentorDashboard from './pages/MentorDashboard';
import Meetings from './pages/Meetings';
import StudentList from './pages/StudentList';
import AdminDashboard from './pages/AdminDashboard';
import Notifications from './pages/Notifications';
import ProjectDetails from './pages/ProjectDetails';
import MentorReviews from './pages/MentorReviews';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <div style={{ minHeight: '100vh' }}>
        <Routes>
          {/* Redirect root URL to /auth */}
          <Route path="/" element={<Navigate to="/auth" replace />} />

          {/* Combined Login & Registration Page */}
          <Route path="/auth" element={<Auth />} />

          {/* Student & Mentor Role-Based Dashboards */}
          <Route path="/student-dashboard" element={
            <ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>
          } />
          <Route path="/mentor-dashboard" element={
            <ProtectedRoute allowedRoles={['MENTOR']}><MentorDashboard /></ProtectedRoute>
          } />
          <Route path="/mentor/reviews" element={
            <ProtectedRoute allowedRoles={['MENTOR']}><MentorReviews /></ProtectedRoute>
          } />
          <Route path="/admin-dashboard" element={
            <ProtectedRoute allowedRoles={['ADMIN']}><AdminDashboard /></ProtectedRoute>
          } />
          <Route path="/meetings" element={
            <ProtectedRoute allowedRoles={['STUDENT', 'MENTOR']}><Meetings /></ProtectedRoute>
          } />
          <Route path="/students" element={
            <ProtectedRoute allowedRoles={['MENTOR']}><StudentList /></ProtectedRoute>
          } />
          <Route path="/notifications" element={
            <ProtectedRoute allowedRoles={['STUDENT', 'MENTOR']}><Notifications /></ProtectedRoute>
          } />
          <Route path="/projects/:projectId" element={
            <ProtectedRoute allowedRoles={['STUDENT', 'MENTOR']}><ProjectDetails /></ProtectedRoute>
          } />

          {/* Fallback route for unmatched paths */}
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;