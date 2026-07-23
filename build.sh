#!/bin/bash
echo "📦 Building frontend..."
cd frontend
npm install
npm run build
echo "✅ Frontend built!"

echo "📦 Installing backend deps..."
cd ../backend
npm install
echo "✅ Backend ready!"

echo "🚀 Running migrations..."
npx knex migrate:latest
echo "✅ Migrations done!"
