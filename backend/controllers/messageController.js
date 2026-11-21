const Message = require('../models/Message');
const { getIsMongooseConnected, memoryStore } = require('../config/db');

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

// 1. Get Messages for a Room or DM
const getRoomMessages = async (req, res) => {
  try {
    const { room } = req.params;
    const limit = parseInt(req.query.limit, 10) || 100;

    if (getIsMongooseConnected()) {
      const messages = await Message.find({ room })
        .sort({ timestamp: 1 })
        .limit(limit);
      return res.json({ success: true, data: messages });
    } else {
      const messages = memoryStore.messages.get(room) || [];
      return res.json({ success: true, data: messages });
    }
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ success: false, error: 'Server error fetching messages' });
  }
};

// 2. Search Messages by Keyword
const searchMessages = async (req, res) => {
  try {
    const { q, room } = req.query;
    if (!q || !q.trim()) {
      return res.json({ success: true, data: [] });
    }

    const keyword = q.trim();
    const query = {
      $or: [
        { content: { $regex: keyword, $options: 'i' } },
        { fileName: { $regex: keyword, $options: 'i' } }
      ]
    };

    if (room) {
      query.room = room;
    }

    if (getIsMongooseConnected()) {
      const results = await Message.find(query)
        .sort({ timestamp: -1 })
        .limit(50);
      return res.json({ success: true, data: results });
    } else {
      let allMessages = [];
      if (room) {
        allMessages = memoryStore.messages.get(room) || [];
      } else {
        for (const list of memoryStore.messages.values()) {
          allMessages = allMessages.concat(list);
        }
      }

      const lowerKey = keyword.toLowerCase();
      const filtered = allMessages
        .filter(m => 
          (m.content && m.content.toLowerCase().includes(lowerKey)) ||
          (m.fileName && m.fileName.toLowerCase().includes(lowerKey))
        )
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 50);

      return res.json({ success: true, data: filtered });
    }
  } catch (error) {
    console.error('Search Messages Error:', error);
    res.status(500).json({ success: false, error: 'Server error searching messages' });
  }
};

// 3. Mark Messages as Read
const markMessagesAsRead = async (req, res) => {
  try {
    const { room, username } = req.body;
    if (!room || !username) {
      return res.status(400).json({ success: false, error: 'Room and username required' });
    }

    if (getIsMongooseConnected()) {
      await Message.updateMany(
        { room, 'sender.username': { $ne: username }, 'readBy.username': { $ne: username } },
        { $push: { readBy: { username, readAt: new Date() } } }
      );
      return res.json({ success: true });
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
      return res.json({ success: true });
    }
  } catch (error) {
    console.error('Mark Read Error:', error);
    res.status(500).json({ success: false, error: 'Server error marking messages read' });
  }
};

// 4. Edit a Message
const editMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, username } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, error: 'Message content cannot be empty' });
    }

    if (getIsMongooseConnected()) {
      const msg = await Message.findById(id);
      if (!msg) {
        return res.status(404).json({ success: false, error: 'Message not found' });
      }
      if (msg.sender.username !== username) {
        return res.status(403).json({ success: false, error: 'Unauthorized to edit this message' });
      }
      if (msg.isDeleted) {
        return res.status(400).json({ success: false, error: 'Cannot edit a deleted message' });
      }

      msg.content = content.trim();
      msg.isEdited = true;
      msg.editedAt = new Date();
      await msg.save();

      return res.json({ success: true, data: msg });
    } else {
      const found = findMemoryMessage(id);
      if (!found) {
        return res.status(404).json({ success: false, error: 'Message not found' });
      }
      if (found.message.sender.username !== username) {
        return res.status(403).json({ success: false, error: 'Unauthorized to edit this message' });
      }
      if (found.message.isDeleted) {
        return res.status(400).json({ success: false, error: 'Cannot edit a deleted message' });
      }

      found.message.content = content.trim();
      found.message.isEdited = true;
      found.message.editedAt = new Date();

      return res.json({ success: true, data: found.message });
    }
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ success: false, error: 'Server error editing message' });
  }
};

// 5. Delete a Message
const deleteMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;

    if (getIsMongooseConnected()) {
      const msg = await Message.findById(id);
      if (!msg) {
        return res.status(404).json({ success: false, error: 'Message not found' });
      }
      if (msg.sender.username !== username) {
        return res.status(403).json({ success: false, error: 'Unauthorized to delete this message' });
      }

      msg.content = 'This message was deleted';
      msg.fileUrl = null;
      msg.isDeleted = true;
      msg.deletedAt = new Date();
      await msg.save();

      return res.json({ success: true, data: msg });
    } else {
      const found = findMemoryMessage(id);
      if (!found) {
        return res.status(404).json({ success: false, error: 'Message not found' });
      }
      if (found.message.sender.username !== username) {
        return res.status(403).json({ success: false, error: 'Unauthorized to delete this message' });
      }

      found.message.content = 'This message was deleted';
      found.message.fileUrl = null;
      found.message.isDeleted = true;
      found.message.deletedAt = new Date();

      return res.json({ success: true, data: found.message });
    }
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ success: false, error: 'Server error deleting message' });
  }
};

// 6. Toggle Emoji Reaction
const toggleReaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { emoji, username } = req.body;

    if (!emoji || !username) {
      return res.status(400).json({ success: false, error: 'Emoji and username required' });
    }

    if (getIsMongooseConnected()) {
      const msg = await Message.findById(id);
      if (!msg) {
        return res.status(404).json({ success: false, error: 'Message not found' });
      }
      if (msg.isDeleted) {
        return res.status(400).json({ success: false, error: 'Cannot react to deleted message' });
      }

      let reactionEntry = msg.reactions.find(r => r.emoji === emoji);
      if (reactionEntry) {
        const userIndex = reactionEntry.users.indexOf(username);
        if (userIndex > -1) {
          reactionEntry.users.splice(userIndex, 1);
          if (reactionEntry.users.length === 0) {
            msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
          }
        } else {
          reactionEntry.users.push(username);
        }
      } else {
        msg.reactions.push({ emoji, users: [username] });
      }

      await msg.save();
      return res.json({ success: true, data: msg.reactions });
    } else {
      const found = findMemoryMessage(id);
      if (!found) {
        return res.status(404).json({ success: false, error: 'Message not found' });
      }
      if (found.message.isDeleted) {
        return res.status(400).json({ success: false, error: 'Cannot react to deleted message' });
      }

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

      return res.json({ success: true, data: found.message.reactions });
    }
  } catch (error) {
    console.error('Error toggling reaction:', error);
    res.status(500).json({ success: false, error: 'Server error toggling reaction' });
  }
};

module.exports = {
  getRoomMessages,
  searchMessages,
  markMessagesAsRead,
  editMessage,
  deleteMessage,
  toggleReaction
};
