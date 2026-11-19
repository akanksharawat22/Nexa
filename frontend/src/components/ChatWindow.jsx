import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import MessageItem from './MessageItem';
import TypingIndicator from './TypingIndicator';
import { 
  ArrowLeftIcon, 
  InfoIcon, 
  PaperclipIcon, 
  SmileIcon, 
  SendIcon, 
  HashIcon,
  UsersIcon,
  XIcon
} from './Icons';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '🚀', '😂', '🎉', '⚡', '👏', '👀', '💯'];

const ChatWindow = () => {
  const { 
    currentRoom, 
    messages, 
    roomMembers, 
    sendMessage, 
    sendTypingStatus, 
    typingUsers, 
    user,
    setMobileView,
    showDetails,
    setShowDetails
  } = useSocket();

  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachmentNotice, setAttachmentNotice] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  // Auto scroll to bottom smoothly
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingUsers]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputText(value);

    // Typing Lifecycle
    sendTypingStatus(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingStatus(false);
    }, 1500);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    sendMessage(inputText.trim());
    setInputText('');
    setShowEmojiPicker(false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendTypingStatus(false);

    // Keep input focused
    inputRef.current?.focus();
  };

  const handleInsertEmoji = (emoji) => {
    setInputText(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const handleAttachmentClick = () => {
    setAttachmentNotice(true);
    setTimeout(() => setAttachmentNotice(false), 2500);
  };

  return (
    <main className="chat-window">
      {/* Chat Window Header */}
      <header className="chat-header">
        <div className="header-left">
          {/* Mobile Back Button */}
          <button 
            className="mobile-back-btn icon-btn" 
            onClick={() => setMobileView('sidebar')}
            title="Back to Channels"
            aria-label="Back to channels"
          >
            <ArrowLeftIcon size={20} />
          </button>

          <div className="header-channel-badge">
            <HashIcon size={20} />
          </div>

          <div className="header-title-box">
            <div className="header-name-row">
              <h1 className="header-room-name">#{currentRoom}</h1>
            </div>
            <p className="header-room-meta">
              <span className="member-indicator">
                <UsersIcon size={13} />
                <span>{roomMembers.length} {roomMembers.length === 1 ? 'member' : 'members'} online</span>
              </span>
            </p>
          </div>
        </div>

        <div className="header-right">
          {/* Details Panel Toggle */}
          <button
            className={`icon-btn details-toggle-btn ${showDetails ? 'active' : ''}`}
            onClick={() => setShowDetails(prev => !prev)}
            title={showDetails ? "Hide conversation details" : "View conversation details"}
            aria-label="Toggle conversation details"
          >
            <InfoIcon size={20} />
          </button>
        </div>
      </header>

      {/* Messages Timeline Container */}
      <div className="messages-scroll-area">
        {messages.length === 0 ? (
          <div className="empty-chat-hero">
            <div className="empty-chat-icon">
              <HashIcon size={36} />
            </div>
            <h2 className="empty-chat-title">Welcome to #{currentRoom}!</h2>
            <p className="empty-chat-desc">
              This is the start of the #{currentRoom} conversation channel. Messages sent here are synchronized in real-time.
            </p>
            <div className="empty-chat-tip">
              💡 Tip: Type a message below or invite community members to join.
            </div>
          </div>
        ) : (
          <div className="messages-flow">
            {messages.map((msg, index) => (
              <MessageItem
                key={msg._id || index}
                message={msg}
                currentUser={user}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Live Typing Indicator */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Attachment Notification Toast */}
      {attachmentNotice && (
        <div className="toast-notification">
          <span>📎 Media attachments and file sharing are enabled in Stage 5.</span>
        </div>
      )}

      {/* Message Composer Footer */}
      <div className="composer-container">
        {/* Quick Emoji Bar Popup */}
        {showEmojiPicker && (
          <div className="quick-emoji-bar">
            <div className="emoji-list">
              {QUICK_EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  className="emoji-btn"
                  onClick={() => handleInsertEmoji(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button 
              type="button" 
              className="emoji-close-btn"
              onClick={() => setShowEmojiPicker(false)}
            >
              <XIcon size={14} />
            </button>
          </div>
        )}

        <form className="composer-form" onSubmit={handleSend}>
          {/* Attachment Button */}
          <button
            type="button"
            className="composer-action-btn"
            onClick={handleAttachmentClick}
            title="Attach file"
            aria-label="Attach file"
          >
            <PaperclipIcon size={19} />
          </button>

          {/* Emoji Picker Toggle Button */}
          <button
            type="button"
            className={`composer-action-btn ${showEmojiPicker ? 'active' : ''}`}
            onClick={() => setShowEmojiPicker(prev => !prev)}
            title="Insert emoji"
            aria-label="Insert emoji"
          >
            <SmileIcon size={19} />
          </button>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            className="composer-input"
            placeholder={`Message #${currentRoom}...`}
            value={inputText}
            onChange={handleInputChange}
            autoComplete="off"
          />

          {/* Send Button */}
          <button
            type="submit"
            className="composer-send-btn"
            disabled={!inputText.trim()}
            title="Send Message (Enter)"
            aria-label="Send message"
          >
            <SendIcon size={17} />
          </button>
        </form>
      </div>
    </main>
  );
};

export default ChatWindow;
