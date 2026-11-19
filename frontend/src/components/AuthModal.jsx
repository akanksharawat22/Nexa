import React, { useState } from 'react';

const avatarPresets = [
  { id: 'avatar-1', icon: '⚡', label: 'Pulse' },
  { id: 'avatar-2', icon: '🚀', label: 'Rocket' },
  { id: 'avatar-3', icon: '🎨', label: 'Design' },
  { id: 'avatar-4', icon: '👾', label: 'Cyber' },
  { id: 'avatar-5', icon: '🔥', label: 'Blaze' }
];

const AuthModal = ({ onJoin }) => {
  const [username, setUsername] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState('avatar-1');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = username.trim();
    if (!cleanName) {
      setError('Please enter a display handle or username');
      return;
    }
    if (cleanName.length < 2) {
      setError('Username must be at least 2 characters');
      return;
    }
    if (cleanName.length > 20) {
      setError('Username cannot exceed 20 characters');
      return;
    }

    onJoin({
      username: cleanName,
      avatar: selectedAvatar
    });
  };

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-brand-logo">💬</div>
          <h1 className="auth-title">Welcome to PulseChat</h1>
          <p className="auth-subtitle">Real-Time Messaging & Distributed Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="auth-username-input">Choose Your Handle</label>
            <input
              id="auth-username-input"
              type="text"
              className="form-input auth-input"
              placeholder="e.g. sarah_dev"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError('');
              }}
              autoFocus
              maxLength={20}
              required
            />
            {error && <span className="auth-error-msg">{error}</span>}
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

          <button type="submit" className="primary-btn auth-submit-btn">
            Enter Workspace ⚡
          </button>

          <p className="auth-footer-note">
            💡 Connect instantly with WebSocket synchronization and channel rooms.
          </p>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
