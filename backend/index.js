const path = require('path');
const express = require('express');
const http = require('http');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const { connectDB, getIsMongooseConnected } = require('./config/db');
const { initSocketManager } = require('./sockets/socketManager');

const authRoutes = require('./routes/authRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const roomRoutes = require('./routes/roomRoutes');
const messageRoutes = require('./routes/messageRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const server = http.createServer(app);

// 1. Security Headers Middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// 2. CORS & Body Parsers
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10mb' }));

// 3. Rate Limiting Protection
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60, // Limit auth attempts to 60 per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many authentication attempts, please try again later.' }
});

app.use('/api', generalLimiter);
app.use('/api/auth', authLimiter);

// 4. Serve Static Uploads and Frontend Build
const uploadsPath = path.join(__dirname, 'uploads');
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use('/uploads', express.static(uploadsPath));
app.use(express.static(frontendDistPath));

// 5. REST API Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);

// 6. Transparent Health & Persistence Diagnostics
app.get('/api/health', (req, res) => {
  const isMongo = getIsMongooseConnected();
  res.json({
    status: 'ok',
    storageMode: isMongo ? 'mongodb-persistent' : 'memory-store-fallback',
    persistentStorage: isMongo,
    engine: 'Socket.io + Express',
    timestamp: new Date()
  });
});

// 7. SPA Fallback Routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendDistPath, 'index.html'), (err) => {
    if (err) next();
  });
});

// 8. Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ success: false, error: 'Internal Server Error' });
});

// 9. Initialize Socket.io Manager
const io = initSocketManager(server);

const PORT = process.env.PORT || 5000;

// Connect DB then start server
connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🚀 Nexa Server running on http://localhost:${PORT}`);
    console.log(`💬 Socket.io Real-Time Engine Active`);
    console.log(`🔒 Authentication & Security Layer Active`);
    console.log(`==================================================`);
  });
});
