import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const dashboardForRole = {
  STUDENT: '/student-dashboard',
  MENTOR: '/mentor-dashboard',
  ADMIN: '/admin-dashboard'
};

const Auth = () => {
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('STUDENT');
  const [rollNumber, setRollNumber] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      if (isLogin) {
        const response = await login(email, password, role);
        navigate(dashboardForRole[response.user.role] || '/auth');
      } else {
        await signup(name, email, password, rollNumber);
        navigate('/student-dashboard');
      }
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Authentication failed. Please try again.');
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
  };

  return (
    <div style={{ maxWidth: '420px', margin: '50px auto', padding: '28px', border: '1px solid #D9E2FF', borderRadius: '10px', fontFamily: 'sans-serif', backgroundColor: '#FFFFFF', boxShadow: '0 4px 6px -1px rgba(124,156,245,0.18)' }}>
      <h2 style={{ marginTop: 0, textAlign: 'center', color: '#334155' }}>
        {isLogin ? 'Sign In to Your Account' : 'Create Student Account'}
      </h2>

      {error && (
        <div role="alert" style={{ padding: '10px', backgroundColor: '#FDECEC', color: '#B45353', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {!isLogin && (
          <>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: '#334155' }}>
              Full Name
              <input
                type="text"
                required
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                style={{ display: 'block', width: '100%', marginTop: '4px', marginBottom: '14px', padding: '10px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              />
            </label>
            <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: '#334155' }}>
              Roll Number
              <input
                type="text"
                required
                value={rollNumber}
                onChange={(event) => setRollNumber(event.target.value)}
                style={{ display: 'block', width: '100%', marginTop: '4px', marginBottom: '14px', padding: '10px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px' }}
              />
            </label>
          </>
        )}

        <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: '#334155' }}>
          Email Address
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={{ display: 'block', width: '100%', marginTop: '4px', marginBottom: '14px', padding: '10px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px' }}
          />
        </label>

        <label style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: '#334155' }}>
          Password
          <input
            type="password"
            required
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={{ display: 'block', width: '100%', marginTop: '4px', marginBottom: '14px', padding: '10px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px' }}
          />
        </label>

        {isLogin && (
          <label style={{ display: 'block', fontSize: '14px', marginBottom: '14px', color: '#334155' }}>
            Account Type
            <select
              value={role}
              onChange={(event) => setRole(event.target.value)}
              style={{ display: 'block', width: '100%', marginTop: '4px', padding: '10px', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: '6px' }}
            >
              <option value="STUDENT">Student</option>
              <option value="MENTOR">Faculty / Mentor</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </label>
        )}

        <button
          type="submit"
          style={{ width: '100%', padding: '12px', backgroundColor: '#2563eb', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px' }}
        >
          {isLogin ? 'Log In' : 'Create Account'}
        </button>
      </form>

      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#64748b' }}>
        {isLogin ? "Don't have an account? " : 'Already have an account? '}
        <button
          onClick={toggleMode}
          type="button"
          style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline', padding: 0 }}
        >
          {isLogin ? 'Register' : 'Log In'}
        </button>
      </div>
    </div>
  );
};

export default Auth;
