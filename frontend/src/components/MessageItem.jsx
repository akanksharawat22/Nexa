import React, { useState } from 'react';
import { CopyIcon, CheckIcon, CheckCheckIcon, SmileIcon } from './Icons';

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
  const [copied, setCopied] = useState(false);

  // System notification messages
  if (message.isSystem) {
    return (
      <div className="system-message-row">
        <span className="system-message-pill">
          {message.content}
        </span>
      </div>
    );
  }

  const isSelf = currentUser && message.sender?.username === currentUser.username;
  const avatarSymbol = avatarEmojiMap[message.sender?.avatar] || '👤';

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard?.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`message-row ${isSelf ? 'outgoing' : 'incoming'}`}>
      {!isSelf && (
        <div className="message-avatar-container">
          <span className="avatar-bubble" title={message.sender?.username}>
            {avatarSymbol}
          </span>
        </div>
      )}

      <div className="message-bubble-wrapper">
        {!isSelf && (
          <div className="message-header">
            <span className="sender-username">{message.sender?.username || 'Anonymous'}</span>
          </div>
        )}

        <div className="message-bubble">
          <p className="message-text">{message.content}</p>

          <div className="message-status-bar">
            <span className="message-time">{formatTimestamp(message.timestamp)}</span>
            {isSelf && (
              <span className="receipt-status" title="Delivered">
                <CheckCheckIcon size={14} />
              </span>
            )}
          </div>

          {/* Quick Hover Action Bar */}
          <div className="message-hover-actions">
            <button
              type="button"
              className="hover-action-btn"
              onClick={handleCopy}
              title={copied ? "Copied!" : "Copy text"}
            >
              {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
