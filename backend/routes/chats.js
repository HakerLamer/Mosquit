const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
 
// GET /api/chat/sessions — support/admin only
router.get('/sessions', authenticate, requireRole('support', 'admin'), async (req, res, next) => {
  const { status } = req.query;
  try {
    let query = `
      SELECT cs.*,
        (SELECT text FROM chat_messages WHERE session_id = cs.session_id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM chat_messages WHERE session_id = cs.session_id ORDER BY created_at DESC LIMIT 1) as last_message_at,
        (SELECT COUNT(*) FROM chat_messages WHERE session_id = cs.session_id AND is_read = false AND role = 'user') as unread_count
      FROM chat_sessions cs
    `;
    const params = [];
    if (status && req.user.role !== 'admin') {
      params.push('closed');
      query += ` WHERE cs.status != $1`;
    } else if (status) {
      params.push(status);
      query += ` WHERE cs.status = $1`;
    }
    query += ` ORDER BY last_message_at DESC NULLS LAST, cs.created_at DESC`;
 
    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});
 
// GET /api/chat/sessions/:sessionId/messages
router.get('/sessions/:sessionId/messages', authenticate, requireRole('support', 'admin'), async (req, res, next) => {
  const { sessionId } = req.params;
  try {
    const { rows } = await db.query(
      'SELECT * FROM chat_messages WHERE session_id = $1 ORDER BY created_at ASC',
      [sessionId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});
 
// PUT /api/chat/sessions/:sessionId/status
router.put('/sessions/:sessionId/status', authenticate, requireRole('support', 'admin'), async (req, res, next) => {
  const { sessionId } = req.params;
  const { status } = req.body;
  const validStatuses = ['open', 'answered', 'closed'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Некорректный статус' });
  }
  try {
    await db.query(
      'UPDATE chat_sessions SET status = $1, updated_at = NOW() WHERE session_id = $2',
      [status, sessionId]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
 
// GET /api/chat/unread-count (for user by sessionId)
router.get('/unread-count', async (req, res, next) => {
  const { session_id } = req.query;
  if (!session_id) return res.status(400).json({ error: 'session_id обязателен' });
  try {
    const { rows } = await db.query(
      `SELECT COUNT(*) FROM chat_messages
       WHERE session_id = $1 AND role != 'user' AND is_read = false`,
      [session_id]
    );
    res.json({ count: parseInt(rows[0].count) });
  } catch (err) {
    next(err);
  }
});
 
module.exports = router;