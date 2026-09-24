import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import MessageItem from './MessageItem';
import TypingIndicator from './TypingIndicator';

const ChatWindow = () => {
  const { currentRoom, messages, roomMembers, sendMessage, sendTypingStatus, typingUsers, user } = useSocket();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Auto scroll to bottom when new messages arrive
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

    sendMessage(inputText);
    setInputText('');

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    sendTypingStatus(false);
  };

  return (
    <main className="chat-area">
      {/* Header */}
      <header className="chat-header">
        <div className="chat-header-info">
          <h2>
            <span style={{ color: '#6366f1' }}>#</span>
            {currentRoom}
          </h2>
          <div className="chat-header-topic">
            Bi-directional Socket Room Stream
          </div>
        </div>
        <div className="chat-header-members">
          <span>👥</span>
          <span>{roomMembers.length} Members Online</span>
        </div>
      </header>

      {/* Messages Container */}
      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-chat">
            <div className="empty-chat-icon">💬</div>
            <h3>Welcome to #{currentRoom}!</h3>
            <p>This is the start of the #{currentRoom} channel history.</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <MessageItem
              key={msg._id || index}
              message={msg}
              currentUser={user}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      <TypingIndicator typingUsers={typingUsers} />

      {/* Message Composer Input Bar */}
      <div className="input-container">
        <form className="input-form" onSubmit={handleSend}>
          <input
            type="text"
            className="message-input"
            placeholder={`Message #${currentRoom}...`}
            value={inputText}
            onChange={handleInputChange}
          />
          <button
            type="submit"
            className="send-btn"
            disabled={!inputText.trim()}
            title="Send Message"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </form>
      </div>
    </main>
  );
};

export default ChatWindow;
