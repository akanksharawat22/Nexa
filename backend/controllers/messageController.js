const Message = require('../models/Message');
const { getIsMongooseConnected, memoryStore } = require('../config/db');

const getRoomMessages = async (req, res) => {
  try {
    const { room } = req.params;
    const limit = parseInt(req.query.limit, 10) || 50;

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
    console.error('Error fetching room messages:', error);
    res.status(500).json({ success: false, error: 'Server error fetching messages' });
  }
};

module.exports = {
  getRoomMessages
};
