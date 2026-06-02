#!/bin/bash
# Installation script for Cartão Inteligente

echo "🚀 Installing Cartão Inteligente dependencies..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing npm packages..."
npm install

# Install additional packages for backend integration
echo "📦 Installing Supabase and data fetching libraries..."
npm install \
  @supabase/supabase-js \
  @supabase/auth-helpers-nextjs \
  @tanstack/react-query \
  zod \
  react-hook-form \
  sonner

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Copy .env.example to .env.local"
echo "2. Add your Supabase credentials to .env.local"
echo "3. Run: npm run dev"
echo "4. Open http://localhost:3000"
