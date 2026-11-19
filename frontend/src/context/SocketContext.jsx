import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { fetchRoomMessages } from '../services/api';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // User state with LocalStorage persistence
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('pulse_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // UI Theme State ('light' by default as required, optional 'dark')
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('pulse_theme') || 'light';
    } catch {
      return 'light';
    }
  });

  // UI Layout States
  const [currentRoom, setCurrentRoom] = useState('general');
  const [messages, setMessages] = useState([]);
  const [roomMembers, setRoomMembers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  
  // Navigation & Responsiveness
  const [activeTab, setActiveTab] = useState('chats'); // 'chats' | 'contacts' | 'settings'
  const [mobileView, setMobileView] = useState('sidebar'); // 'sidebar' | 'chat' | 'details'
  const [showDetails, setShowDetails] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const currentRoomRef = useRef(currentRoom);
  currentRoomRef.current = currentRoom;

  // Sync theme attribute to documentElement
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('pulse_theme', theme);
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  // Initialize Socket.io connection on mount
  useEffect(() => {
    const socketUrl = window.location.origin;
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('⚡ Socket Connected:', newSocket.id);
      setIsConnected(true);

      // Auto-register stored user if exists
      if (user) {
        newSocket.emit('user:register', user);
        newSocket.emit('room:join', { room: currentRoomRef.current, username: user.username });
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
  }, []);

  // Listen to Global Presence updates
  useEffect(() => {
    if (!socket) return;

    const handlePresenceUpdate = (users) => {
      setOnlineUsers(users);
    };

    socket.on('presence:update', handlePresenceUpdate);

    return () => {
      socket.off('presence:update', handlePresenceUpdate);
    };
  }, [socket]);

  // Handle Room switching and room-specific message history + listeners
  useEffect(() => {
    if (!socket || !currentRoom) return;

    // Load message history from MongoDB / REST API first
    let isSubscribed = true;
    fetchRoomMessages(currentRoom).then(history => {
      if (isSubscribed) {
        setMessages(history);
      }
    });

    // Reset typing state on room switch
    setTypingUsers(new Set());

    // Socket Room Handlers
    const handleReceiveMessage = (msg) => {
      if (msg.room === currentRoomRef.current) {
        setMessages(prev => [...prev, msg]);
      }
    };

    const handleRoomMembers = ({ room, members }) => {
      if (room === currentRoomRef.current) {
        setRoomMembers(members);
      }
    };

    const handleTypingStarted = ({ room, username }) => {
      if (room === currentRoomRef.current) {
        setTypingUsers(prev => new Set(prev).add(username));
      }
    };

    const handleTypingStopped = ({ room, username }) => {
      if (room === currentRoomRef.current) {
        setTypingUsers(prev => {
          const next = new Set(prev);
          next.delete(username);
          return next;
        });
      }
    };

    socket.on('message:receive', handleReceiveMessage);
    socket.on('room:members', handleRoomMembers);
    socket.on('typing:user_started', handleTypingStarted);
    socket.on('typing:user_stopped', handleTypingStopped);

    // Emit socket join room event
    if (user && socket.connected) {
      socket.emit('room:join', { room: currentRoom, username: user.username });
    }

    return () => {
      isSubscribed = false;
      socket.off('message:receive', handleReceiveMessage);
      socket.off('room:members', handleRoomMembers);
      socket.off('typing:user_started', handleTypingStarted);
      socket.off('typing:user_stopped', handleTypingStopped);

      if (user && socket.connected) {
        socket.emit('room:leave', { room: currentRoom, username: user.username });
      }
    };
  }, [socket, currentRoom, user]);

  // Register User
  const registerUser = (userData) => {
    setUser(userData);
    try {
      localStorage.setItem('pulse_user', JSON.stringify(userData));
    } catch (e) {
      console.warn('LocalStorage error saving user:', e);
    }

    if (socket) {
      socket.emit('user:register', userData);
      socket.emit('room:join', { room: currentRoom, username: userData.username });
    }
  };

  // Logout User
  const logoutUser = () => {
    if (socket && user) {
      socket.emit('room:leave', { room: currentRoom, username: user.username });
    }
    setUser(null);
    try {
      localStorage.removeItem('pulse_user');
    } catch (e) {
      console.warn('LocalStorage error removing user:', e);
    }
    setMobileView('sidebar');
  };

  // Switch Room
  const switchRoom = (roomName) => {
    if (roomName === currentRoom) {
      setMobileView('chat');
      return;
    }
    if (socket && user && socket.connected) {
      socket.emit('room:leave', { room: currentRoom, username: user.username });
    }
    setCurrentRoom(roomName);
    setMobileView('chat');
  };

  // Send Real-Time Message
  const sendMessage = (content) => {
    if (!socket || !content.trim() || !user) return;

    socket.emit('message:send', {
      room: currentRoom,
      content,
      sender: user
    });
  };

  // Emit Typing Status
  const sendTypingStatus = (isTyping) => {
    if (!socket || !user || !currentRoom) return;
    if (isTyping) {
      socket.emit('typing:start', { room: currentRoom, username: user.username });
    } else {
      socket.emit('typing:stop', { room: currentRoom, username: user.username });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        user,
        theme,
        toggleTheme,
        currentRoom,
        messages,
        roomMembers,
        onlineUsers,
        typingUsers: Array.from(typingUsers),
        activeTab,
        setActiveTab,
        mobileView,
        setMobileView,
        showDetails,
        setShowDetails,
        searchQuery,
        setSearchQuery,
        registerUser,
        logoutUser,
        switchRoom,
        sendMessage,
        sendTypingStatus
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
