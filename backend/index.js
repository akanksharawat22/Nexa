const path = require('path');
const express = require('express');
const http = require('http');
const cors = require('cors');
require('dotenv').config();

const { connectDB } = require('./config/db');
const { initSocketManager } = require('./sockets/socketManager');

const roomRoutes = require('./routes/roomRoutes');
const messageRoutes = require('./routes/messageRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend build if present
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

// API Routes (Decoupled from Sockets)
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// SPA fallback routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) next();
  });
});

// Initialize Socket.io Manager
const io = initSocketManager(server);

const PORT = process.env.PORT || 5000;

// Connect DB then start server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🚀 PulseChat Server running on http://localhost:${PORT}`);
    console.log(`💬 Socket.io Real-Time Engine Active`);
    console.log(`==================================================`);
  });
});
