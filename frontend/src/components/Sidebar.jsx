import React, { useState, useEffect, useMemo } from 'react';
import { useSocket, getDmRoomId } from '../context/SocketContext';
import PresenceBadge from './PresenceBadge';
import { 
  MessageSquareIcon, 
  UsersIcon, 
  SettingsIcon, 
  SearchIcon, 
  PlusIcon, 
  SunIcon, 
  MoonIcon, 
  HashIcon, 
  AtSignIcon,
  LogOutIcon,
  XIcon,
  NexaLogoIcon
} from './Icons';
import * as api from '../services/api';

const avatarEmojiMap = {
  'avatar-1': '⚡',
  'avatar-2': '🚀',
  'avatar-3': '🎨',
  'avatar-4': '👾',
  'avatar-5': '🔥'
};

const Sidebar = () => {
  const { 
    activeChat,
    switchRoom, 
    openDirectChat,
    user, 
    onlineUsers, 
    isConnected, 
    theme, 
    toggleTheme,
    notificationsEnabled,
    toggleNotifications,
    activeTab, 
    setActiveTab,
    searchQuery,
    setSearchQuery,
    unreadCounts,
    updateProfile,
    logoutUser
  } = useSocket();

  const [rooms, setRooms] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomTopic, setNewRoomTopic] = useState('');
  const [createError, setCreateError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Profile Editor state
  const [editDisplayName, setEditDisplayName] = useState(user?.displayName || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [editAvatar, setEditAvatar] = useState(user?.avatar || 'avatar-1');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setEditDisplayName(user.displayName || user.username || '');
      setEditBio(user.bio || '');
      setEditAvatar(user.avatar || 'avatar-1');
    }
  }, [user]);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    const res = await updateProfile({
      displayName: editDisplayName.trim(),
      bio: editBio.trim(),
      avatar: editAvatar
    });
    setProfileSaving(false);
    if (res.success) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    }
  };

  const loadRooms = async () => {
    try {
      const list = await api.fetchRooms();
      setRooms(list);
    } catch (err) {
      console.error('Failed to load rooms:', err);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  // Filter channels based on search query
  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) return rooms;
    return rooms.filter(r => 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (r.topic && r.topic.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [rooms, searchQuery]);

  // Direct message contacts (all online users except oneself)
  const dmContacts = useMemo(() => {
    if (!user) return [];
    return onlineUsers.filter(u => u.username !== user.username);
  }, [onlineUsers, user]);

  // Filter online contacts based on search query
  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return onlineUsers;
    return onlineUsers.filter(u => 
      u.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [onlineUsers, searchQuery]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!newRoomName.trim()) {
      setCreateError('Please enter a channel name');
      return;
    }

    setIsSubmitting(true);
    const res = await api.createRoom({
      name: newRoomName.trim(),
      topic: newRoomTopic.trim() || 'Custom Channel'
    });
    setIsSubmitting(false);

    if (res.success) {
      await loadRooms();
      switchRoom(res.data.name);
      setShowCreateModal(false);
      setNewRoomName('');
      setNewRoomTopic('');
    } else {
      setCreateError(res.error || 'Failed to create channel');
    }
  };

  return (
    <aside className="sidebar">
      {/* Brand Header */}
      <div className="sidebar-header">
        <div className="brand-logo">
          <div className="logo-icon nexa-brand-logo">
            <NexaLogoIcon size={34} />
          </div>
          <div className="brand-text">
            <span className="brand-name">Nexa</span>
            <span className="brand-tagline">Connect. Communicate. Collaborate.</span>
          </div>
        </div>

        <div className="header-actions">
          {/* Theme Toggle Button */}
          <button 
            className="icon-btn theme-toggle" 
            onClick={toggleTheme} 
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
            aria-label="Toggle visual theme"
          >
            {theme === 'light' ? <MoonIcon size={18} /> : <SunIcon size={18} />}
          </button>

          {/* Connection Status Badge */}
          <div 
            className={`connection-status ${isConnected ? 'connected' : 'connecting'}`}
            title={isConnected ? 'Connected to Socket.io' : 'Connecting to Server...'}
          >
            <span className="status-ping" />
            <span className="status-text">{isConnected ? 'LIVE' : 'SYNCING'}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Chats, Contacts, Settings) */}
      <nav className="sidebar-nav" aria-label="Main Navigation">
        <button
          className={`nav-tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={() => setActiveTab('chats')}
          title="Chats & Channels"
        >
          <MessageSquareIcon size={16} />
          <span>Chats</span>
          <span className="nav-badge">{rooms.length}</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'contacts' ? 'active' : ''}`}
          onClick={() => setActiveTab('contacts')}
          title="Community Contacts"
        >
          <UsersIcon size={16} />
          <span>Contacts</span>
          <span className="nav-badge online-count">{onlineUsers.length}</span>
        </button>

        <button
          className={`nav-tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
          title="User Settings"
        >
          <SettingsIcon size={16} />
          <span>Settings</span>
        </button>
      </nav>

      {/* Search Bar */}
      <div className="sidebar-search">
        <div className="search-input-wrapper">
          <SearchIcon size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder={activeTab === 'contacts' ? "Search contacts..." : "Search channels & DMs..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="search-clear-btn" 
              onClick={() => setSearchQuery('')}
              title="Clear search"
            >
              <XIcon size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Dynamic Tab Body Content */}
      <div className="sidebar-body">
        {/* TAB 1: CHATS / CHANNELS & DIRECT MESSAGES */}
        {activeTab === 'chats' && (
          <div className="channels-view">
            {/* Direct Messages Section */}
            {dmContacts.length > 0 && (
              <div className="chat-section-group">
                <div className="section-header">
                  <span className="section-title">DIRECT MESSAGES ({dmContacts.length})</span>
                </div>
                <div className="room-list">
                  {dmContacts.map((contact) => {
                    const dmRoom = getDmRoomId(user.username, contact.username);
                    const isActive = activeChat.type === 'direct' && activeChat.id === dmRoom;
                    const unread = unreadCounts[dmRoom] || 0;

                    return (
                      <div
                        key={contact.username}
                        className={`room-item dm-item ${isActive ? 'active' : ''}`}
                        onClick={() => openDirectChat(contact)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="contact-avatar-wrapper" style={{ marginRight: '2px' }}>
                          <span className="contact-avatar" style={{ width: '28px', height: '28px', fontSize: '0.9rem' }}>
                            {avatarEmojiMap[contact.avatar] || '👤'}
                          </span>
                          <PresenceBadge status={contact.status || 'online'} size="sm" />
                        </div>
                        <div className="room-meta">
                          <div className="room-name-row">
                            <span className="room-title">@{contact.username}</span>
                            {unread > 0 && <span className="unread-pill">{unread}</span>}
                          </div>
                          <span className="room-topic-snippet">
                            {contact.status === 'online' ? 'Active now' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Channels Section */}
            <div className="chat-section-group">
              <div className="section-header">
                <span className="section-title">CHANNELS ({filteredRooms.length})</span>
                <button
                  className="add-channel-btn"
                  onClick={() => setShowCreateModal(true)}
                  title="Create New Channel"
                  aria-label="Create Channel"
                >
                  <PlusIcon size={16} />
                  <span>New</span>
                </button>
              </div>

              <div className="room-list">
                {filteredRooms.length === 0 ? (
                  <div className="empty-search-state">
                    <p>No channels match "{searchQuery}"</p>
                  </div>
                ) : (
                  filteredRooms.map((room) => {
                    const isActive = activeChat.type === 'room' && activeChat.id === room.name;
                    const unread = unreadCounts[room.name] || 0;

                    return (
                      <div
                        key={room._id || room.name}
                        className={`room-item ${isActive ? 'active' : ''}`}
                        onClick={() => switchRoom(room.name)}
                        role="button"
                        tabIndex={0}
                      >
                        <div className="room-icon-wrapper">
                          <HashIcon size={18} className="room-hash-icon" />
                        </div>
                        <div className="room-meta">
                          <div className="room-name-row">
                            <span className="room-title">#{room.name}</span>
                            {unread > 0 && <span className="unread-pill">{unread}</span>}
                          </div>
                          <span className="room-topic-snippet">{room.topic || 'General conversation'}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONTACTS / ONLINE USERS */}
        {activeTab === 'contacts' && (
          <div className="contacts-view">
            <div className="section-header">
              <span className="section-title">ONLINE COMMUNITY ({filteredContacts.length})</span>
            </div>

            <div className="user-list">
              {filteredContacts.length === 0 ? (
                <div className="empty-search-state">
                  <p>No contacts found.</p>
                </div>
              ) : (
                filteredContacts.map((u, idx) => {
                  const isSelf = user && u.username === user.username;
                  return (
                    <div key={u.username || idx} className="contact-item">
                      <div className="contact-avatar-wrapper">
                        <span className="contact-avatar">
                          {avatarEmojiMap[u.avatar] || '👤'}
                        </span>
                        <PresenceBadge status={u.status || 'online'} />
                      </div>
                      <div className="contact-info">
                        <div className="contact-name-row">
                          <span className="contact-username">{u.username}</span>
                          {isSelf && <span className="self-pill">You</span>}
                        </div>
                        <span className="contact-status-text">
                          {u.status === 'online' ? 'Active now' : 'Offline'}
                        </span>
                      </div>

                      {/* Direct Message Action Button */}
                      {!isSelf && (
                        <button
                          type="button"
                          className="contact-chat-btn"
                          onClick={() => openDirectChat(u)}
                          title={`Message @${u.username}`}
                        >
                          <MessageSquareIcon size={14} />
                          <span>Chat</span>
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="settings-view">
            {/* Profile Editing Section */}
            <div className="settings-group">
              <div className="section-header" style={{ padding: '0 0 6px 0' }}>
                <span className="section-title">MY PROFILE</span>
              </div>
              <form onSubmit={handleUpdateProfile} className="profile-edit-form">
                {profileSaved && (
                  <div className="profile-saved-banner">
                    ✓ Profile updated successfully!
                  </div>
                )}
                <div className="form-group">
                  <label htmlFor="settings-display-name">Display Name</label>
                  <input
                    id="settings-display-name"
                    type="text"
                    className="form-input"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    maxLength={40}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="settings-bio">Short Bio</label>
                  <textarea
                    id="settings-bio"
                    className="form-input profile-bio-textarea"
                    rows="2"
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    maxLength={160}
                  />
                </div>

                <div className="form-group">
                  <label>Avatar Persona</label>
                  <div className="auth-avatar-grid">
                    {Object.entries(avatarEmojiMap).map(([id, emoji]) => (
                      <button
                        key={id}
                        type="button"
                        className={`avatar-choice-btn ${editAvatar === id ? 'active' : ''}`}
                        onClick={() => setEditAvatar(id)}
                        style={{ padding: '6px 2px' }}
                      >
                        <span style={{ fontSize: '1.25rem' }}>{emoji}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  className="primary-btn"
                  style={{ width: '100%', marginTop: '4px' }}
                  disabled={profileSaving}
                >
                  {profileSaving ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </form>
            </div>

            <div className="section-header" style={{ padding: '12px 0 6px 0' }}>
              <span className="section-title">PREFERENCES</span>
            </div>

            <div className="settings-group">
              <label className="settings-label">Color Appearance</label>
              <div className="theme-selector-grid">
                <button
                  type="button"
                  className={`theme-option-btn ${theme === 'light' ? 'selected' : ''}`}
                  onClick={() => theme !== 'light' && toggleTheme()}
                >
                  <SunIcon size={18} />
                  <span>Light Mode (Default)</span>
                </button>
                <button
                  type="button"
                  className={`theme-option-btn ${theme === 'dark' ? 'selected' : ''}`}
                  onClick={() => theme !== 'dark' && toggleTheme()}
                >
                  <MoonIcon size={18} />
                  <span>Dark Mode</span>
                </button>
              </div>
            </div>

            {/* Desktop Notifications Preference */}
            <div className="settings-group">
              <label className="settings-label">Desktop Notifications</label>
              <button
                type="button"
                className={`theme-option-btn ${notificationsEnabled ? 'selected' : ''}`}
                onClick={toggleNotifications}
              >
                <BellIcon size={18} />
                <span>
                  {notificationsEnabled ? 'Notifications Enabled (Active)' : 'Enable Browser Notifications'}
                </span>
              </button>
            </div>

            <div className="settings-group">
              <label className="settings-label">Security & Storage Diagnostics</label>
              <div className="settings-card">
                <div className="settings-card-row">
                  <span>Authentication</span>
                  <span className="settings-card-val">JWT + Bcrypt Hashes</span>
                </div>
                <div className="settings-card-row">
                  <span>Engine</span>
                  <span className="settings-card-val">Socket.io 4.7 (Authenticated)</span>
                </div>
                <div className="settings-card-row">
                  <span>Persistence</span>
                  <span className="settings-card-val">MongoDB / Dual-Store Parity</span>
                </div>
                <div className="settings-card-row">
                  <span>Rate Limiting</span>
                  <span className="settings-card-val">Active (DDoS Protected)</span>
                </div>
              </div>
            </div>

            <div className="settings-group">
              <button 
                type="button" 
                className="logout-btn" 
                onClick={logoutUser}
              >
                <LogOutIcon size={18} />
                <span>Sign Out ({user?.username})</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* User Profile Footer */}
      {user && (
        <div className="sidebar-footer">
          <div 
            className="user-profile-card"
            onClick={() => setActiveTab('settings')}
            style={{ cursor: 'pointer' }}
            title="Click to edit profile & settings"
          >
            <div className="user-avatar-wrapper">
              <span className="user-avatar-icon">
                {avatarEmojiMap[user.avatar] || '⚡'}
              </span>
              <PresenceBadge status="online" />
            </div>
            <div className="user-details">
              <span className="user-display-name">
                {user.displayName || user.username}
              </span>
              <span className="user-role-label">@{user.username}</span>
            </div>
          </div>
          <button
            className="icon-btn footer-logout-btn"
            onClick={logoutUser}
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOutIcon size={18} />
          </button>
        </div>
      )}

      {/* Create Channel Modal */}
      {showCreateModal && (
        <div className="modal-backdrop" onClick={() => setShowCreateModal(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Channel</h3>
              <button 
                className="icon-btn" 
                onClick={() => setShowCreateModal(false)}
                title="Close"
              >
                <XIcon size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="modal-form">
              {createError && (
                <div className="form-error-banner">
                  {createError}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="channel-name-input">Channel Name</label>
                <div className="input-with-prefix">
                  <span className="input-prefix">#</span>
                  <input
                    id="channel-name-input"
                    type="text"
                    className="form-input"
                    placeholder="e.g. mobile-team"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    autoFocus
                    required
                  />
                </div>
                <span className="form-hint">Channel names are lowercase and hyphenated.</span>
              </div>

              <div className="form-group">
                <label htmlFor="channel-topic-input">Topic / Purpose (Optional)</label>
                <input
                  id="channel-topic-input"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Daily standups and updates"
                  value={newRoomTopic}
                  onChange={(e) => setNewRoomTopic(e.target.value)}
                />
              </div>

              <div className="modal-btn-row">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="primary-btn"
                  disabled={isSubmitting || !newRoomName.trim()}
                >
                  {isSubmitting ? 'Creating...' : 'Create Channel'}
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
