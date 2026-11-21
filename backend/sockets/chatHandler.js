const Message = require('../models/Message');
const User = require('../models/User');
const { getIsMongooseConnected, memoryStore } = require('../config/db');

// In-memory socket session tracking (socketId -> user details)
const activeSockets = new Map();
// Room membership tracking (roomName -> Set of socketIds)
const roomMemberships = new Map();

// Helper to find message in memory
const findMemoryMessage = (messageId) => {
  for (const [room, msgList] of memoryStore.messages.entries()) {
    const idx = msgList.findIndex(m => String(m._id) === String(messageId));
    if (idx !== -1) {
      return { room, index: idx, message: msgList[idx] };
    }
  }
  return null;
};

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

    const cleanUsername = username.trim();
    const userObj = {
      username: cleanUsername,
      avatar: avatar || 'avatar-1',
      status: 'online',
      socketId: socket.id,
      lastActive: new Date()
    };

    activeSockets.set(socket.id, userObj);

    // Join personal notification channel for direct messaging & alerts
    socket.join(`user:${cleanUsername}`);

    if (getIsMongooseConnected()) {
      try {
        await User.findOneAndUpdate(
          { username: cleanUsername },
          { avatar: userObj.avatar, status: 'online', socketId: socket.id, lastActive: new Date() },
          { upsert: true, new: true }
        );
      } catch (err) {
        console.error('Error saving user presence to MongoDB:', err);
      }
    } else {
      memoryStore.users.set(cleanUsername, userObj);
    }

    // Broadcast global presence update to all clients
    const onlineList = await getOnlineUsers();
    io.emit('presence:update', onlineList);

    if (typeof callback === 'function') {
      callback({ success: true, user: userObj });
    }
  });

  // 2. JOIN SOCKET ROOM (Channel or DM)
  socket.on('room:join', async ({ room, username }) => {
    if (!room) return;

    socket.join(room);

    if (!roomMemberships.has(room)) {
      roomMemberships.set(room, new Set());
    }
    roomMemberships.get(room).add(socket.id);

    const activeUser = activeSockets.get(socket.id) || { username: username || 'Anonymous', avatar: 'avatar-1' };

    // Emit system join message only for public channels (not DMs)
    if (!room.startsWith('dm:')) {
      const systemMsg = {
        _id: `sys-${Date.now()}-${Math.random()}`,
        room,
        sender: { username: 'System', avatar: 'system' },
        content: `${activeUser.username} joined the chat`,
        timestamp: new Date(),
        isSystem: true
      };
      io.to(room).emit('message:receive', systemMsg);
    }

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

    if (!room.startsWith('dm:')) {
      const systemMsg = {
        _id: `sys-${Date.now()}-${Math.random()}`,
        room,
        sender: { username: 'System', avatar: 'system' },
        content: `${activeUser.username} left the channel`,
        timestamp: new Date(),
        isSystem: true
      };
      io.to(room).emit('message:receive', systemMsg);
    }

    const roomSocketIds = Array.from(roomMemberships.get(room) || []);
    const roomUsers = roomSocketIds
      .map(id => activeSockets.get(id))
      .filter(Boolean);

    io.to(room).emit('room:members', { room, members: roomUsers });
  });

  // 4. SEND REAL-TIME MESSAGE (ROOM OR DIRECT MESSAGE)
  socket.on('message:send', async (msgData, callback) => {
    const { 
      room, 
      content, 
      sender, 
      isDirect, 
      recipient, 
      replyTo, 
      fileUrl, 
      fileName, 
      fileSize, 
      fileType 
    } = msgData;

    if (!room || (!content && !fileUrl)) {
      if (typeof callback === 'function') callback({ success: false, error: 'Empty message' });
      return;
    }

    const messageObj = {
      _id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      room,
      isDirect: Boolean(isDirect),
      recipient: recipient || null,
      sender: {
        username: sender?.username || 'Anonymous',
        avatar: sender?.avatar || 'avatar-1'
      },
      content: content ? content.trim() : '',
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      fileSize: fileSize || null,
      fileType: fileType || null,
      replyTo: replyTo || null,
      reactions: [],
      readBy: [{ username: sender?.username || 'Anonymous', readAt: new Date() }],
      isEdited: false,
      isDeleted: false,
      timestamp: new Date()
    };

    // Persistence layer
    if (getIsMongooseConnected()) {
      try {
        const savedDoc = await Message.create(messageObj);
        messageObj._id = String(savedDoc._id);
      } catch (err) {
        console.error('MongoDB Message Save Error:', err);
      }
    } else {
      if (!memoryStore.messages.has(room)) {
        memoryStore.messages.set(room, []);
      }
      memoryStore.messages.get(room).push(messageObj);
    }

    // Broadcast to the target room (channel or shared DM room)
    io.to(room).emit('message:receive', messageObj);

    // If it is a Direct Message, ensure recipient gets a personal notification even if in another room
    if (isDirect && recipient && recipient !== sender?.username) {
      io.to(`user:${recipient}`).emit('message:notification', {
        type: 'direct',
        from: sender?.username,
        room,
        message: messageObj
      });
    }

    if (typeof callback === 'function') {
      callback({ success: true, message: messageObj });
    }
  });

  // 4b. REAL-TIME READ RECEIPTS
  socket.on('message:read', async ({ room, username }) => {
    if (!room || !username) return;

    if (getIsMongooseConnected()) {
      try {
        await Message.updateMany(
          { room, 'sender.username': { $ne: username }, 'readBy.username': { $ne: username } },
          { $push: { readBy: { username, readAt: new Date() } } }
        );
      } catch (err) {
        console.error('Error updating read receipts in MongoDB:', err);
      }
    } else {
      const messages = memoryStore.messages.get(room) || [];
      messages.forEach(m => {
        if (m.sender.username !== username) {
          if (!m.readBy) m.readBy = [];
          if (!m.readBy.some(r => r.username === username)) {
            m.readBy.push({ username, readAt: new Date() });
          }
        }
      });
    }

    // Broadcast read receipt to room
    io.to(room).emit('message:read_receipt', {
      room,
      username,
      readAt: new Date()
    });
  });

  // 5. EDIT MESSAGE REAL-TIME
  socket.on('message:edit', async ({ messageId, room, newContent, username }, callback) => {
    if (!messageId || !newContent || !newContent.trim() || !username) {
      if (typeof callback === 'function') callback({ success: false, error: 'Invalid payload' });
      return;
    }

    const cleanContent = newContent.trim();
    let updatedDoc = null;

    if (getIsMongooseConnected()) {
      try {
        const doc = await Message.findById(messageId);
        if (doc && doc.sender.username === username && !doc.isDeleted) {
          doc.content = cleanContent;
          doc.isEdited = true;
          doc.editedAt = new Date();
          await doc.save();
          updatedDoc = doc;
        }
      } catch (err) {
        console.error('Error editing message in MongoDB:', err);
      }
    } else {
      const found = findMemoryMessage(messageId);
      if (found && found.message.sender.username === username && !found.message.isDeleted) {
        found.message.content = cleanContent;
        found.message.isEdited = true;
        found.message.editedAt = new Date();
        updatedDoc = found.message;
      }
    }

    if (updatedDoc) {
      io.to(room).emit('message:edited', {
        messageId,
        room,
        content: cleanContent,
        isEdited: true,
        editedAt: new Date()
      });
      if (typeof callback === 'function') callback({ success: true, data: updatedDoc });
    } else {
      if (typeof callback === 'function') callback({ success: false, error: 'Unauthorized or not found' });
    }
  });

  // 6. DELETE MESSAGE REAL-TIME
  socket.on('message:delete', async ({ messageId, room, username }, callback) => {
    if (!messageId || !username) {
      if (typeof callback === 'function') callback({ success: false, error: 'Invalid payload' });
      return;
    }

    let success = false;

    if (getIsMongooseConnected()) {
      try {
        const doc = await Message.findById(messageId);
        if (doc && doc.sender.username === username) {
          doc.content = 'This message was deleted';
          doc.isDeleted = true;
          doc.deletedAt = new Date();
          await doc.save();
          success = true;
        }
      } catch (err) {
        console.error('Error deleting message in MongoDB:', err);
      }
    } else {
      const found = findMemoryMessage(messageId);
      if (found && found.message.sender.username === username) {
        found.message.content = 'This message was deleted';
        found.message.isDeleted = true;
        found.message.deletedAt = new Date();
        success = true;
      }
    }

    if (success) {
      io.to(room).emit('message:deleted', {
        messageId,
        room,
        isDeleted: true
      });
      if (typeof callback === 'function') callback({ success: true });
    } else {
      if (typeof callback === 'function') callback({ success: false, error: 'Unauthorized or not found' });
    }
  });

  // 7. EMOJI REACTION REAL-TIME
  socket.on('message:react', async ({ messageId, room, emoji, username }, callback) => {
    if (!messageId || !emoji || !username) {
      if (typeof callback === 'function') callback({ success: false, error: 'Invalid reaction payload' });
      return;
    }

    let reactionsResult = null;

    if (getIsMongooseConnected()) {
      try {
        const doc = await Message.findById(messageId);
        if (doc && !doc.isDeleted) {
          let reactionEntry = doc.reactions.find(r => r.emoji === emoji);
          if (reactionEntry) {
            const userIndex = reactionEntry.users.indexOf(username);
            if (userIndex > -1) {
              reactionEntry.users.splice(userIndex, 1);
              if (reactionEntry.users.length === 0) {
                doc.reactions = doc.reactions.filter(r => r.emoji !== emoji);
              }
            } else {
              reactionEntry.users.push(username);
            }
          } else {
            doc.reactions.push({ emoji, users: [username] });
          }
          await doc.save();
          reactionsResult = doc.reactions;
        }
      } catch (err) {
        console.error('Error toggling reaction in MongoDB:', err);
      }
    } else {
      const found = findMemoryMessage(messageId);
      if (found && !found.message.isDeleted) {
        if (!found.message.reactions) {
          found.message.reactions = [];
        }
        let reactionEntry = found.message.reactions.find(r => r.emoji === emoji);
        if (reactionEntry) {
          const userIndex = reactionEntry.users.indexOf(username);
          if (userIndex > -1) {
            reactionEntry.users.splice(userIndex, 1);
            if (reactionEntry.users.length === 0) {
              found.message.reactions = found.message.reactions.filter(r => r.emoji !== emoji);
            }
          } else {
            reactionEntry.users.push(username);
          }
        } else {
          found.message.reactions.push({ emoji, users: [username] });
        }
        reactionsResult = found.message.reactions;
      }
    }

    if (reactionsResult) {
      io.to(room).emit('message:reacted', {
        messageId,
        room,
        reactions: reactionsResult
      });
      if (typeof callback === 'function') callback({ success: true, reactions: reactionsResult });
    } else {
      if (typeof callback === 'function') callback({ success: false, error: 'Message not found' });
    }
  });

  // 8. TYPING INDICATORS
  socket.on('typing:start', ({ room, username }) => {
    if (!room) return;
    socket.to(room).emit('typing:user_started', { room, username });
  });

  socket.on('typing:stop', ({ room, username }) => {
    if (!room) return;
    socket.to(room).emit('typing:user_stopped', { room, username });
  });

  // 9. DISCONNECT & PRESENCE CLEANUP
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
