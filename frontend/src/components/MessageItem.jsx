import React from 'react';

const formatTimestamp = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const avatarEmojiMap = {
  'avatar-1': '⚡',
  'avatar-2': '🚀',
  'avatar-3': '🎨',
  'avatar-4': '👾',
  'avatar-5': '🔥',
  'system': '⚙️'
};

const MessageItem = ({ message, currentUser }) => {
  if (message.isSystem) {
    return (
      <div className="system-message">
        <span>{message.content}</span>
      </div>
    );
  }

  const isSelf = currentUser && message.sender?.username === currentUser.username;
  const avatarSymbol = avatarEmojiMap[message.sender?.avatar] || '👤';

  return (
    <div className={`message-item ${isSelf ? 'self' : 'other'}`}>
      <div className="message-avatar">
        {avatarSymbol}
      </div>
      <div className="message-content-wrapper">
        <div className="message-meta">
          <span className="sender-name">{message.sender?.username || 'Anonymous'}</span>
          <span className="message-time">{formatTimestamp(message.timestamp)}</span>
        </div>
        <div className="message-bubble">
          {message.content}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
