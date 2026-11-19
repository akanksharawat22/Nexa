import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { XIcon, HashIcon, UsersIcon, BellIcon, CopyIcon, CheckIcon } from './Icons';
import PresenceBadge from './PresenceBadge';

const avatarEmojiMap = {
  'avatar-1': '⚡',
  'avatar-2': '🚀',
  'avatar-3': '🎨',
  'avatar-4': '👾',
  'avatar-5': '🔥'
};

const ConversationDetails = () => {
  const { currentRoom, roomMembers, setShowDetails } = useSocket();
  const [copied, setCopied] = useState(false);
  const [notificationsMuted, setNotificationsMuted] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="details-panel">
      {/* Details Header */}
      <div className="details-header">
        <h3 className="details-title">Conversation Details</h3>
        <button
          className="icon-btn"
          onClick={() => setShowDetails(false)}
          title="Close details"
          aria-label="Close conversation details"
        >
          <XIcon size={18} />
        </button>
      </div>

      <div className="details-content">
        {/* Channel Hero Info */}
        <div className="details-hero">
          <div className="details-hero-avatar">
            <HashIcon size={28} />
          </div>
          <h2 className="details-hero-name">#{currentRoom}</h2>
          <p className="details-hero-topic">Real-time collaboration stream</p>
        </div>

        {/* Action Buttons */}
        <div className="details-actions">
          <button 
            className={`details-action-btn ${notificationsMuted ? 'active' : ''}`}
            onClick={() => setNotificationsMuted(prev => !prev)}
            title={notificationsMuted ? 'Unmute Notifications' : 'Mute Notifications'}
          >
            <BellIcon size={18} />
            <span>{notificationsMuted ? 'Muted' : 'Mute'}</span>
          </button>
          <button 
            className="details-action-btn"
            onClick={handleCopyLink}
            title="Copy Share Link"
          >
            {copied ? <CheckIcon size={18} /> : <CopyIcon size={18} />}
            <span>{copied ? 'Copied' : 'Share'}</span>
          </button>
        </div>

        {/* Room Members Section */}
        <div className="details-section">
          <div className="details-section-header">
            <div className="details-section-title">
              <UsersIcon size={16} />
              <span>ACTIVE MEMBERS ({roomMembers.length})</span>
            </div>
          </div>
          <div className="details-member-list">
            {roomMembers.length === 0 ? (
              <div className="details-empty-note">No other members currently in this room.</div>
            ) : (
              roomMembers.map((m, idx) => (
                <div key={m.socketId || idx} className="details-member-item">
                  <div className="avatar-wrapper">
                    <span className="member-avatar">
                      {avatarEmojiMap[m.avatar] || '👤'}
                    </span>
                    <PresenceBadge status="online" size="sm" />
                  </div>
                  <div className="member-info">
                    <span className="member-name">{m.username}</span>
                    <span className="member-status">Online in #{currentRoom}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Shared Files & Media Placeholder */}
        <div className="details-section">
          <div className="details-section-header">
            <span className="details-section-title">SHARED MEDIA & ATTACHMENTS</span>
          </div>
          <div className="details-empty-media">
            <span>📎</span>
            <p>No media files shared in #{currentRoom} yet.</p>
          </div>
        </div>

        {/* Channel Details Metadata */}
        <div className="details-section">
          <div className="details-section-header">
            <span className="details-section-title">ABOUT THIS CHANNEL</span>
          </div>
          <div className="details-meta-item">
            <span className="details-meta-label">Channel Identifier</span>
            <span className="details-meta-value">#{currentRoom}</span>
          </div>
          <div className="details-meta-item">
            <span className="details-meta-label">Encryption</span>
            <span className="details-meta-value">WebSocket Secure (WSS)</span>
          </div>
          <div className="details-meta-item">
            <span className="details-meta-label">Persistence</span>
            <span className="details-meta-value">MongoDB / Dual-Store</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default ConversationDetails;
