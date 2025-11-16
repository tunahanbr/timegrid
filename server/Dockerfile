FROM node:20-alpine AS base
WORKDIR /app

# Install production deps only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy server code and migrations
COPY server ./server

# Expose backend port
EXPOSE 3000

# Default command: run migrations then start server
CMD ["sh", "-c", "node server/run-migrations.js && node server/index.js"]