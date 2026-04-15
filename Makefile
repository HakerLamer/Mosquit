.PHONY: dev prod migrate logs down ssl seed
 
dev:
	docker-compose up --build
 
prod:
	docker-compose -f docker-compose.prod.yml up -d --build
 
migrate:
	docker-compose exec backend node db/migrate.js
 
seed:
	docker-compose exec backend node db/seed.js
 
logs:
	docker-compose logs -f
 
logs-backend:
	docker-compose logs -f backend
 
down:
	docker-compose down
 
down-v:
	docker-compose down -v
 
ssl:
	docker-compose -f docker-compose.prod.yml run --rm certbot certonly \
		--webroot --webroot-path=/var/www/certbot \
		-d yourdomain.ru -d www.yourdomain.ru \
		--email admin@yourdomain.ru --agree-tos --no-eff-email
 
ssl-renew:
	docker-compose -f docker-compose.prod.yml exec certbot certbot renew
 
create-admin:
	docker-compose exec backend node scripts/create-admin.js
 
ps:
	docker-compose ps
 
shell-backend:
	docker-compose exec backend sh
 
shell-db:
	docker-compose exec postgres psql -U carrent_user -d carrent