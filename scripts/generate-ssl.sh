#!/bin/bash
set -e
COMMON_NAME="${1:-localhost}"
SSL_DIR="$(dirname "$0")/../nginx/ssl"
mkdir -p "$SSL_DIR"
openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
    -keyout "$SSL_DIR/selfsigned.key" \
    -out "$SSL_DIR/selfsigned.crt" \
    -subj "/C=RU/ST=Moscow/L=Moscow/O=Mosquit/CN=$COMMON_NAME" \
    -addext "subjectAltName=IP:127.0.0.1,DNS:localhost,DNS:$COMMON_NAME"
chmod 600 "$SSL_DIR/selfsigned.key"
chmod 644 "$SSL_DIR/selfsigned.crt"
echo "Done. Certificate info:"
openssl x509 -noout -subject -dates -in "$SSL_DIR/selfsigned.crt"
