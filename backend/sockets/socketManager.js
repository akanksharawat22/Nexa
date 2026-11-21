const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/authMiddleware');
const { setupChatHandlers } = require('./chatHandler');

const initSocketManager = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Socket Authentication Middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        socket.user = decoded; // { userId, username }
        socket.isAuthenticated = true;
      } catch (err) {
        socket.isAuthenticated = false;
      }
    } else {
      socket.isAuthenticated = false;
    }
    next();
  });

  io.on('connection', (socket) => {
    setupChatHandlers(io, socket);
  });

  return io;
};

module.exports = {
  initSocketManager
};
