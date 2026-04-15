const express = require('express');
const router = express.Router();
const { body, param, validationResult } = require('express-validator');
const fetch = require('node-fetch');
const db = require('../db');
const { authenticate, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const path = require('path');
const fs = require('fs');
 
const adminOnly = [authenticate, requireRole('admin')];
const supportOrAdmin = [authenticate, requireRole('support', 'admin')];
 
// ─── Dashboard ───────────────────────────────────────────────────────────────
 
router.get('/dashboard', adminOnly, async (req, res, next) => {
  try {
    const [carsCount, bookingsCount, chatsCount, revenue, bookingsByDay, revenueByMonth] = await Promise.all([
      db.query('SELECT COUNT(*) FROM cars WHERE is_available = true'),
      db.query("SELECT COUNT(*) FROM bookings WHERE status IN ('new','confirmed','active')"),
      db.query("SELECT COUNT(*) FROM chat_sessions WHERE status = 'open'"),
      db.query(`
        SELECT COALESCE(SUM(total_price), 0) as total
        FROM bookings
        WHERE status != 'cancelled'
          AND date_trunc('month', created_at) = date_trunc('month', NOW())
      `),
      db.query(`
        SELECT date_trunc('day', created_at)::date as day, COUNT(*) as count
        FROM bookings
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY day ORDER BY day
      `),
      db.query(`
        SELECT date_trunc('month', created_at)::date as month,
               COALESCE(SUM(total_price), 0) as revenue
        FROM bookings
        WHERE status != 'cancelled' AND created_at >= NOW() - INTERVAL '12 months'
        GROUP BY month ORDER BY month
      `),
    ]);
 
    res.json({
      cars_count: parseInt(carsCount.rows[0].count),
      bookings_count: parseInt(bookingsCount.rows[0].count),
      chats_count: parseInt(chatsCount.rows[0].count),
      revenue_month: parseFloat(revenue.rows[0].total),
      bookings_by_day: bookingsByDay.rows,
      revenue_by_month: revenueByMonth.rows,
    });
  } catch (err) {
    next(err);
  }
});
 
// ─── Cars ─────────────────────────────────────────────────────────────────────
 
router.get('/cars', adminOnly, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT c.*,
        (SELECT url FROM car_photos WHERE car_id = c.id AND is_main = true LIMIT 1) as main_photo,
        (SELECT COUNT(*) FROM bookings WHERE car_id = c.id) as total_bookings
       FROM cars c ORDER BY c.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});
 
