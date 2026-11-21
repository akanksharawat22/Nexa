const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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

// Seed diverse default community members (no generic Alice/Bob)
const defaultPasswordHash = bcrypt.hashSync('Password123!', 10);

const defaultUsers = [
  {
    _id: 'user_alex',
    username: 'alex_rivera',
    displayName: 'Alex Rivera',
    avatar: 'avatar-1',
    password: defaultPasswordHash,
    bio: 'Building real-time distributed systems on Nexa. ⚡',
    status: 'online',
    lastSeen: new Date(),
    createdAt: new Date(Date.now() - 86400000 * 3)
  },
  {
    _id: 'user_maya',
    username: 'maya_chen',
    displayName: 'Maya Chen',
    avatar: 'avatar-3',
    password: defaultPasswordHash,
    bio: 'Product designer & frontend craft enthusiast. 🎨',
    status: 'online',
    lastSeen: new Date(),
    createdAt: new Date(Date.now() - 86400000 * 5)
  },
  {
    _id: 'user_liam',
    username: 'liam_patel',
    displayName: 'Liam Patel',
    avatar: 'avatar-2',
    password: defaultPasswordHash,
    bio: 'Full-stack engineer, cloud architecture & open protocols. 🚀',
    status: 'online',
    lastSeen: new Date(),
    createdAt: new Date(Date.now() - 86400000 * 7)
  },
  {
    _id: 'user_zara',
    username: 'zara_vance',
    displayName: 'Zara Vance',
    avatar: 'avatar-5',
    password: defaultPasswordHash,
    bio: 'AI researcher & distributed protocol nerd. 🔥',
    status: 'online',
    lastSeen: new Date(),
    createdAt: new Date(Date.now() - 86400000 * 2)
  },
  {
    _id: 'user_jordan',
    username: 'jordan_b',
    displayName: 'Jordan Blake',
    avatar: 'avatar-4',
    password: defaultPasswordHash,
    bio: 'Cybersecurity & open-source contributor. 👾',
    status: 'offline',
    lastSeen: new Date(Date.now() - 3600000 * 4),
    createdAt: new Date(Date.now() - 86400000 * 10)
  }
];

defaultUsers.forEach(u => {
  memoryStore.users.set(u.username, u);
});

// Seed welcoming channel conversation history
memoryStore.messages.set('general', [
  {
    _id: 'msg_gen_1',
    room: 'general',
    sender: { username: 'alex_rivera', displayName: 'Alex Rivera', avatar: 'avatar-1' },
    content: 'Welcome to Nexa! 🚀 Real-time WebSocket messaging is live.',
    isDirect: false,
    reactions: { '🚀': ['alex_rivera', 'maya_chen'] },
    readBy: [{ username: 'maya_chen', readAt: new Date() }],
    createdAt: new Date(Date.now() - 3600000 * 3)
  },
  {
    _id: 'msg_gen_2',
    room: 'general',
    sender: { username: 'maya_chen', displayName: 'Maya Chen', avatar: 'avatar-3' },
    content: 'Hey everyone! The dark mode theme and bouncy micro-animations feel super slick. 🎨',
    isDirect: false,
    reactions: { '❤️': ['alex_rivera', 'liam_patel'], '🔥': ['zara_vance'] },
    readBy: [{ username: 'alex_rivera', readAt: new Date() }],
    createdAt: new Date(Date.now() - 3600000 * 2)
  },
  {
    _id: 'msg_gen_3',
    room: 'general',
    sender: { username: 'liam_patel', displayName: 'Liam Patel', avatar: 'avatar-2' },
    content: 'Attachments, reactions, and threaded replies are working smoothly. Great work team!',
    isDirect: false,
    reactions: { '👏': ['alex_rivera'] },
    readBy: [],
    createdAt: new Date(Date.now() - 3600000 * 1)
  }
]);

memoryStore.messages.set('tech-talk', [
  {
    _id: 'msg_tech_1',
    room: 'tech-talk',
    sender: { username: 'alex_rivera', displayName: 'Alex Rivera', avatar: 'avatar-1' },
    content: 'Sockets are connected with JWT handshake authentication and dual-persistence fallback.',
    isDirect: false,
    reactions: { '⚡': ['zara_vance'] },
    readBy: [],
    createdAt: new Date(Date.now() - 3600000 * 4)
  },
  {
    _id: 'msg_tech_2',
    room: 'tech-talk',
    sender: { username: 'zara_vance', displayName: 'Zara Vance', avatar: 'avatar-5' },
    content: 'The canonical DM routing dm:userA--userB ensures deterministic rooms. Very clean architecture.',
    isDirect: false,
    reactions: { '💯': ['alex_rivera', 'liam_patel'] },
    readBy: [],
    createdAt: new Date(Date.now() - 3600000 * 2)
  }
]);

let isMongooseConnected = false;

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/nexa';
  
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
