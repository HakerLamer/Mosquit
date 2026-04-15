const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../db');
 
// POST /api/bookings
router.post('/', [
  body('car_id').isInt({ min: 1 }).withMessage('Некорректный ID автомобиля'),
  body('user_name').trim().isLength({ min: 2, max: 255 }).withMessage('Введите ФИО'),
  body('user_phone').trim().matches(/^\+?[\d\s\-\(\)]{7,20}$/).withMessage('Некорректный номер телефона'),
  body('user_email').isEmail().withMessage('Некорректный email'),
  body('date_start').isISO8601().withMessage('Некорректная дата начала'),
  body('date_end').isISO8601().withMessage('Некорректная дата окончания'),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
 
  const { car_id, user_name, user_phone, user_email, date_start, date_end } = req.body;
 
  const start = new Date(date_start);
  const end = new Date(date_end);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
 
  if (start < today) {
    return res.status(400).json({ error: 'Дата начала не может быть в прошлом' });
  }
  if (end <= start) {
    return res.status(400).json({ error: 'Дата окончания должна быть после даты начала' });
  }
 
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
 
  try {
    // Check car exists and available
    const carResult = await db.query(
      'SELECT * FROM cars WHERE id = $1 AND is_available = true',
      [car_id]
    );
    if (carResult.rows.length === 0) {
      return res.status(404).json({ error: 'Автомобиль не найден или недоступен' });
    }
    const car = carResult.rows[0];
 
    // Check conflicting bookings
    const conflict = await db.query(
      `SELECT id FROM bookings
       WHERE car_id = $1
         AND status NOT IN ('cancelled', 'completed')
         AND NOT (date_end <= $2 OR date_start >= $3)`,
      [car_id, date_start, date_end]
    );
    if (conflict.rows.length > 0) {
      return res.status(409).json({ error: 'Автомобиль уже забронирован на эти даты' });
    }
 
    // Calculate price
    let pricePerDay;
    if (days >= 30) pricePerDay = parseFloat(car.price_30day) || parseFloat(car.price_7day) || parseFloat(car.price_1day);
    else if (days >= 7) pricePerDay = parseFloat(car.price_7day) || parseFloat(car.price_1day);
    else if (days >= 3) pricePerDay = parseFloat(car.price_3day) || parseFloat(car.price_1day);
    else pricePerDay = parseFloat(car.price_1day);
 
    const total_price = (pricePerDay * days).toFixed(2);
 
    const { rows } = await db.query(
      `INSERT INTO bookings (car_id, user_name, user_phone, user_email, date_start, date_end, total_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [car_id, user_name.trim(), user_phone.trim(), user_email.toLowerCase(), date_start, date_end, total_price]
    );
 
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});
 
// GET /api/bookings/price-estimate
router.get('/price-estimate', async (req, res, next) => {
  const { car_id, date_start, date_end } = req.query;
  if (!car_id || !date_start || !date_end) {
    return res.status(400).json({ error: 'Необходимы car_id, date_start, date_end' });
  }
 
  const start = new Date(date_start);
  const end = new Date(date_end);
  if (end <= start) return res.status(400).json({ error: 'Некорректные даты' });
 
  const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
 
  try {
    const { rows } = await db.query(
      'SELECT price_1day, price_3day, price_7day, price_30day FROM cars WHERE id = $1',
      [car_id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Автомобиль не найден' });
    const car = rows[0];
 
    let pricePerDay;
    if (days >= 30) pricePerDay = parseFloat(car.price_30day) || parseFloat(car.price_7day) || parseFloat(car.price_1day);
    else if (days >= 7) pricePerDay = parseFloat(car.price_7day) || parseFloat(car.price_1day);
    else if (days >= 3) pricePerDay = parseFloat(car.price_3day) || parseFloat(car.price_1day);
    else pricePerDay = parseFloat(car.price_1day);
 
    res.json({ days, price_per_day: pricePerDay, total: pricePerDay * days });
  } catch (err) {
    next(err);
  }
});
 
module.exports = router;