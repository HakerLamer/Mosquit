const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');
const logger = require('./middleware/logger');
 
const carsRouter = require('./routes/cars');
const bookingsRouter = require('./routes/bookings');
const chatRouter = require('./routes/chats');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');
 
const app = express();
const server = http.createServer(app);
 
// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? false
      : ['http://localhost:8080', 'http://127.0.0.1:8080'],
    credentials: true,
  },
});
 
// Make io accessible in routes
app.set('io', io);
 
// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? false
    : ['http://localhost:8080', 'http://127.0.0.1:8080'],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
 
// Static uploads
app.use('/static/uploads', express.static(path.join(__dirname, 'uploads')));
 
// Routes
app.use('/api/auth', authRouter);
app.use('/api/cars', carsRouter);
app.use('/api/bookings', bookingsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/admin', adminRouter);
 
// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
 
// Global error handler
app.use((err, req, res, next) => {
  logger.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production' && status === 500
    ? 'Внутренняя ошибка сервера'
    : err.message;
  res.status(status).json({ error: message });
});
 
// Socket.io chat logic
const chatSessions = new Map(); // sessionId -> { socketId, supportSocketId }
 
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);
 
  // User joins their chat session
  socket.on('join_session', async (sessionId) => {
    socket.join(`session:${sessionId}`);
    socket.sessionId = sessionId;
    socket.role = 'user';
 
    const db = require('./db');
    try {
      // Get or create chat session
      let session = await db.query(
        'SELECT * FROM chat_sessions WHERE session_id = $1',
        [sessionId]
      );
      if (session.rows.length === 0) {
        await db.query(
          'INSERT INTO chat_sessions (session_id, user_label, status) VALUES ($1, $2, $3)',
          [sessionId, `Гость #${sessionId.slice(-4)}`, 'open']
        );
      }
 
      // Send chat history
      const messages = await db.query(
        'SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
        [sessionId]
      );
      socket.emit('chat_history', messages.rows);
 
      // Notify support about new/active session
      io.to('support').emit('session_updated', { sessionId, action: 'join' });
    } catch (e) {
      logger.error('Socket join_session error:', e);
    }
  });
 
  // Support joins support room
  socket.on('join_support', (token) => {
    const jwt = require('jsonwebtoken');
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded.role === 'support' || decoded.role === 'admin') {
        socket.join('support');
        socket.role = decoded.role;
        socket.userId = decoded.id;
        socket.emit('support_ready', { message: 'Подключено к поддержке' });
      }
    } catch (e) {
      socket.emit('error', { message: 'Unauthorized' });
    }
  });
 
  // Support joins specific session
  socket.on('support_join_session', (sessionId) => {
    if (socket.role === 'support' || socket.role === 'admin') {
      socket.join(`session:${sessionId}`);
      socket.currentSession = sessionId;
    }
  });
 
  // Send message
  socket.on('send_message', async (data) => {
    const { sessionId, text, role } = data;
    if (!sessionId || !text || !text.trim()) return;
 
    const db = require('./db');
    try {
      const result = await db.query(
        `INSERT INTO chat_messages (session_id, role, text, is_read)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [sessionId, role || 'user', text.trim(), false]
      );
      const message = result.rows[0];
 
      // Broadcast to session room
      io.to(`session:${sessionId}`).emit('new_message', message);
 
      // If user sent, notify all support
      if (role === 'user') {
        io.to('support').emit('session_updated', {
          sessionId,
          action: 'new_message',
          message,
        });
        // Mark session as open if closed
        await db.query(
          `UPDATE chat_sessions SET status = 'open', updated_at = NOW()
           WHERE session_id = $1`,
          [sessionId]
        );
      } else {
        // Mark messages as read for this session
        await db.query(
          `UPDATE chat_messages SET is_read = true
           WHERE session_id = $1 AND role = 'user'`,
          [sessionId]
        );
      }
    } catch (e) {
      logger.error('Socket send_message error:', e);
    }
  });
 
  // Mark messages as read
  socket.on('mark_read', async (sessionId) => {
    const db = require('./db');
    try {
      await db.query(
        `UPDATE chat_messages SET is_read = true
         WHERE session_id = $1 AND role = 'user'`,
        [sessionId]
      );
    } catch (e) {
      logger.error('Socket mark_read error:', e);
    }
  });
 
  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
    if (socket.sessionId) {
      io.to('support').emit('session_updated', {
        sessionId: socket.sessionId,
        action: 'disconnect',
      });
    }
  });
});
 
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Mosquit backend running on port ${PORT}`);
});

