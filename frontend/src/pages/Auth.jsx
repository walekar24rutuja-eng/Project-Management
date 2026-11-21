import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, GraduationCap, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const dashboardForRole = {
  STUDENT: '/student-dashboard',
  MENTOR: '/mentor-dashboard',
  ADMIN: '/admin-dashboard'
};

const roles = [
  { value: 'STUDENT', label: 'Student', Icon: GraduationCap },
  { value: 'MENTOR', label: 'Mentor', Icon: UserRound },
  { value: 'ADMIN', label: 'Admin', Icon: ShieldCheck }
];

const Auth = () => {
  const navigate = useNavigate();
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <div className="auth-page">
      <section className="auth-showcase">
        <div className="auth-brand">Project Hub</div>
        <p className="auth-kicker">Made for your campus</p>
        <h1 className="auth-display">
          Big ideas.
          <em>Built together.</em>
        </h1>
        <p className="auth-tagline">Plan your project. Meet your mentor. Ship every milestone.</p>
        <figure className="auth-hero">
          <div className="auth-hero-image" />
          <figcaption className="auth-hero-caption">Great work starts with a team.</figcaption>
        </figure>
      </section>

      <section className="auth-panel">
        <p className="auth-kicker auth-kicker-accent">Your projects, organised</p>
        <h2 className="auth-title">{isLogin ? 'Welcome back.' : 'Join Project Hub.'}</h2>
        <p className="auth-subtitle">
          {isLogin ? 'Log in to your account.' : 'Create your student account.'}
        </p>

        {isLogin && (
          <div className="auth-roles" role="radiogroup" aria-label="Account type">
            {roles.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={role === value}
                className={`auth-role ${role === value ? 'active' : ''}`}
                onClick={() => setRole(value)}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </div>
        )}

        {error && <div role="alert" className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <label className="auth-field">
                <span>Full name <i>*</i></span>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="Your full name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
              <label className="auth-field">
                <span>Roll number <i>*</i></span>
                <input
                  type="text"
                  required
                  placeholder="e.g. 21CS042"
                  value={rollNumber}
                  onChange={(event) => setRollNumber(event.target.value)}
                />
              </label>
            </>
          )}

          <label className="auth-field">
            <span>Email address <i>*</i></span>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@college.edu"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className="auth-field">
            <span>Password <i>*</i></span>
            <div className="auth-password">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                placeholder="Your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="auth-password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </label>

          <button type="submit" className="auth-submit">
            {isLogin ? 'Log in' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          {isLogin ? 'New to Project Hub?' : 'Already have an account?'}
          <button type="button" onClick={toggleMode}>
            {isLogin ? 'Create an account' : 'Log in'}
          </button>
        </p>

        <p className="auth-legal">
          By continuing, you agree to your institution's academic and data-use guidelines.
        </p>
      </section>
    </div>
  );
};

export default Auth;
