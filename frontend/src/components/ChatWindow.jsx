import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  AtSignIcon,
  SearchIcon,
  UsersIcon,
  XIcon,
  FileTextIcon
} from './Icons';

const QUICK_EMOJIS = ['👍', '❤️', '🔥', '🚀', '😂', '🎉', '⚡', '👏', '👀', '💯'];

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

const ChatWindow = () => {
  const { 
    activeChat, 
    messages, 
    isLoadingMessages,
    isConnected,
    roomMembers, 
    sendMessage, 
    sendTypingStatus, 
    typingUsers, 
    user,
    replyingTo,
    setReplyingTo,
    pendingFile,
    setPendingFile,
    isUploading,
    isSearchOpen,
    setIsSearchOpen,
    inChatSearchQuery,
    setInChatSearchQuery,
    setMobileView,
    showDetails,
    setShowDetails
  } = useSocket();

  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto scroll to bottom smoothly
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!inChatSearchQuery) {
      scrollToBottom();
    }
  }, [messages, typingUsers, inChatSearchQuery]);

  useEffect(() => {
    if (replyingTo) {
      inputRef.current?.focus();
    }
  }, [replyingTo]);

  // Filter messages if search is active
  const displayedMessages = useMemo(() => {
    if (!inChatSearchQuery.trim()) return messages;
    const query = inChatSearchQuery.toLowerCase();
    return messages.filter(m => 
      (m.content && m.content.toLowerCase().includes(query)) ||
      (m.fileName && m.fileName.toLowerCase().includes(query)) ||
      (m.sender?.username && m.sender.username.toLowerCase().includes(query))
    );
  }, [messages, inChatSearchQuery]);

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

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() && !pendingFile) return;

    await sendMessage(inputText);
    setInputText('');
    setShowEmojiPicker(false);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendTypingStatus(false);

    inputRef.current?.focus();
  };

  const handleInsertEmoji = (emoji) => {
    setInputText(prev => prev + emoji);
    inputRef.current?.focus();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('File size exceeds the 10MB limit.');
      return;
    }

    const isImage = file.type.startsWith('image/');
    const previewUrl = isImage ? URL.createObjectURL(file) : null;

    setPendingFile({
      file,
      name: file.name,
      size: file.size,
      isImage,
      previewUrl
    });

    // Reset input
    e.target.value = '';
    inputRef.current?.focus();
  };

  const isDirect = activeChat.type === 'direct';

  return (
    <main className="chat-window">
      {/* Chat Window Header */}
      <header className="chat-header">
        <div className="header-left">
          <button 
            className="mobile-back-btn icon-btn" 
            onClick={() => setMobileView('sidebar')}
            title="Back to Navigation"
            aria-label="Back to navigation"
          >
            <ArrowLeftIcon size={20} />
          </button>

          <div className="header-channel-badge">
            {isDirect ? (
              <span style={{ fontSize: '1.25rem' }}>
                {avatarEmojiMap[activeChat.targetUser?.avatar] || '👤'}
              </span>
            ) : (
              <HashIcon size={20} />
            )}
          </div>

          <div className="header-title-box">
            <div className="header-name-row">
              <h1 className="header-room-name">
                {isDirect ? `@${activeChat.name}` : `#${activeChat.name}`}
              </h1>
            </div>
            <p className="header-room-meta">
              {isDirect ? (
                <span className="member-indicator">
                  <span className="presence-dot size-sm online" style={{ position: 'relative' }} />
                  <span>Direct Private Conversation</span>
                </span>
              ) : (
                <span className="member-indicator">
                  <UsersIcon size={13} />
                  <span>{roomMembers.length} {roomMembers.length === 1 ? 'member' : 'members'} online</span>
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="header-right">
          {/* In-Chat Search Button */}
          <button
            className={`icon-btn in-chat-search-btn ${isSearchOpen ? 'active' : ''}`}
            onClick={() => {
              setIsSearchOpen(prev => !prev);
              if (isSearchOpen) setInChatSearchQuery('');
            }}
            title={isSearchOpen ? "Close search" : "Search in conversation"}
            aria-label="Search conversation messages"
          >
            <SearchIcon size={18} />
          </button>

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

      {/* In-Chat Search Input Bar */}
      {isSearchOpen && (
        <div className="in-chat-search-bar">
          <SearchIcon size={16} className="search-icon" />
          <input
            type="text"
            className="in-chat-search-input"
            placeholder="Search keywords in this conversation..."
            value={inChatSearchQuery}
            onChange={(e) => setInChatSearchQuery(e.target.value)}
            autoFocus
          />
          {inChatSearchQuery && (
            <span className="search-match-count">
              {displayedMessages.length} {displayedMessages.length === 1 ? 'match' : 'matches'}
            </span>
          )}
          <button
            type="button"
            className="icon-btn search-close-btn"
            onClick={() => {
              setIsSearchOpen(false);
              setInChatSearchQuery('');
            }}
            title="Clear & close search"
          >
            <XIcon size={16} />
          </button>
        </div>
      )}

      {/* Reconnection Warning Banner */}
      {!isConnected && (
        <div className="network-reconnect-banner">
          <span className="reconnect-status-dot" />
          <span>Syncing with real-time server... Incoming messages will update automatically.</span>
        </div>
      )}

      {/* Messages Timeline Container */}
      <div className="messages-scroll-area">
        {isLoadingMessages ? (
          <div className="messages-skeleton-loader">
            <div className="skeleton-item left">
              <div className="skeleton-avatar" />
              <div className="skeleton-bubble" style={{ width: '42%' }} />
            </div>
            <div className="skeleton-item right">
              <div className="skeleton-bubble" style={{ width: '58%' }} />
            </div>
            <div className="skeleton-item left">
              <div className="skeleton-avatar" />
              <div className="skeleton-bubble" style={{ width: '36%' }} />
            </div>
            <div className="skeleton-item right">
              <div className="skeleton-bubble" style={{ width: '48%' }} />
            </div>
          </div>
        ) : displayedMessages.length === 0 ? (
          <div className="empty-chat-hero">
            <div className="empty-chat-icon">
              {inChatSearchQuery ? (
                <SearchIcon size={36} />
              ) : isDirect ? (
                <AtSignIcon size={36} />
              ) : (
                <HashIcon size={36} />
              )}
            </div>
            <h2 className="empty-chat-title">
              {inChatSearchQuery
                ? `No messages matching "${inChatSearchQuery}"`
                : isDirect
                ? `Chat with @${activeChat.name}`
                : `Welcome to #${activeChat.name}!`}
            </h2>
            <p className="empty-chat-desc">
              {inChatSearchQuery
                ? 'Try searching with a different keyword or check spelling.'
                : isDirect
                ? `This is the beginning of your private conversation with ${activeChat.name}.`
                : `This is the start of the #${activeChat.name} channel conversation. Messages are broadcast in real-time.`}
                
            </p>
          </div>
        ) : (
          <div className="messages-flow">
            {displayedMessages.map((msg, index) => (
              <MessageItem
                key={msg._id || index}
                message={msg}
                currentUser={user}
                onImageClick={(url) => setLightboxImage(url)}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Live Typing Indicator */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Image Lightbox Modal */}
      {lightboxImage && (
        <div className="lightbox-backdrop" onClick={() => setLightboxImage(null)}>
          <button 
            type="button" 
            className="lightbox-close-btn"
            onClick={() => setLightboxImage(null)}
          >
            <XIcon size={24} />
          </button>
          <img 
            src={lightboxImage} 
            alt="Enlarged preview" 
            className="lightbox-img" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

      {/* Message Composer Footer */}
      <div className="composer-container">
        {/* Pending File Preview Bar */}
        {pendingFile && (
          <div className="pending-file-bar">
            {pendingFile.isImage ? (
              <img 
                src={pendingFile.previewUrl} 
                alt="Upload preview" 
                className="pending-file-thumbnail" 
              />
            ) : (
              <div className="pending-file-icon">
                <FileTextIcon size={20} />
              </div>
            )}
            <div className="pending-file-meta">
              <span className="pending-file-name">{pendingFile.name}</span>
              <span className="pending-file-size">{formatFileSize(pendingFile.size)}</span>
            </div>
            <button
              type="button"
              className="pending-file-remove"
              onClick={() => setPendingFile(null)}
              title="Remove attachment"
            >
              <XIcon size={16} />
            </button>
          </div>
        )}

        {/* Replying Preview Bar */}
        {replyingTo && (
          <div className="replying-preview-bar">
            <div className="replying-info">
              <span className="replying-author">Replying to @{replyingTo.sender?.username || 'User'}:</span>
              <span className="replying-snippet">{replyingTo.content || 'Attached file'}</span>
            </div>
            <button
              type="button"
              className="replying-cancel-btn"
              onClick={() => setReplyingTo(null)}
              title="Cancel reply"
            >
              <XIcon size={14} />
            </button>
          </div>
        )}

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
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />

          {/* Attachment Button */}
          <button
            type="button"
            className="composer-action-btn"
            onClick={() => fileInputRef.current?.click()}
            title="Attach image or file (Max 10MB)"
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
            placeholder={
              pendingFile 
                ? "Add an optional caption..." 
                : isDirect 
                ? `Message @${activeChat.name}...` 
                : `Message #${activeChat.name}...`
            }
            value={inputText}
            onChange={handleInputChange}
            autoComplete="off"
          />

          {/* Send Button */}
          <button
            type="submit"
            className="composer-send-btn"
            disabled={(!inputText.trim() && !pendingFile) || isUploading}
            title="Send Message (Enter)"
            aria-label="Send message"
          >
            {isUploading ? (
              <span className="upload-spinner" />
            ) : (
              <SendIcon size={17} />
            )}
          </button>
        </form>
      </div>
    </main>
  );
};

export default ChatWindow;
