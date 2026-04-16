-- Seed data for Mosquit Car Rental
 
-- Admin and support users (passwords: admin123, support123)
INSERT INTO users (email, password_hash, role) VALUES
  ('admin@carrent.ru', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
  ('support@carrent.ru', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'support')
ON CONFLICT (email) DO NOTHING;
 
-- Cars seed data
INSERT INTO cars (vin, brand, model, year, color, engine_volume, engine_power, engine_type, gearbox_type, gearbox_steps, drive_type, body_type, mileage, car_class, price_1day, price_3day, price_7day, price_30day, description, is_available) VALUES
  (
    'WVWZZZ3BZ3E000001', 'Volkswagen', 'Polo', 2022, 'Белый',
    1.6, 110, 'petrol', 'auto', 6, 'front', 'sedan', 25000,
    'economy', 2500, 2200, 1900, 1600,
    'Экономичный и надёжный городской автомобиль. Идеально подходит для поездок по городу и за город. Кондиционер, мультируль, парковочные датчики.',
    true
  ),
  (
    'WVWZZZ3BZ3E000002', 'Kia', 'Rio', 2023, 'Серебристый',
    1.6, 123, 'petrol', 'auto', 6, 'front', 'sedan', 12000,
    'economy', 2700, 2400, 2100, 1800,
    'Современный городской седан с отличной топливной экономичностью. Камера заднего вида, климат-контроль, подогрев сидений.',
    true
  ),
  (
    'WVWZZZ3BZ3E000003', 'Toyota', 'Camry', 2022, 'Чёрный',
    2.5, 181, 'petrol', 'auto', 8, 'front', 'sedan', 18000,
    'comfort', 4500, 4000, 3500, 3000,
    'Просторный комфортный седан бизнес-класса. Кожаный салон, панорамная крыша, система предотвращения столкновений Toyota Safety Sense.',
    true
  ),
  (
    'WVWZZZ3BZ3E000004', 'Hyundai', 'Tucson', 2023, 'Синий',
    2.0, 150, 'petrol', 'auto', 6, 'all', 'suv', 8000,
    'comfort', 5200, 4700, 4200, 3600,
    'Стильный кроссовер с полным приводом. Большой багажник, высокая посадка, 7 подушек безопасности. Отлично для города и загородных поездок.',
    true
  ),
  (
    'WVWZZZ3BZ3E000005', 'BMW', '5 Series', 2022, 'Тёмно-серый',
    2.0, 249, 'petrol', 'auto', 8, 'rear', 'sedan', 22000,
    'business', 9500, 8500, 7500, 6500,
    'Флагманский бизнес-седан BMW. Адаптивная подвеска, система ассистирования водителя, премиальная акустика Harman Kardon. Для самых требовательных клиентов.',
    true
  ),
  (
    'WVWZZZ3BZ3E000006', 'Mercedes-Benz', 'E-Class', 2023, 'Белый перламутр',
    2.0, 258, 'petrol', 'auto', 9, 'rear', 'sedan', 5000,
    'business', 11000, 9800, 8500, 7200,
    'Представительский седан Mercedes-Benz E-Class. Массаж передних сидений, система ночного видения, проекционный дисплей. Максимальный комфорт.',
    true
  ),
  (
    'WVWZZZ3BZ3E000007', 'Range Rover', 'Sport', 2022, 'Зелёный',
    3.0, 400, 'diesel', 'auto', 8, 'all', 'suv', 31000,
    'premium', 18000, 16000, 14000, 12000,
    'Премиальный внедорожник Range Rover Sport. Пневматическая подвеска, кожа Meridian, система Terrain Response 2. Покоряет любое бездорожье.',
    true
  ),
  (
    'WVWZZZ3BZ3E000008', 'Porsche', 'Cayenne', 2023, 'Красный',
    3.0, 340, 'petrol', 'auto', 8, 'all', 'suv', 7000,
    'premium', 22000, 19500, 17000, 15000,
    'Спортивный премиальный кроссовер Porsche Cayenne. Динамика спорткара в сочетании с комфортом SUV. Bose Sound System, Sport Chrono Package.',
    true
  ),
  (
    'WVWZZZ3BZ3E000009', 'Volkswagen', 'Tiguan', 2022, 'Белый',
    2.0, 150, 'petrol', 'auto', 7, 'front', 'suv', 19000,
    'comfort', 5500, 4900, 4300, 3700,
    'Практичный семейный кроссовер. 7-местная версия с третьим рядом сидений, панорамная крыша, система помощи при парковке.',
    true
  ),
  (
    'WVWZZZ3BZ3E000010', 'Skoda', 'Octavia', 2023, 'Серый',
    1.5, 150, 'petrol', 'auto', 7, 'front', 'wagon', 4000,
    'comfort', 3800, 3400, 3000, 2600,
    'Вместительный универсал с большим багажником 640 л. Идеален для семейных поездок и путешествий. Адаптивный круиз-контроль, lane assist.',
    true
  );
