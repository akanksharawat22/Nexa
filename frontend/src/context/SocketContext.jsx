import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { 
  fetchRoomMessages, 
  registerUserApi, 
  loginUserApi, 
  getMeApi, 
  updateProfileApi,
  uploadFileApi,
  markMessagesReadApi
} from '../services/api';
import { soundManager } from '../services/sound';

const SocketContext = createContext(null);

export const getDmRoomId = (userA, userB) => {
  if (!userA || !userB) return '';
  const sorted = [userA, userB].sort();
  return `dm:${sorted[0]}--${sorted[1]}`;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  // Authentication State
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem('nexa_token') || localStorage.getItem('pulse_token') || null;
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('nexa_user') || localStorage.getItem('pulse_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Theme State
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('nexa_theme') || localStorage.getItem('pulse_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  // Notifications State
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    try {
      return (localStorage.getItem('nexa_notifications') || localStorage.getItem('pulse_notifications')) === 'true';
    } catch {
      return false;
    }
  });

  // Active Chat State: { type: 'room' | 'direct', id: string, name: string, targetUser?: object }
  const [activeChat, setActiveChat] = useState({
    type: 'room',
    id: 'general',
    name: 'general'
  });

  const [messages, setMessages] = useState([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [roomMembers, setRoomMembers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [unreadCounts, setUnreadCounts] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [pendingFile, setPendingFile] = useState(null); // { file, previewUrl, isImage, name, size }
  const [isUploading, setIsUploading] = useState(false);

  // In-Chat Search State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');

  // Layout & Navigation States
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'contacts' | 'settings'
  const [mobileView, setMobileView] = useState('sidebar'); // 'sidebar' | 'chat' | 'details'
  const [showDetails, setShowDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentChatRef = useRef(activeChat);
  currentChatRef.current = activeChat;

  const currentRoom = activeChat.id;

  // Sync theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('nexa_theme', theme);
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // Browser Notifications Toggle
  const toggleNotifications = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }

    if (Notification.permission === 'granted') {
      const nextState = !notificationsEnabled;
      setNotificationsEnabled(nextState);
      localStorage.setItem('nexa_notifications', String(nextState));
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        localStorage.setItem('nexa_notifications', 'true');
        new Notification('Nexa Notifications Active', {
          body: 'You will now receive alerts for incoming messages.'
        });
      }
    } else {
      alert('Notifications are blocked by your browser settings. Please unblock them to enable alerts.');
    }
  };

  const triggerDesktopNotification = (title, body) => {
    if (!notificationsEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      new Notification(title, {
        body,
        icon: '💬'
      });
    } catch (e) {
      console.warn('Failed to display notification:', e);
    }
  };

  // Initialize Socket.io connection on mount & when token changes
  useEffect(() => {
    const socketUrl = window.location.origin;
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('⚡ Socket Connected:', newSocket.id);
      setIsConnected(true);

      if (user) {
        newSocket.emit('user:register', user);
        newSocket.emit('room:join', { room: currentChatRef.current.id, username: user.username });
      }
    });

    newSocket.on('disconnect', () => {
      console.log('⚡ Socket Disconnected');
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  // Presence & In-App Direct Message Notifications
  useEffect(() => {
    if (!socket) return;

    const handlePresenceUpdate = (users) => {
      setOnlineUsers(users);
    };

    const handleNotification = ({ type, from, room, message }) => {
      if (room !== currentChatRef.current.id) {
        setUnreadCounts(prev => ({
          ...prev,
          [room]: (prev[room] || 0) + 1
        }));
        triggerDesktopNotification(
          `Message from @${from}`,
          message?.content || (message?.fileName ? `Sent an attachment: ${message.fileName}` : 'New message')
        );
      }
    };

    socket.on('presence:update', handlePresenceUpdate);
    socket.on('message:notification', handleNotification);

    return () => {
      socket.off('presence:update', handlePresenceUpdate);
      socket.off('message:notification', handleNotification);
    };
  }, [socket, notificationsEnabled]);

  // Handle Chat room switching, message loading, and real-time room listeners
  useEffect(() => {
    if (!socket || !activeChat.id) return;

    let isSubscribed = true;

    setUnreadCounts(prev => ({
      ...prev,
      [activeChat.id]: 0
    }));

    // Fetch history
    setIsLoadingMessages(true);
    fetchRoomMessages(activeChat.id).then(history => {
      if (isSubscribed) {
        setMessages(history);
        setIsLoadingMessages(false);
      }
    }).catch(() => {
      if (isSubscribed) setIsLoadingMessages(false);
    });

    // Mark messages as read in this room
    if (user) {
      socket.emit('message:read', { room: activeChat.id, username: user.username });
      markMessagesReadApi(activeChat.id, user.username);
    }

    setTypingUsers(new Set());
    setReplyingTo(null);
    setPendingFile(null);
    setIsSearchOpen(false);
    setInChatSearchQuery('');

    const handleReceiveMessage = (msg) => {
      if (msg.room === currentChatRef.current.id) {
        setMessages(prev => [...prev, msg]);
        if (user && msg.sender.username !== user.username) {
          soundManager.playReceiveChime();
          socket.emit('message:read', { room: currentChatRef.current.id, username: user.username });
          if (document.hidden) {
            triggerDesktopNotification(
              `#${currentChatRef.current.name} • @${msg.sender.username}`,
              msg.content || (msg.fileName ? `Attachment: ${msg.fileName}` : '')
            );
          }
        }
      } else {
        soundManager.playReceiveChime();
        setUnreadCounts(prev => ({
          ...prev,
          [msg.room]: (prev[msg.room] || 0) + 1
        }));
      }
    };

    const handleReadReceipt = ({ room, username, readAt }) => {
      if (room === currentChatRef.current.id) {
        setMessages(prev => prev.map(m => {
          if (!m.readBy) m.readBy = [];
          if (!m.readBy.some(r => r.username === username)) {
            return {
              ...m,
              readBy: [...m.readBy, { username, readAt }]
            };
          }
          return m;
        }));
      }
    };

    const handleEditedMessage = ({ messageId, room, content, isEdited, editedAt }) => {
      if (room === currentChatRef.current.id) {
        setMessages(prev => prev.map(m => 
          String(m._id) === String(messageId) 
            ? { ...m, content, isEdited, editedAt } 
            : m
        ));
      }
    };

    const handleDeletedMessage = ({ messageId, room }) => {
      if (room === currentChatRef.current.id) {
        setMessages(prev => prev.map(m => 
          String(m._id) === String(messageId) 
            ? { ...m, content: 'This message was deleted', fileUrl: null, isDeleted: true } 
            : m
        ));
      }
    };

    const handleReactedMessage = ({ messageId, room, reactions }) => {
      if (room === currentChatRef.current.id) {
        setMessages(prev => prev.map(m => 
          String(m._id) === String(messageId) 
            ? { ...m, reactions } 
            : m
        ));
      }
    };

    const handleRoomMembers = ({ room, members }) => {
      if (room === currentChatRef.current.id) {
        setRoomMembers(members);
      }
    };

    const handleTypingStarted = ({ room, username }) => {
      if (room === currentChatRef.current.id && username !== user?.username) {
        setTypingUsers(prev => new Set(prev).add(username));
      }
    };

    const handleTypingStopped = ({ room, username }) => {
      if (room === currentChatRef.current.id) {
        setTypingUsers(prev => {
          const next = new Set(prev);
          next.delete(username);
          return next;
        });
      }
    };

    socket.on('message:receive', handleReceiveMessage);
    socket.on('message:read_receipt', handleReadReceipt);
    socket.on('message:edited', handleEditedMessage);
    socket.on('message:deleted', handleDeletedMessage);
    socket.on('message:reacted', handleReactedMessage);
    socket.on('room:members', handleRoomMembers);
    socket.on('typing:user_started', handleTypingStarted);
    socket.on('typing:user_stopped', handleTypingStopped);

    if (user && socket.connected) {
      socket.emit('room:join', { room: activeChat.id, username: user.username });
    }

    return () => {
      isSubscribed = false;
      socket.off('message:receive', handleReceiveMessage);
      socket.off('message:read_receipt', handleReadReceipt);
      socket.off('message:edited', handleEditedMessage);
      socket.off('message:deleted', handleDeletedMessage);
      socket.off('message:reacted', handleReactedMessage);
      socket.off('room:members', handleRoomMembers);
      socket.off('typing:user_started', handleTypingStarted);
      socket.off('typing:user_stopped', handleTypingStopped);

      if (user && socket.connected) {
        socket.emit('room:leave', { room: activeChat.id, username: user.username });
      }
    };
  }, [socket, activeChat.id, user, notificationsEnabled]);

  // Register User
  const registerUser = async (formData) => {
    const res = await registerUserApi(formData);
    if (res.success) {
      setToken(res.token);
      setUser(res.user);
      try {
        localStorage.setItem('nexa_token', res.token);
        localStorage.setItem('nexa_user', JSON.stringify(res.user));
      } catch (e) {
        console.warn('LocalStorage error:', e);
      }
      if (socket) {
        socket.emit('user:register', res.user);
        socket.emit('room:join', { room: activeChat.id, username: res.user.username });
      }
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  // Login User
  const loginUser = async (formData) => {
    const res = await loginUserApi(formData);
    if (res.success) {
      setToken(res.token);
      setUser(res.user);
      try {
        localStorage.setItem('nexa_token', res.token);
        localStorage.setItem('nexa_user', JSON.stringify(res.user));
      } catch (e) {
        console.warn('LocalStorage error:', e);
      }
      if (socket) {
        socket.emit('user:register', res.user);
        socket.emit('room:join', { room: activeChat.id, username: res.user.username });
      }
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  // Update Profile
  const updateProfile = async (profileData) => {
    const res = await updateProfileApi(profileData);
    if (res.success) {
      setUser(res.user);
      try {
        localStorage.setItem('nexa_user', JSON.stringify(res.user));
      } catch (e) {
        console.warn('LocalStorage error:', e);
      }
      if (socket) {
        socket.emit('user:register', res.user);
      }
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  // Logout User
  const logoutUser = () => {
    if (socket && user) {
      socket.emit('room:leave', { room: activeChat.id, username: user.username });
    }
    setUser(null);
    setToken(null);
    try {
      localStorage.removeItem('nexa_token');
      localStorage.removeItem('nexa_user');
      localStorage.removeItem('pulse_token');
      localStorage.removeItem('pulse_user');
    } catch (e) {
      console.warn('LocalStorage error removing user:', e);
    }
    setMobileView('sidebar');
  };

  // Switch to a Channel Room
  const switchRoom = (roomName) => {
    if (activeChat.type === 'room' && activeChat.id === roomName) {
      setMobileView('chat');
      return;
    }
    if (socket && user && socket.connected) {
      socket.emit('room:leave', { room: activeChat.id, username: user.username });
    }
    setActiveChat({
      type: 'room',
      id: roomName,
      name: roomName
    });
    setMobileView('chat');
  };

  // Open Direct Message Chat with Contact
  const openDirectChat = (targetUser) => {
    if (!user || !targetUser) return;
    const dmRoom = getDmRoomId(user.username, targetUser.username);
    if (activeChat.id === dmRoom) {
      setMobileView('chat');
      return;
    }
    if (socket && socket.connected) {
      socket.emit('room:leave', { room: activeChat.id, username: user.username });
    }
    setActiveChat({
      type: 'direct',
      id: dmRoom,
      name: targetUser.username,
      targetUser
    });
    setMobileView('chat');
  };

  // Send Message (Supports text, files, and replies)
  const sendMessage = async (content) => {
    if (!socket || !user) return;
    if (!content.trim() && !pendingFile) return;

    let fileUrl = null;
    let fileName = null;
    let fileSize = null;
    let fileType = null;

    if (pendingFile) {
      setIsUploading(true);
      const uploadRes = await uploadFileApi(pendingFile.file);
      setIsUploading(false);

      if (uploadRes.success) {
        fileUrl = uploadRes.file.url;
        fileName = uploadRes.file.name;
        fileSize = uploadRes.file.size;
        fileType = uploadRes.file.type;
      } else {
        alert(uploadRes.error || 'File upload failed');
        return;
      }
    }

    const payload = {
      room: activeChat.id,
      content: content.trim(),
      fileUrl,
      fileName,
      fileSize,
      fileType,
      sender: user,
      isDirect: activeChat.type === 'direct',
      recipient: activeChat.type === 'direct' ? activeChat.name : null,
      replyTo: replyingTo ? {
        _id: replyingTo._id,
        content: replyingTo.content,
        senderUsername: replyingTo.sender?.username || 'Anonymous'
      } : null
    };

    socket.emit('message:send', payload);
    soundManager.playSendPop();
    setReplyingTo(null);
    setPendingFile(null);
  };

  // Edit Message
  const editMessage = (messageId, newContent) => {
    if (!socket || !user || !messageId || !newContent.trim()) return;
    socket.emit('message:edit', {
      messageId,
      room: activeChat.id,
      newContent,
      username: user.username
    });
  };

  // Delete Message
  const deleteMessage = (messageId) => {
    if (!socket || !user || !messageId) return;
    socket.emit('message:delete', {
      messageId,
      room: activeChat.id,
      username: user.username
    });
  };

  // React to Message
  const reactToMessage = (messageId, emoji) => {
    if (!socket || !user || !messageId || !emoji) return;
    soundManager.playReactionPop();
    socket.emit('message:react', {
      messageId,
      room: activeChat.id,
      emoji,
      username: user.username
    });
  };

  // Typing status
  const sendTypingStatus = (isTyping) => {
    if (!socket || !user || !activeChat.id) return;
    if (isTyping) {
      socket.emit('typing:start', { room: activeChat.id, username: user.username });
    } else {
      socket.emit('typing:stop', { room: activeChat.id, username: user.username });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        token,
        user,
        theme,
        toggleTheme,
        notificationsEnabled,
        toggleNotifications,
        activeChat,
        currentRoom,
        messages,
        isLoadingMessages,
        roomMembers,
        onlineUsers,
        typingUsers: Array.from(typingUsers),
        unreadCounts,
        replyingTo,
        setReplyingTo,
        pendingFile,
        setPendingFile,
        isUploading,
        isSearchOpen,
        setIsSearchOpen,
        inChatSearchQuery,
        setInChatSearchQuery,
        activeTab,
        setActiveTab,
        mobileView,
        setMobileView,
        showDetails,
        setShowDetails,
        searchQuery,
        setSearchQuery,
        registerUser,
        loginUser,
        updateProfile,
        logoutUser,
        switchRoom,
        openDirectChat,
        sendMessage,
        editMessage,
        deleteMessage,
        reactToMessage,
        sendTypingStatus
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
