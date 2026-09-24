const mongoose = require('mongoose');

// In-memory database fallback store if MongoDB server is unavailable
const memoryStore = {
  users: new Map(),
  rooms: new Map(),
  messages: new Map()
};

// Seed default rooms if empty
const defaultRooms = [
  { _id: 'general', name: 'general', topic: 'General Discussion & Community', createdAt: new Date() },
  { _id: 'tech-talk', name: 'tech-talk', topic: 'Architecture, Code & Systems', createdAt: new Date() },
  { _id: 'random', name: 'random', topic: 'Casual banter, memes & fun', createdAt: new Date() },
  { _id: 'design', name: 'design', topic: 'UI/UX Design & Craftsmanship', createdAt: new Date() }
];

defaultRooms.forEach(room => {
  memoryStore.rooms.set(room._id, room);
  memoryStore.messages.set(room._id, []);
});

let isMongooseConnected = false;

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pulse-chat';
  
  try {
    mongoose.set('strictQuery', false);
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 2000 // Quick timeout to fallback cleanly if MongoDB service is inactive
    });
    isMongooseConnected = true;
    console.log('✅ MongoDB connected successfully to:', mongoURI);
  } catch (err) {
    isMongooseConnected = false;
    console.log('⚡ Local MongoDB server not detected. Utilizing resilient in-memory database store.');
  }
};

const getIsMongooseConnected = () => isMongooseConnected;

module.exports = {
  connectDB,
  getIsMongooseConnected,
  memoryStore
};
