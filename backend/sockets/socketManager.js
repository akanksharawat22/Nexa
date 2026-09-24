const { Server } = require('socket.io');
const { setupChatHandlers } = require('./chatHandler');

const initSocketManager = (server) => {
  const io = new Server(server, {
    cors: {
      origin: '*', // Allow all origins for dev simplicity
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    setupChatHandlers(io, socket);
  });

  return io;
};

module.exports = {
  initSocketManager
};