router.post('/cars', adminOnly, [
  body('brand').trim().notEmpty().withMessage('Марка обязательна'),
  body('model').trim().notEmpty().withMessage('Модель обязательна'),
  body('year').isInt({ min: 1990, max: 2030 }).withMessage('Некорректный год'),
  body('car_class').isIn(['economy', 'comfort', 'business', 'premium']).withMessage('Некорректный класс'),
  body('price_1day').isNumeric({ min: 0 }).withMessage('Некорректная цена'),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
 
  const {
    vin, brand, model, year, color, engine_volume, engine_power, engine_type,
    gearbox_type, gearbox_steps, drive_type, body_type, mileage, car_class,
    price_1day, price_3day, price_7day, price_30day, description, is_available,
  } = req.body;
 
  try {
    const { rows } = await db.query(
      `INSERT INTO cars (vin, brand, model, year, color, engine_volume, engine_power, engine_type,
        gearbox_type, gearbox_steps, drive_type, body_type, mileage, car_class,
        price_1day, price_3day, price_7day, price_30day, description, is_available)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
       RETURNING *`,
      [vin||null, brand, model, year, color||null, engine_volume||null, engine_power||null,
       engine_type||null, gearbox_type||null, gearbox_steps||null, drive_type||null,
       body_type||null, mileage||0, car_class, price_1day, price_3day||null,
       price_7day||null, price_30day||null, description||null, is_available !== false]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});
 
router.put('/cars/:id', adminOnly, async (req, res, next) => {
  const { id } = req.params;
  const {
    vin, brand, model, year, color, engine_volume, engine_power, engine_type,
    gearbox_type, gearbox_steps, drive_type, body_type, mileage, car_class,
    price_1day, price_3day, price_7day, price_30day, description, is_available,
  } = req.body;
 
  try {
    const { rows } = await db.query(
      `UPDATE cars SET
        vin=$1, brand=$2, model=$3, year=$4, color=$5,
        engine_volume=$6, engine_power=$7, engine_type=$8,
        gearbox_type=$9, gearbox_steps=$10, drive_type=$11,
        body_type=$12, mileage=$13, car_class=$14,
        price_1day=$15, price_3day=$16, price_7day=$17, price_30day=$18,
        description=$19, is_available=$20
       WHERE id=$21 RETURNING *`,
      [vin||null, brand, model, year, color||null, engine_volume||null, engine_power||null,
       engine_type||null, gearbox_type||null, gearbox_steps||null, drive_type||null,
       body_type||null, mileage||0, car_class, price_1day, price_3day||null,
       price_7day||null, price_30day||null, description||null, is_available !== false, id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Автомобиль не найден' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});
 
router.delete('/cars/:id', adminOnly, async (req, res, next) => {
  const { id } = req.params;
  try {
    // Delete photos from disk
    const photos = await db.query('SELECT url FROM car_photos WHERE car_id = $1', [id]);
    photos.rows.forEach(p => {
      const filePath = path.join(__dirname, '../uploads', path.basename(p.url));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });
    await db.query('DELETE FROM cars WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
 
// VIN lookup
router.post('/cars/vin-lookup', adminOnly, [
  body('vin').trim().isLength({ min: 17, max: 17 }).withMessage('VIN должен содержать 17 символов'),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
 
  const { vin } = req.body;
  const apiKey = process.env.VIN_API_KEY;
 
  if (!apiKey) {
    return res.status(503).json({ error: 'VIN API не настроен' });
  }
 
  try {
    const response = await fetch(
      `https://api.api-ninjas.com/v1/vinlookup?vin=${vin.toUpperCase()}`,
      { headers: { 'X-Api-Key': apiKey }, timeout: 8000 }
    );
 
    if (!response.ok) {
      return res.status(502).json({ error: 'Ошибка запроса к VIN API' });
    }
 
    const data = await response.json();
    if (!data || data.error) {
      return res.status(404).json({ error: 'VIN не найден' });
    }
 
    res.json({
      brand: data.make || '',
      model: data.model || '',
      year: data.year || '',
      engine_type: (data.fuel_type || '').toLowerCase().includes('diesel') ? 'diesel'
        : (data.fuel_type || '').toLowerCase().includes('electric') ? 'electric'
        : (data.fuel_type || '').toLowerCase().includes('hybrid') ? 'hybrid'
        : 'petrol',
      gearbox_type: (data.transmission || '').toLowerCase().includes('auto') ? 'auto' : 'manual',
      body_type: (data.body || '').toLowerCase(),
      color: data.basic_info?.color || '',
      engine_volume: data.displacement ? (data.displacement / 1000).toFixed(1) : '',
      engine_power: data.horsepower || '',
    });
  } catch (err) {
    next(err);
  }
});
 
// Photos upload
router.post('/cars/:id/photos', adminOnly, upload.array('photos', 10), async (req, res, next) => {
  const { id } = req.params;
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Загрузите хотя бы одно фото' });
  }
 
  try {
    const carCheck = await db.query('SELECT id FROM cars WHERE id = $1', [id]);
    if (!carCheck.rows[0]) return res.status(404).json({ error: 'Автомобиль не найден' });
 
    const existingPhotos = await db.query(
      'SELECT COUNT(*) FROM car_photos WHERE car_id = $1',
      [id]
    );
    const hasMain = parseInt(existingPhotos.rows[0].count) === 0;
 
    const savedPhotos = [];
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      const url = `/static/uploads/${file.filename}`;
      const isMain = hasMain && i === 0;
      const { rows } = await db.query(
        'INSERT INTO car_photos (car_id, url, sort_order, is_main) VALUES ($1,$2,$3,$4) RETURNING *',
        [id, url, i, isMain]
      );
      savedPhotos.push(rows[0]);
    }
 
    res.status(201).json(savedPhotos);
  } catch (err) {
    next(err);
  }
});
 
router.delete('/cars/:carId/photos/:photoId', adminOnly, async (req, res, next) => {
  const { carId, photoId } = req.params;
  try {
    const { rows } = await db.query(
      'SELECT * FROM car_photos WHERE id = $1 AND car_id = $2',
      [photoId, carId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Фото не найдено' });
 
    const filePath = path.join(__dirname, '../uploads', path.basename(rows[0].url));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
 
    await db.query('DELETE FROM car_photos WHERE id = $1', [photoId]);
 
    if (rows[0].is_main) {
      await db.query(
        `UPDATE car_photos SET is_main = true
         WHERE car_id = $1 AND id = (SELECT id FROM car_photos WHERE car_id = $1 ORDER BY sort_order LIMIT 1)`,
        [carId]
      );
    }
 
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
 
router.put('/cars/:carId/photos/:photoId/main', adminOnly, async (req, res, next) => {
  const { carId, photoId } = req.params;
  try {
    await db.query('UPDATE car_photos SET is_main = false WHERE car_id = $1', [carId]);
    await db.query('UPDATE car_photos SET is_main = true WHERE id = $1 AND car_id = $2', [photoId, carId]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
 
// ─── Bookings ─────────────────────────────────────────────────────────────────
 
router.get('/bookings', adminOnly, async (req, res, next) => {
  const { status, page = 1, limit = 20 } = req.query;
  const params = [];
  let where = '';
  if (status) {
    params.push(status);
    where = `WHERE b.status = $1`;
  }
  const offset = (parseInt(page) - 1) * parseInt(limit);
  params.push(parseInt(limit), offset);
 
  try {
    const countResult = await db.query(`SELECT COUNT(*) FROM bookings b ${where}`, params.slice(0, -2));
    const { rows } = await db.query(
      `SELECT b.*, c.brand, c.model, c.year
       FROM bookings b JOIN cars c ON c.id = b.car_id
       ${where}
       ORDER BY b.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
    res.json({ bookings: rows, total: parseInt(countResult.rows[0].count) });
  } catch (err) {
    next(err);
  }
});
 
router.put('/bookings/:id/status', adminOnly, [
  body('status').isIn(['new', 'confirmed', 'active', 'completed', 'cancelled']).withMessage('Некорректный статус'),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { id } = req.params;
  const { status } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE bookings SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Бронь не найдена' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});
 
// ─── Users ────────────────────────────────────────────────────────────────────
 
router.get('/users', adminOnly, async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT id, email, role, is_blocked, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});
 
router.put('/users/:id/role', adminOnly, [
  body('role').isIn(['user', 'support', 'admin']).withMessage('Некорректная роль'),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { id } = req.params;
  const { role } = req.body;
  try {
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Нельзя изменить собственную роль' });
    }
    const { rows } = await db.query(
      'UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, role, is_blocked',
      [role, id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});
 
router.put('/users/:id/block', adminOnly, async (req, res, next) => {
  const { id } = req.params;
  const { is_blocked } = req.body;
  try {
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Нельзя заблокировать собственный аккаунт' });
    }
    const { rows } = await db.query(
      'UPDATE users SET is_blocked = $1 WHERE id = $2 RETURNING id, email, role, is_blocked',
      [!!is_blocked, id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});
 
// ─── Settings ─────────────────────────────────────────────────────────────────
 
router.get('/settings', [authenticate, requireRole('support', 'admin')], async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT key, value FROM settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    next(err);
  }
});
 
router.put('/settings/theme', adminOnly, [
  body('primary').optional().matches(/^#[0-9A-Fa-f]{3,6}$/),
  body('primary_dark').optional().matches(/^#[0-9A-Fa-f]{3,6}$/),
  body('secondary').optional().matches(/^#[0-9A-Fa-f]{3,6}$/),
  body('bg').optional().matches(/^#[0-9A-Fa-f]{3,6}$/),
  body('accent').optional().matches(/^#[0-9A-Fa-f]{3,6}$/),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
 
  const { primary, primary_dark, secondary, bg, accent } = req.body;
  const updates = [
    ['theme.primary', primary],
    ['theme.primary_dark', primary_dark],
    ['theme.secondary', secondary],
    ['theme.bg', bg],
    ['theme.accent', accent],
  ].filter(([, v]) => v !== undefined);
 
  try {
    for (const [key, value] of updates) {
      await db.query(
        'UPDATE settings SET value = $1, updated_at = NOW() WHERE key = $2',
        [value, key]
      );
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
 
router.post('/settings/theme/reset', adminOnly, async (req, res, next) => {
  const defaults = [
    ['theme.primary', '#4A6741'],
    ['theme.primary_dark', '#3A5331'],
    ['theme.secondary', '#6B7280'],
    ['theme.bg', '#F3F4F6'],
    ['theme.accent', '#86EFAC'],
  ];
  try {
    for (const [key, value] of defaults) {
      await db.query('UPDATE settings SET value = $1 WHERE key = $2', [value, key]);
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
 
router.put('/settings/general', adminOnly, [
  body('site.name').optional().trim().isLength({ max: 100 }),
  body('site.phone').optional().trim().isLength({ max: 30 }),
  body('site.email').optional().isEmail(),
  body('site.address').optional().trim().isLength({ max: 255 }),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
 
  const allowed = ['site.name', 'site.phone', 'site.email', 'site.address', 'site.hero_title', 'site.hero_subtitle'];
  try {
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        await db.query(
          'UPDATE settings SET value = $1, updated_at = NOW() WHERE key = $2',
          [req.body[key], key]
        );
      }
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});
 
// Public settings endpoint (for frontend theme loading)
router.get('/settings/public', async (req, res, next) => {
  try {
    const { rows } = await db.query('SELECT key, value FROM settings');
    const settings = {};
    rows.forEach(r => { settings[r.key] = r.value; });
    res.json(settings);
  } catch (err) {
    next(err);
  }
});
 
module.exports = router;