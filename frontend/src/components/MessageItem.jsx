import React, { useState } from 'react';
import { 
  CopyIcon, 
  CheckIcon, 
  CheckCheckIcon, 
  SmileIcon, 
  ReplyIcon, 
  EditIcon, 
  TrashIcon, 
  DownloadIcon,
  FileTextIcon,
  XIcon 
} from './Icons';
import { useSocket } from '../context/SocketContext';

const formatTimestamp = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const avatarEmojiMap = {
  'avatar-1': '⚡',
  'avatar-2': '🚀',
  'avatar-3': '🎨',
  'avatar-4': '👾',
  'avatar-5': '🔥',
  'system': '⚙️'
};

const POPULAR_REACTIONS = ['👍', '❤️', '🔥', '😂', '🚀', '👏'];

const MessageItem = ({ message, currentUser, onImageClick }) => {
  const { setReplyingTo, editMessage, deleteMessage, reactToMessage } = useSocket();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content || '');
  const [showReactPicker, setShowReactPicker] = useState(false);
  const [floatingEmoji, setFloatingEmoji] = useState(null);

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

  // Read status calculation
  const readers = message.readBy ? message.readBy.filter(r => r.username !== message.sender.username) : [];
  const isReadByOthers = readers.length > 0;
  const readTooltip = isReadByOthers 
    ? `Read by: ${readers.map(r => r.username).join(', ')}`
    : 'Delivered';

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard?.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleStartReply = () => {
    setReplyingTo(message);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editText.trim() && !message.fileUrl) return;
    editMessage(message._id, editText.trim());
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('Delete this message?')) {
      deleteMessage(message._id);
    }
  };

  const handleToggleReaction = (emoji) => {
    reactToMessage(message._id, emoji);
    setShowReactPicker(false);
    setFloatingEmoji(emoji);
    setTimeout(() => setFloatingEmoji(null), 900);
  };

  return (
    <div className={`message-row ${isSelf ? 'outgoing' : 'incoming'} ${message.isDeleted ? 'deleted-msg-row' : ''}`}>
      {!isSelf && (
        <div className="message-avatar-container">
          <span className="avatar-bubble" title={message.sender?.username}>
            {avatarSymbol}
          </span>
        </div>
      )}

      <div className="message-bubble-wrapper">
        {floatingEmoji && (
          <span className="floating-reaction-particle" aria-hidden="true">
            {floatingEmoji}
          </span>
        )}
        {!isSelf && (
          <div className="message-header">
            <span className="sender-username">{message.sender?.username || 'Anonymous'}</span>
          </div>
        )}

        <div className="message-bubble">
          {/* Quoted Reply Block */}
          {message.replyTo && (
            <div className="reply-quote-box">
              <span className="reply-quote-author">@{message.replyTo.senderUsername || 'Someone'}</span>
              <p className="reply-quote-text">{message.replyTo.content || 'Attached media'}</p>
            </div>
          )}

          {/* Media Attachment: Image */}
          {message.fileUrl && message.fileType === 'image' && !message.isDeleted && (
            <div className="message-image-attachment">
              <img
                src={message.fileUrl}
                alt={message.fileName || 'Image attachment'}
                className="message-image-preview"
                onClick={() => onImageClick && onImageClick(message.fileUrl)}
                loading="lazy"
              />
            </div>
          )}

          {/* Media Attachment: Document / File */}
          {message.fileUrl && message.fileType !== 'image' && !message.isDeleted && (
            <div className="message-file-card">
              <div className="file-icon-box">
                <FileTextIcon size={22} />
              </div>
              <div className="file-meta-box">
                <span className="file-name" title={message.fileName}>
                  {message.fileName || 'Attachment'}
                </span>
                <span className="file-size">
                  {formatFileSize(message.fileSize)}
                </span>
              </div>
              <a
                href={message.fileUrl}
                download={message.fileName || 'download'}
                className="file-download-btn"
                title="Download file"
                target="_blank"
                rel="noreferrer"
              >
                <DownloadIcon size={16} />
              </a>
            </div>
          )}

          {/* Inline Edit Mode or Message Text */}
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="inline-edit-form">
              <input
                type="text"
                className="inline-edit-input"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
              />
              <div className="inline-edit-actions">
                <button 
                  type="button" 
                  className="inline-btn cancel"
                  onClick={() => {
                    setIsEditing(false);
                    setEditText(message.content);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="inline-btn save">
                  Save
                </button>
              </div>
            </form>
          ) : (
            message.content && (
              <p className={`message-text ${message.isDeleted ? 'deleted-text' : ''}`}>
                {message.content}
              </p>
            )
          )}

          {/* Status Bar */}
          <div className="message-status-bar">
            {message.isEdited && !message.isDeleted && (
              <span className="edited-badge">(edited)</span>
            )}
            <span className="message-time">{formatTimestamp(message.timestamp)}</span>
            {isSelf && !message.isDeleted && (
              <span 
                className={`receipt-status ${isReadByOthers ? 'read-receipt-blue' : ''}`} 
                title={readTooltip}
              >
                <CheckCheckIcon size={14} />
              </span>
            )}
          </div>

          {/* Hover Action Bar */}
          {!isEditing && !message.isDeleted && (
            <div className="message-hover-actions">
              <button
                type="button"
                className="hover-action-btn"
                onClick={() => setShowReactPicker(prev => !prev)}
                title="React"
              >
                <SmileIcon size={14} />
              </button>

              <button
                type="button"
                className="hover-action-btn"
                onClick={handleStartReply}
                title="Reply"
              >
                <ReplyIcon size={14} />
              </button>

              {message.content && (
                <button
                  type="button"
                  className="hover-action-btn"
                  onClick={handleCopy}
                  title={copied ? "Copied!" : "Copy text"}
                >
                  {copied ? <CheckIcon size={13} /> : <CopyIcon size={13} />}
                </button>
              )}

              {isSelf && (
                <button
                  type="button"
                  className="hover-action-btn"
                  onClick={() => setIsEditing(true)}
                  title="Edit message"
                >
                  <EditIcon size={13} />
                </button>
              )}

              {isSelf && (
                <button
                  type="button"
                  className="hover-action-btn delete-action"
                  onClick={handleDelete}
                  title="Delete message"
                >
                  <TrashIcon size={13} />
                </button>
              )}
            </div>
          )}

          {/* Reaction Picker Popup */}
          {showReactPicker && (
            <div className="message-reaction-picker">
              {POPULAR_REACTIONS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  className="reaction-picker-emoji"
                  onClick={() => handleToggleReaction(emoji)}
                >
                  {emoji}
                </button>
              ))}
              <button
                type="button"
                className="reaction-picker-close"
                onClick={() => setShowReactPicker(false)}
              >
                <XIcon size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Reaction Badges List */}
        {message.reactions && message.reactions.length > 0 && !message.isDeleted && (
          <div className="message-reactions-row">
            {message.reactions.map(r => {
              const userHasReacted = currentUser && r.users.includes(currentUser.username);
              return (
                <button
                  key={r.emoji}
                  type="button"
                  className={`reaction-badge ${userHasReacted ? 'user-reacted' : ''}`}
                  onClick={() => handleToggleReaction(r.emoji)}
                  title={`${r.users.join(', ')} reacted with ${r.emoji}`}
                >
                  <span className="reaction-emoji">{r.emoji}</span>
                  <span className="reaction-count">{r.users.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageItem;
