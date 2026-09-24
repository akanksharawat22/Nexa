import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { fetchRoomMessages } from '../services/api';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [user, setUser] = useState(null);
  const [currentRoom, setCurrentRoom] = useState('general');
  const [messages, setMessages] = useState([]);
  const [roomMembers, setRoomMembers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  
  const currentRoomRef = useRef(currentRoom);
  currentRoomRef.current = currentRoom;

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
    if (user) {
      socket.emit('room:join', { room: currentRoom, username: user.username });
    }

    return () => {
      isSubscribed = false;
      socket.off('message:receive', handleReceiveMessage);
      socket.off('room:members', handleRoomMembers);
      socket.off('typing:user_started', handleTypingStarted);
      socket.off('typing:user_stopped', handleTypingStopped);

      if (user) {
        socket.emit('room:leave', { room: currentRoom, username: user.username });
      }
    };
  }, [socket, currentRoom, user]);

  // Register User
  const registerUser = (userData) => {
    setUser(userData);
    if (socket) {
      socket.emit('user:register', userData);
      socket.emit('room:join', { room: currentRoom, username: userData.username });
    }
  };

  // Switch Room
  const switchRoom = (roomName) => {
    if (roomName === currentRoom) return;
    if (socket && user) {
      socket.emit('room:leave', { room: currentRoom, username: user.username });
    }
    setCurrentRoom(roomName);
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
        currentRoom,
        messages,
        roomMembers,
        onlineUsers,
        typingUsers: Array.from(typingUsers),
        registerUser,
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
