FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN mkdir -p uploads
EXPOSE 3000
CMD ["sh", "-c", "node db/migrate.js && node server.js"]
