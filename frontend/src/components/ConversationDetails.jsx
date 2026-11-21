import React, { useState, useMemo } from 'react';
import { useSocket } from '../context/SocketContext';
import { 
  XIcon, 
  HashIcon, 
  AtSignIcon, 
  UsersIcon, 
  BellIcon, 
  CopyIcon, 
  CheckIcon,
  DownloadIcon,
  FileTextIcon,
  ImageIcon
} from './Icons';
import PresenceBadge from './PresenceBadge';

const avatarEmojiMap = {
  'avatar-1': '⚡',
  'avatar-2': '🚀',
  'avatar-3': '🎨',
  'avatar-4': '👾',
  'avatar-5': '🔥'
};

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const ConversationDetails = () => {
  const { activeChat, roomMembers, messages, setShowDetails } = useSocket();
  const [copied, setCopied] = useState(false);
  const [notificationsMuted, setNotificationsMuted] = useState(false);

  const isDirect = activeChat.type === 'direct';

  // Gather all shared files from current conversation
  const sharedMedia = useMemo(() => {
    return messages
      .filter(m => m.fileUrl && !m.isDeleted)
      .reverse(); // Most recent first
  }, [messages]);

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(window.location.origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="details-panel">
      {/* Details Header */}
      <div className="details-header">
        <h3 className="details-title">
          {isDirect ? 'Direct Profile' : 'Channel Details'}
        </h3>
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
        {/* Hero Info */}
        <div className="details-hero">
          <div className="details-hero-avatar">
            {isDirect ? (
              <span style={{ fontSize: '2rem' }}>
                {avatarEmojiMap[activeChat.targetUser?.avatar] || '👤'}
              </span>
            ) : (
              <HashIcon size={28} />
            )}
          </div>
          <h2 className="details-hero-name">
            {isDirect ? `@${activeChat.name}` : `#${activeChat.name}`}
          </h2>
          <p className="details-hero-topic">
            {isDirect ? 'Active Community Member' : 'Real-time collaboration stream'}
          </p>
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

        {/* Room Members Section (Only for public rooms) */}
        {!isDirect && (
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
                      <span className="member-status">Online in #{activeChat.name}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Direct Contact Profile Info (When in DM) */}
        {isDirect && (
          <div className="details-section">
            <div className="details-section-header">
              <span className="details-section-title">CONTACT INFORMATION</span>
            </div>
            <div className="details-meta-item">
              <span className="details-meta-label">Handle</span>
              <span className="details-meta-value">@{activeChat.name}</span>
            </div>
            <div className="details-meta-item">
              <span className="details-meta-label">Status</span>
              <span className="details-meta-value">Available for messaging</span>
            </div>
            <div className="details-meta-item">
              <span className="details-meta-label">Room ID</span>
              <span className="details-meta-value" style={{ fontSize: '0.65rem' }}>{activeChat.id}</span>
            </div>
          </div>
        )}

        {/* Shared Files & Media */}
        <div className="details-section">
          <div className="details-section-header">
            <span className="details-section-title">
              SHARED MEDIA ({sharedMedia.length})
            </span>
          </div>

          {sharedMedia.length === 0 ? (
            <div className="details-empty-media">
              <span>📎</span>
              <p>No media files shared in this chat yet.</p>
            </div>
          ) : (
            <div className="shared-media-list">
              {sharedMedia.map((m, idx) => (
                <div key={m._id || idx} className="shared-media-card">
                  <div className="shared-media-icon">
                    {m.fileType === 'image' ? (
                      <img src={m.fileUrl} alt="Thumbnail" className="shared-thumb" />
                    ) : (
                      <FileTextIcon size={20} />
                    )}
                  </div>
                  <div className="shared-media-meta">
                    <span className="shared-media-name" title={m.fileName}>
                      {m.fileName || 'Attachment'}
                    </span>
                    <span className="shared-media-sub">
                      {formatFileSize(m.fileSize)} • @{m.sender?.username}
                    </span>
                  </div>
                  <a
                    href={m.fileUrl}
                    download={m.fileName || 'file'}
                    className="icon-btn shared-download-btn"
                    title="Download"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <DownloadIcon size={15} />
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Security & Architecture Metadata */}
        <div className="details-section">
          <div className="details-section-header">
            <span className="details-section-title">SECURITY & ARCHITECTURE</span>
          </div>
          <div className="details-meta-item">
            <span className="details-meta-label">Type</span>
            <span className="details-meta-value">{isDirect ? 'Direct 1-on-1' : 'Multi-Client Room'}</span>
          </div>
          <div className="details-meta-item">
            <span className="details-meta-label">Protocol</span>
            <span className="details-meta-value">Socket.io 4.7 (WSS)</span>
          </div>
          <div className="details-meta-item">
            <span className="details-meta-label">Persistence</span>
            <span className="details-meta-value">MongoDB / Dual-Store</span>
          </div>
          <div className="details-meta-item">
            <span className="details-meta-label">Storage</span>
            <span className="details-meta-value">Multer Safe Disk Storage</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default ConversationDetails;
