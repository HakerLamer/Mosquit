-- Mosquit Car Rental Database Schema
 
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'support', 'admin')),
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
CREATE TABLE IF NOT EXISTS cars (
  id SERIAL PRIMARY KEY,
  vin VARCHAR(17),
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL,
  color VARCHAR(100),
  engine_volume NUMERIC(3,1),
  engine_power INTEGER,
  engine_type VARCHAR(20) CHECK (engine_type IN ('petrol', 'diesel', 'hybrid', 'electric')),
  gearbox_type VARCHAR(20) CHECK (gearbox_type IN ('auto', 'manual')),
  gearbox_steps INTEGER,
  drive_type VARCHAR(20) CHECK (drive_type IN ('front', 'rear', 'all')),
  body_type VARCHAR(30) CHECK (body_type IN ('sedan', 'suv', 'hatchback', 'wagon', 'minivan', 'coupe', 'convertible')),
  mileage INTEGER DEFAULT 0,
  car_class VARCHAR(20) CHECK (car_class IN ('economy', 'comfort', 'business', 'premium')),
  price_1day NUMERIC(10,2) NOT NULL,
  price_3day NUMERIC(10,2),
  price_7day NUMERIC(10,2),
  price_30day NUMERIC(10,2),
  description TEXT,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
CREATE TABLE IF NOT EXISTS car_photos (
  id SERIAL PRIMARY KEY,
  car_id INTEGER NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_main BOOLEAN NOT NULL DEFAULT false
);
 
CREATE TABLE IF NOT EXISTS bookings (
  id SERIAL PRIMARY KEY,
  car_id INTEGER NOT NULL REFERENCES cars(id),
  user_name VARCHAR(255) NOT NULL,
  user_phone VARCHAR(30) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  date_start DATE NOT NULL,
  date_end DATE NOT NULL,
  total_price NUMERIC(12,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'confirmed', 'active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
CREATE TABLE IF NOT EXISTS chat_sessions (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(64) UNIQUE NOT NULL,
  user_label VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'answered', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  session_id VARCHAR(64) NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'support', 'admin')),
  text TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(100) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
 
-- Indexes
CREATE INDEX IF NOT EXISTS idx_cars_class ON cars(car_class);
CREATE INDEX IF NOT EXISTS idx_cars_available ON cars(is_available);
CREATE INDEX IF NOT EXISTS idx_bookings_car ON bookings(car_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_read ON chat_messages(is_read);
 
-- Default settings
INSERT INTO settings (key, value) VALUES
  ('theme.primary', '#4A6741'),
  ('theme.primary_dark', '#3A5331'),
  ('theme.secondary', '#6B7280'),
  ('theme.bg', '#F3F4F6'),
  ('theme.accent', '#86EFAC'),
  ('site.name', 'Mosquit'),
  ('site.phone', '+7 (800) 123-45-67'),
  ('site.email', 'info@mosquit.ru'),
  ('site.address', 'Москва, ул. Автомобильная, 1'),
  ('site.hero_title', 'Аренда автомобилей в Москве'),
  ('site.hero_subtitle', 'Большой выбор автомобилей по выгодным ценам. Доставка по всей Москве 24/7.')
ON CONFLICT (key) DO NOTHING;