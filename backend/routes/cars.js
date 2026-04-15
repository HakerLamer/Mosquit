const express = require('express');
const router = express.Router();
const { query: validate, validationResult } = require('express-validator');
const db = require('../db');
 
// GET /api/cars
router.get('/', [
  validate('class').optional().isIn(['economy', 'comfort', 'business', 'premium']),
  validate('gearbox').optional().isIn(['auto', 'manual']),
  validate('body').optional().isIn(['sedan', 'suv', 'hatchback', 'wagon', 'minivan', 'coupe', 'convertible']),
  validate('price_min').optional().isNumeric(),
  validate('price_max').optional().isNumeric(),
  validate('sort').optional().isIn(['price_asc', 'price_desc', 'year_asc', 'year_desc', 'popular']),
  validate('search').optional().isString().trim().isLength({ max: 100 }),
  validate('page').optional().isInt({ min: 1 }),
  validate('limit').optional().isInt({ min: 1, max: 50 }),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
 
  const {
    class: carClass,
    gearbox,
    body,
    price_min,
    price_max,
    sort = 'price_asc',
    search,
    page = 1,
    limit = 12,
  } = req.query;
 
  const conditions = ['c.is_available = true'];
  const params = [];
 
  if (carClass) {
    params.push(carClass);
    conditions.push(`c.car_class = $${params.length}`);
  }
  if (gearbox) {
    params.push(gearbox);
    conditions.push(`c.gearbox_type = $${params.length}`);
  }
  if (body) {
    params.push(body);
    conditions.push(`c.body_type = $${params.length}`);
  }
  if (price_min) {
    params.push(parseFloat(price_min));
    conditions.push(`c.price_1day >= $${params.length}`);
  }
  if (price_max) {
    params.push(parseFloat(price_max));
    conditions.push(`c.price_1day <= $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(c.brand ILIKE $${params.length} OR c.model ILIKE $${params.length})`);
  }
 
  const sortMap = {
    price_asc: 'c.price_1day ASC',
    price_desc: 'c.price_1day DESC',
    year_asc: 'c.year ASC',
    year_desc: 'c.year DESC',
    popular: 'booking_count DESC',
  };
  const orderBy = sortMap[sort] || 'c.price_1day ASC';
 
  const offset = (parseInt(page) - 1) * parseInt(limit);
  params.push(parseInt(limit));
  params.push(offset);
 
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
 
  try {
    const countResult = await db.query(
      `SELECT COUNT(*) FROM cars c ${whereClause}`,
      params.slice(0, -2)
    );
 
    const carsResult = await db.query(
      `SELECT c.*,
        (SELECT url FROM car_photos WHERE car_id = c.id AND is_main = true LIMIT 1) as main_photo,
        (SELECT COUNT(*) FROM bookings WHERE car_id = c.id AND status != 'cancelled') as booking_count
       FROM cars c
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );
 
    res.json({
      cars: carsResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    next(err);
  }
});
 
// GET /api/cars/popular
router.get('/popular', async (req, res, next) => {
  try {
    const { rows } = await db.query(
      `SELECT c.*,
        (SELECT url FROM car_photos WHERE car_id = c.id AND is_main = true LIMIT 1) as main_photo,
        (SELECT COUNT(*) FROM bookings WHERE car_id = c.id AND status != 'cancelled') as booking_count
       FROM cars c
       WHERE c.is_available = true
       ORDER BY booking_count DESC, c.created_at DESC
       LIMIT 4`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});
 
// GET /api/cars/:id
router.get('/:id', async (req, res, next) => {
  const { id } = req.params;
  if (isNaN(parseInt(id))) return res.status(400).json({ error: 'Некорректный ID' });
 
  try {
    const carResult = await db.query('SELECT * FROM cars WHERE id = $1', [id]);
    if (carResult.rows.length === 0) {
      return res.status(404).json({ error: 'Автомобиль не найден' });
    }
    const car = carResult.rows[0];
 
    const photosResult = await db.query(
      'SELECT * FROM car_photos WHERE car_id = $1 ORDER BY sort_order ASC, is_main DESC',
      [id]
    );
 
    res.json({ ...car, photos: photosResult.rows });
  } catch (err) {
    next(err);
  }
});
 
module.exports = router;