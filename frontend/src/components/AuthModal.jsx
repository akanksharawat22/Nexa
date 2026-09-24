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
    if (!username.trim()) {
      setError('Please enter a valid username');
      return;
    }
    if (username.trim().length < 2) {
      setError('Username must be at least 2 characters');
      return;
    }

    onJoin({
      username: username.trim(),
      avatar: selectedAvatar
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h2>Welcome to PulseChat</h2>
          <p>Real-Time Distributed Messaging Platform</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="modal-input-group">
            <label>Choose Your Handle</label>
            <input
              type="text"
              className="modal-input"
              placeholder="e.g. alex_dev"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (error) setError('');
              }}
              autoFocus
              maxLength={20}
            />
            {error && <span style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px' }}>{error}</span>}
          </div>

          <div className="modal-input-group">
            <label>Select Avatar Persona</label>
            <div className="avatar-picker">
              {avatarPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`avatar-option ${selectedAvatar === preset.id ? 'selected' : ''}`}
                  onClick={() => setSelectedAvatar(preset.id)}
                  title={preset.label}
                >
                  {preset.icon}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" className="primary-btn">
            Enter Workspace 💬
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthModal;
