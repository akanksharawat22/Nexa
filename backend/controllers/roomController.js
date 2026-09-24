const Room = require('../models/Room');
const { getIsMongooseConnected, memoryStore } = require('../config/db');

// Default rooms to seed in MongoDB if empty
const defaultSeed = [
  { name: 'general', topic: 'General Discussion & Community' },
  { name: 'tech-talk', topic: 'Architecture, Code & Systems' },
  { name: 'random', topic: 'Casual banter, memes & fun' },
  { name: 'design', topic: 'UI/UX Design & Craftsmanship' }
];

const getRooms = async (req, res) => {
  try {
    if (getIsMongooseConnected()) {
      let rooms = await Room.find().sort({ createdAt: 1 });
      if (rooms.length === 0) {
        rooms = await Room.insertMany(defaultSeed);
      }
      return res.json({ success: true, data: rooms });
    } else {
      const rooms = Array.from(memoryStore.rooms.values());
      return res.json({ success: true, data: rooms });
    }
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ success: false, error: 'Server error fetching rooms' });
  }
};

const createRoom = async (req, res) => {
  try {
    const { name, topic } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Room name is required' });
    }

    const cleanName = name.trim().toLowerCase().replace(/\s+/g, '-');

    if (getIsMongooseConnected()) {
      const existing = await Room.findOne({ name: cleanName });
      if (existing) {
        return res.status(400).json({ success: false, error: 'Room name already exists' });
      }
      const newRoom = await Room.create({ name: cleanName, topic: topic || 'Custom chat channel' });
      return res.status(201).json({ success: true, data: newRoom });
    } else {
      if (memoryStore.rooms.has(cleanName)) {
        return res.status(400).json({ success: false, error: 'Room name already exists' });
      }
      const newRoom = {
        _id: cleanName,
        name: cleanName,
        topic: topic || 'Custom chat channel',
        createdAt: new Date()
      };
      memoryStore.rooms.set(cleanName, newRoom);
      memoryStore.messages.set(cleanName, []);
      return res.status(201).json({ success: true, data: newRoom });
    }
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ success: false, error: 'Server error creating room' });
  }
};

module.exports = {
  getRooms,
  createRoom
};
