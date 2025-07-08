#!/bin/bash

# Quick Deployment Script for EvaSearchGPT
# This script performs final checks and deploys to production

set -e

echo "🚀 EvaSearchGPT Quick Deploy"
echo "============================="

# Check if environment file exists
if [ ! -f ".env.local" ]; then
    echo "❌ .env.local not found! Please create it from .env.example"
    exit 1
fi

# Quick type check
echo "🔍 Running type check..."
npm run type-check

# Quick build test
echo "🏗️ Building application..."
npm run build

# Deploy to production
echo "🚀 Deploying to production..."
vercel --prod

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔗 Your app is now live!"
echo "📊 Check analytics at: [your-url]/analytics"
echo "🩺 Health check: [your-url]/api/health"
echo ""
echo "📋 Don't forget to:"
echo "  • Set environment variables in Vercel dashboard"
echo "  • Test all functionality on production"
echo "  • Monitor performance in analytics dashboard"
