import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './pages/Auth';
import StudentDashboard from './pages/StudentDashboard';
import MentorDashboard from './pages/MentorDashboard';
import Meetings from './pages/Meetings';
import StudentList from './pages/StudentList';
import AdminDashboard from './pages/AdminDashboard';
import ReportSubmissions from './pages/ReportSubmissions';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFF' }}>
        <Routes>
          {/* Redirect root URL to /auth */}
          <Route path="/" element={<Navigate to="/auth" replace />} />

          {/* Combined Login & Registration Page */}
          <Route path="/auth" element={<Auth />} />

          {/* Student & Mentor Role-Based Dashboards */}
          <Route path="/student-dashboard" element={
            <ProtectedRoute allowedRoles={['STUDENT']}><StudentDashboard /></ProtectedRoute>
          } />
          <Route path="/report-submissions" element={
            <ProtectedRoute allowedRoles={['STUDENT']}><ReportSubmissions /></ProtectedRoute>
          } />
          <Route path="/mentor-dashboard" element={
            <ProtectedRoute allowedRoles={['MENTOR']}><MentorDashboard /></ProtectedRoute>
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

          {/* Fallback route for unmatched paths */}
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;