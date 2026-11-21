import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { NexaLogoIcon } from './Icons';

const avatarPresets = [
  { id: 'avatar-1', icon: '⚡', label: 'Nexa' },
  { id: 'avatar-2', icon: '🚀', label: 'Rocket' },
  { id: 'avatar-3', icon: '🎨', label: 'Design' },
  { id: 'avatar-4', icon: '👾', label: 'Cyber' },
  { id: 'avatar-5', icon: '🔥', label: 'Blaze' }
];

const AuthModal = () => {
  const { loginUser, registerUser } = useSocket();

  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('avatar-1');
  const [bio, setBio] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanUsername = username.trim().toLowerCase();
    if (!cleanUsername) {
      setError('Username is required');
      return;
    }

    if (!password) {
      setError('Password is required');
      return;
    }

    setIsSubmitting(true);

    if (mode === 'login') {
      const res = await loginUser({
        username: cleanUsername,
        password
      });
      setIsSubmitting(false);
      if (!res.success) {
        setError(res.error || 'Login failed');
      }
    } else {
      if (password.length < 6) {
        setIsSubmitting(false);
        setError('Password must be at least 6 characters');
        return;
      }

      const res = await registerUser({
        username: cleanUsername,
        password,
        displayName: displayName.trim() || cleanUsername,
        avatar: selectedAvatar,
        bio: bio.trim() || undefined
      });
      setIsSubmitting(false);
      if (!res.success) {
        setError(res.error || 'Registration failed');
      }
    }
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-brand-logo" style={{ display: 'flex', justifyContent: 'center' }}>
            <NexaLogoIcon size={56} />
          </div>
          <h1 className="auth-title">Welcome to Nexa</h1>
          <p className="auth-subtitle">Connect. Communicate. Collaborate.</p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setError('');
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`auth-tab-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setError('');
            }}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="form-error-banner">{error}</div>}

          {/* Username */}
          <div className="form-group">
            <label htmlFor="auth-username-input">Username</label>
            <input
              id="auth-username-input"
              type="text"
              className="form-input"
              placeholder="e.g. alex_dev"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              maxLength={30}
              required
            />
          </div>

          {/* Additional fields for Registration */}
          {mode === 'register' && (
            <>
              <div className="form-group">
                <label htmlFor="auth-display-name">Display Name (Optional)</label>
                <input
                  id="auth-display-name"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Alex Rivera"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={40}
                />
              </div>

              <div className="form-group">
                <label>Select Avatar Persona</label>
                <div className="auth-avatar-grid">
                  {avatarPresets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className={`avatar-choice-btn ${selectedAvatar === preset.id ? 'active' : ''}`}
                      onClick={() => setSelectedAvatar(preset.id)}
                      title={preset.label}
                      aria-label={`Select ${preset.label} avatar`}
                    >
                      <span className="avatar-choice-emoji">{preset.icon}</span>
                      <span className="avatar-choice-label">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Password */}
          <div className="form-group">
            <label htmlFor="auth-password-input">Password</label>
            <input
              id="auth-password-input"
              type="password"
              className="form-input"
              placeholder={mode === 'register' ? 'At least 6 characters' : 'Enter your password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === 'register' ? 6 : 1}
            />
          </div>

          {/* Submit Button */}
          <button 
            type="submit" 
            className="primary-btn auth-submit-btn"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Authenticating...'
              : mode === 'login'
              ? 'Sign In ⚡'
              : 'Create Account 🚀'}
          </button>

          <p className="auth-footer-note">
            🔒 Protected by JWT authentication and bcrypt password hashing.
          </p>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
