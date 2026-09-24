const Message = require('../models/Message');
const User = require('../models/User');
const { getIsMongooseConnected, memoryStore } = require('../config/db');

// In-memory socket session tracking (socketId -> user details)
const activeSockets = new Map();
// Room membership tracking (roomName -> Set of socketIds)
const roomMemberships = new Map();

const getOnlineUsers = async () => {
  if (getIsMongooseConnected()) {
    const users = await User.find({ status: 'online' }).select('username avatar status lastActive');
    return users;
  } else {
    return Array.from(memoryStore.users.values()).filter(u => u.status === 'online');
  }
};

const setupChatHandlers = (io, socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // 1. REGISTER USER SESSION & PRESENCE
  socket.on('user:register', async (userData, callback) => {
    const { username, avatar } = userData;
    if (!username) return;

    const userObj = {
      username: username.trim(),
      avatar: avatar || 'avatar-1',
      status: 'online',
      socketId: socket.id,
      lastActive: new Date()
    };

    activeSockets.set(socket.id, userObj);

    if (getIsMongooseConnected()) {
      try {
        await User.findOneAndUpdate(
          { username: userObj.username },
          { avatar: userObj.avatar, status: 'online', socketId: socket.id, lastActive: new Date() },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.error('Error saving user presence to MongoDB:', err);
      }
    } else {
      memoryStore.users.set(userObj.username, userObj);
    }

    // Broadcast global presence update to all clients
    const onlineList = await getOnlineUsers();
    io.emit('presence:update', onlineList);

    if (typeof callback === 'function') {
      callback({ success: true, user: userObj });
    }
  });

  // 2. JOIN SOCKET ROOM
  socket.on('room:join', async ({ room, username }) => {
    if (!room) return;

    // Leave previous rooms if necessary or just add to current room
    socket.join(room);

    if (!roomMemberships.has(room)) {
      roomMemberships.set(room, new Set());
    }
    roomMemberships.get(room).add(socket.id);

    const activeUser = activeSockets.get(socket.id) || { username: username || 'Anonymous', avatar: 'avatar-1' };

    // Emit system join message to room
    const systemMsg = {
      _id: `sys-${Date.now()}-${Math.random()}`,
      room,
      sender: { username: 'System', avatar: 'system' },
      content: `${activeUser.username} joined the chat`,
      timestamp: new Date(),
      isSystem: true
    };

    io.to(room).emit('message:receive', systemMsg);

    // Get current room member usernames
    const roomSocketIds = Array.from(roomMemberships.get(room) || []);
    const roomUsers = roomSocketIds
      .map(id => activeSockets.get(id))
      .filter(Boolean);

    io.to(room).emit('room:members', { room, members: roomUsers });
  });

  // 3. LEAVE SOCKET ROOM
  socket.on('room:leave', ({ room, username }) => {
    if (!room) return;

    socket.leave(room);
    if (roomMemberships.has(room)) {
      roomMemberships.get(room).delete(socket.id);
    }

    const activeUser = activeSockets.get(socket.id) || { username: username || 'Anonymous' };

    const systemMsg = {
      _id: `sys-${Date.now()}-${Math.random()}`,
      room,
      sender: { username: 'System', avatar: 'system' },
      content: `${activeUser.username} left the channel`,
      timestamp: new Date(),
      isSystem: true
    };

    io.to(room).emit('message:receive', systemMsg);

    const roomSocketIds = Array.from(roomMemberships.get(room) || []);
    const roomUsers = roomSocketIds
      .map(id => activeSockets.get(id))
      .filter(Boolean);

    io.to(room).emit('room:members', { room, members: roomUsers });
  });

  // 4. BI-DIRECTIONAL REAL-TIME MESSAGING WITH PERSISTENCE
  socket.on('message:send', async (msgData, callback) => {
    const { room, content, sender } = msgData;

    if (!room || !content || !content.trim()) {
      if (typeof callback === 'function') callback({ success: false, error: 'Empty message' });
      return;
    }

    const messageObj = {
      _id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      room,
      sender: {
        username: sender?.username || 'Anonymous',
        avatar: sender?.avatar || 'avatar-1'
      },
      content: content.trim(),
      timestamp: new Date()
    };

    // Persistence layer
    if (getIsMongooseConnected()) {
      try {
        const savedDoc = await Message.create({
          room: messageObj.room,
          sender: messageObj.sender,
          content: messageObj.content,
          timestamp: messageObj.timestamp
        });
        messageObj._id = savedDoc._id;
      } catch (err) {
        console.error('MongoDB Message Save Error:', err);
      }
    } else {
      if (!memoryStore.messages.has(room)) {
        memoryStore.messages.set(room, []);
      }
      memoryStore.messages.get(room).push(messageObj);
    }

    // Real-Time Socket Broadcast to all sockets in the room
    io.to(room).emit('message:receive', messageObj);

    if (typeof callback === 'function') {
      callback({ success: true, message: messageObj });
    }
  });

  // 5. TYPING INDICATORS
  socket.on('typing:start', ({ room, username }) => {
    if (!room) return;
    socket.to(room).emit('typing:user_started', { room, username });
  });

  socket.on('typing:stop', ({ room, username }) => {
    if (!room) return;
    socket.to(room).emit('typing:user_stopped', { room, username });
  });

  // 6. DISCONNECT & PRESENCE CLEANUP
  socket.on('disconnect', async () => {
    console.log(`❌ Client disconnected: ${socket.id}`);

    const userObj = activeSockets.get(socket.id);
    activeSockets.delete(socket.id);

    // Clean up room memberships
    roomMemberships.forEach((members, room) => {
      if (members.has(socket.id)) {
        members.delete(socket.id);
        const roomUsers = Array.from(members).map(id => activeSockets.get(id)).filter(Boolean);
        io.to(room).emit('room:members', { room, members: roomUsers });
      }
    });

    if (userObj) {
      if (getIsMongooseConnected()) {
        try {
          await User.findOneAndUpdate(
            { username: userObj.username },
            { status: 'offline', lastActive: new Date() }
          );
        } catch (err) {
          console.error('Error updating disconnect presence:', err);
        }
      } else {
        const memUser = memoryStore.users.get(userObj.username);
        if (memUser) {
          memUser.status = 'offline';
          memUser.lastActive = new Date();
        }
      }

      const onlineList = await getOnlineUsers();
      io.emit('presence:update', onlineList);
    }
  });
};

module.exports = {
  setupChatHandlers
};
