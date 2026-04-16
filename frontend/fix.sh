#!/bin/bash

echo "🔧 Fixing frontend paths..."

# Исправляем пути в HTML (css/js → /css /js)
find ./frontend -name "*.html" -type f -exec sed -i 's|href="css/|href="/css/|g' {} \;
find ./frontend -name "*.html" -type f -exec sed -i 's|src="js/|src="/js/|g' {} \;

echo "✅ HTML paths fixed"

# ==============================
# FIX NGINX CSP
# ==============================

echo "🔧 Fixing nginx CSP..."

NGINX_FILE="./nginx/nginx.conf"

if [ -f "$NGINX_FILE" ]; then
  sed -i '/Content-Security-Policy/d' $NGINX_FILE

  sed -i '/server {/a \
    add_header Content-Security-Policy "default-src '\''self'\''; script-src '\''self'\'' '\''unsafe-inline'\'' https://cdn.socket.io https://cdnjs.cloudflare.com; connect-src '\''self'\'' ws: wss:; style-src '\''self'\'' '\''unsafe-inline'\''; img-src '\''self'\'' data:;" always;' $NGINX_FILE

  echo "✅ CSP updated"
else
  echo "❌ nginx.conf not found"
fi

# ==============================
# FIX SOCKET.IO LOCATION
# ==============================

echo "🔧 Ensuring socket.io proxy..."

if ! grep -q "socket.io" $NGINX_FILE; then
  sed -i '/location \/api\//a \
    location /socket.io/ {\n\
        proxy_pass http://backend:3000;\n\
        proxy_http_version 1.1;\n\
        proxy_set_header Upgrade $http_upgrade;\n\
        proxy_set_header Connection "upgrade";\n\
    }' $NGINX_FILE

  echo "✅ socket.io proxy added"
fi

echo "🎉 Fix complete"
