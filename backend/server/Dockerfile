FROM node:20-alpine AS base
WORKDIR /app

COPY package*.json ./
RUN npm install

# Copy server code and migrations
COPY . .

# Expose backend port
EXPOSE 3000

# Default command: run migrations then start server
CMD ["sh", "-c", "node run-migrations.js && node index.js"]