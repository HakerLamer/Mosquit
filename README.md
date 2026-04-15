# Mosquit — Аренда автомобилей
 
Платформа для аренды автомобилей с каталогом машин, системой бронирования, онлайн-чатом поддержки и панелью администратора.
 
## Стек
 
- **Backend**: Node.js + Express.js
- **База данных**: PostgreSQL 16
- **Real-time**: Socket.io
- **Frontend**: HTML5 / Vanilla JS
- **Прокси**: Nginx (SSL, rate limiting, gzip)
- **Контейнеризация**: Docker + Docker Compose
---
 
## Быстрый старт (разработка)
 
### Требования
 
- [Docker](https://docs.docker.com/get-docker/) 20.10+
- [Docker Compose](https://docs.docker.com/compose/install/) v2+
- `make` (опционально, для удобных команд)
### 1. Клонировать репозиторий
 
```bash
git clone https://github.com/hakerlamer/mosquit.git
cd mosquit
```
 
### 2. Создать файл окружения
 
```bash
cp env.example .env
```
 
Отредактировать `.env` при необходимости (для разработки можно оставить как есть).
 
### 3. Запустить
 
```bash
make dev
# или напрямую:
docker-compose up --build
```
 
После запуска:
 
| Сервис   | Адрес                  |
|----------|------------------------|
| Frontend | http://localhost:8080  |
| Backend  | http://localhost:3000  |
 
### 4. Применить миграции и заполнить тестовыми данными
 
```bash
make migrate
make seed
```
 
Тестовые учётные данные после seed:
 
| Роль    | Email                  | Пароль      |
|---------|------------------------|-------------|
| Admin   | admin@carrent.ru       | admin123    |
| Support | support@carrent.ru     | support123  |
 
---
 
## Деплой в продакшн
 
### Требования
 
- VPS / выделенный сервер с Linux
- Публичный IP-адрес
- Домен, направленный A-записью на сервер
- Docker и Docker Compose установлены
### 1. Загрузить код на сервер
 
```bash
git clone https://github.com/hakerlamer/mosquit.git
cd mosquit
```
 
### 2. Настроить переменные окружения
 
```bash
cp env.example .env
```
 
Открыть `.env` и задать **все** значения:
 
```dotenv
POSTGRES_DB=carrent
POSTGRES_USER=carrent_user
POSTGRES_PASSWORD=<надёжный_пароль>
DATABASE_URL=postgresql://carrent_user:<надёжный_пароль>@postgres:5432/carrent
 
# Обязательно заменить на случайную строку (минимум 32 символа)
JWT_SECRET=<случайная_строка>
 
# API-ключ для проверки VIN (опционально)
VIN_API_KEY=<ключ>
 
NODE_ENV=production
```
 
Сгенерировать безопасный JWT_SECRET:
 
```bash
openssl rand -hex 32
```
 
### 3. Указать домен в nginx.conf
 
Открыть `nginx/nginx.conf` и заменить `yourdomain.ru` на свой домен:
 
```nginx
server_name yourdomain.ru www.yourdomain.ru;
ssl_certificate /etc/nginx/ssl/live/yourdomain.ru/fullchain.pem;
ssl_certificate_key /etc/nginx/ssl/live/yourdomain.ru/privkey.pem;
```
 
Также заменить домен в команде получения сертификата в `Makefile`:
 
```makefile
ssl:
    docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
        --webroot --webroot-path=/var/www/certbot \
        -d yourdomain.ru -d www.yourdomain.ru \
        --email admin@yourdomain.ru --agree-tos --no-eff-email
```
 
### 4. Получить SSL-сертификат (Let's Encrypt)
 
```bash
make ssl
```
 
Сертификаты сохранятся в `./certbot/conf/` и будут подмонтированы в контейнер nginx.
 
### 5. Запустить в продакшн-режиме
 
> **Важно:** продакшн-конфиг находится в файле `docker-copmpose.prod.yml`  
> (обратите внимание на опечатку в имени файла).
 
```bash
docker-compose -f docker-copmpose.prod.yml up -d --build
```
 
Или через make (команда `prod` указывает на `docker-compose.prod.yml` — убедитесь, что имя файла совпадает):
 
```bash
make prod
```
 
### 6. Применить миграции
 
```bash
make migrate
```
 
### 7. Создать учётную запись администратора
 
```bash
make create-admin
```
 
Скрипт запросит email и пароль в интерактивном режиме.
 
### 8. (Опционально) Обновить SSL-сертификат
 
```bash
make ssl-renew
```
 
Рекомендуется добавить в cron для автоматического обновления:
 
```bash
0 3 * * * cd /path/to/mosquit && make ssl-renew >> /var/log/certbot-renew.log 2>&1
```
 
---
 
## Переменные окружения
 
| Переменная          | Описание                                      | Пример                                                   |
|---------------------|-----------------------------------------------|----------------------------------------------------------|
| `POSTGRES_DB`       | Имя базы данных                               | `carrent`                                                |
| `POSTGRES_USER`     | Пользователь PostgreSQL                       | `carrent_user`                                           |
| `POSTGRES_PASSWORD` | Пароль PostgreSQL                             | `supersecretpassword`                                    |
| `DATABASE_URL`      | Строка подключения к БД                       | `postgresql://carrent_user:pass@postgres:5432/carrent`   |
| `JWT_SECRET`        | Секрет для подписи JWT-токенов                | случайная строка 32+ символа                             |
| `VIN_API_KEY`       | API-ключ для проверки VIN (опционально)       | —                                                        |
| `NODE_ENV`          | Режим работы приложения                       | `production` / `development`                             |
 
---
 
## Полезные команды (Makefile)
 
```bash
make dev            # Запустить в режиме разработки (с hot-reload)
make prod           # Запустить в продакшн-режиме
make migrate        # Применить миграции БД
make seed           # Заполнить тестовыми данными
make create-admin   # Создать администратора (интерактивно)
make logs           # Показать логи всех сервисов
make logs-backend   # Показать логи только backend
make ps             # Статус контейнеров
make down           # Остановить и удалить контейнеры
make down-v         # Остановить и удалить контейнеры вместе с томами (БД будет удалена!)
make shell-backend  # Открыть shell в контейнере backend
make shell-db       # Открыть psql в контейнере PostgreSQL
make ssl            # Получить SSL-сертификат через Let's Encrypt
make ssl-renew      # Обновить SSL-сертификат
```
 
---
 
## Архитектура
 
```
                        Internet
                           │
                       Nginx (:443)
                      /           \
              Frontend (:80)    Backend (:3000)
                                     │
                               PostgreSQL (:5432)
```
 
Nginx выступает единой точкой входа:
- `/api/*` и `/socket.io/*` → проксируется на backend
- `/` и статика → отдаётся frontend
- `/static/uploads/` → файлы загрузок (изображения авто)
---
 
## Роли пользователей
 
| Роль      | Описание                                              |
|-----------|-------------------------------------------------------|
| `user`    | Обычный пользователь: просмотр каталога, бронирование |
| `support` | Оператор поддержки: доступ к чату                     |
| `admin`   | Администратор: полный доступ, управление авто и брон. |