import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import PresenceBadge from './PresenceBadge';
import * as api from '../services/api';

const avatarEmojiMap = {
  'avatar-1': '⚡',
  'avatar-2': '🚀',
  'avatar-3': '🎨',
  'avatar-4': '👾',
  'avatar-5': '🔥'
};

const Sidebar = () => {
  const { currentRoom, switchRoom, user, onlineUsers, isConnected } = useSocket();
  const [rooms, setRooms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomTopic, setNewRoomTopic] = useState('');

  const loadRooms = async () => {
    const list = await api.fetchRooms();
    setRooms(list);
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    const res = await api.createRoom({
      name: newRoomName.trim(),
      topic: newRoomTopic.trim() || 'Custom Channel'
    });

    if (res.success) {
      await loadRooms();
      switchRoom(res.data.name);
      setShowCreateModal(false);
      setNewRoomName('');
      setNewRoomTopic('');
    } else {
      alert(res.error || 'Failed to create room');
    }
  };

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-logo">
          <div className="logo-icon">💬</div>
          <span className="brand-name">PulseChat</span>
        </div>
        <div 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '6px', 
            fontSize: '0.75rem', 
            color: isConnected ? '#10b981' : '#f59e0b',
            background: 'rgba(255,255,255,0.05)',
            padding: '4px 8px',
            borderRadius: '12px'
          }}
          title={isConnected ? 'Connected to Socket.io' : 'Connecting...'}
        >
          <span 
            style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              background: isConnected ? '#10b981' : '#f59e0b' 
            }} 
          />
          {isConnected ? 'LIVE' : 'SYNCING'}
        </div>
      </div>

      {/* Channels Section */}
      <div className="sidebar-section">
        <div className="section-title">
          <span>CHANNELS ({rooms.length})</span>
          <button 
            className="add-room-btn" 
            onClick={() => setShowCreateModal(true)} 
            title="Create Channel"
          >
            +
          </button>
        </div>
        <div className="room-list">
          {rooms.map((room) => (
            <div
              key={room._id || room.name}
              className={`room-item ${currentRoom === room.name ? 'active' : ''}`}
              onClick={() => switchRoom(room.name)}
            >
              <span className="room-hash">#</span>
              <span>{room.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Online Users Section */}
      <div className="sidebar-section" style={{ flex: 1, overflowY: 'auto' }}>
        <div className="section-title">
          <span>ONLINE USERS ({onlineUsers.length})</span>
        </div>
        <div className="user-list">
          {onlineUsers.map((u, idx) => (
            <div key={u.username || idx} className="user-item">
              <div className="user-avatar-wrapper">
                <div className="user-avatar">
                  {avatarEmojiMap[u.avatar] || '👤'}
                </div>
                <PresenceBadge status={u.status || 'online'} />
              </div>
              <span className="user-name">
                {u.username}
                {user && u.username === user.username && <span className="user-self-tag">(You)</span>}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Profile Footer */}
      {user && (
        <div className="user-profile-footer">
          <div className="user-avatar-wrapper">
            <div className="user-avatar">
              {avatarEmojiMap[user.avatar] || '⚡'}
            </div>
            <PresenceBadge status="online" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{user.username}</span>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Active Member</span>
          </div>
        </div>
      )}

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '380px' }}>
            <div className="modal-header">
              <h2>Create New Channel</h2>
            </div>
            <form onSubmit={handleCreateRoom} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="modal-input-group">
                <label>Channel Name</label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="e.g. dev-discussions"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="modal-input-group">
                <label>Topic / Description</label>
                <input
                  type="text"
                  className="modal-input"
                  placeholder="e.g. Engineering and Architecture"
                  value={newRoomTopic}
                  onChange={(e) => setNewRoomTopic(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="primary-btn"
                  style={{ background: '#334155' }}
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
