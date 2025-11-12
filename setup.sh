#!/bin/bash

echo "🚀 Setting up PostgreSQL Time Tracking Application"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
bun install

# Start PostgreSQL
echo "🐘 Starting PostgreSQL database..."
docker-compose up -d

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5

# Check if database is ready
until docker-compose exec -T postgres pg_isready -U timetrack > /dev/null 2>&1; do
    echo "   Still waiting..."
    sleep 2
done

echo "✅ PostgreSQL is ready!"
echo ""

# Migrations are automatically applied via docker-entrypoint-initdb.d
echo "✅ Database migrations applied automatically"
echo ""

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created"
else
    echo "ℹ️  .env file already exists"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Review your .env file"
echo "   2. Run 'bun run dev' to start the development server"
echo "   3. Access pgAdmin at http://localhost:5050"
echo "      - Email: admin@timetrack.local"
echo "      - Password: admin"
echo ""
echo "🔧 Useful commands:"
echo "   bun run db:up     - Start the database"
echo "   bun run db:down   - Stop the database"
echo "   bun run db:logs   - View database logs"
echo ""
