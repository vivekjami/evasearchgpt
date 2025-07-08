#!/bin/bash

# Production Build and Test Script
# This script builds the application and runs basic health checks

set -e  # Exit on any error

echo "🚀 Starting production build and test..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    print_warning ".env.local not found. Creating from .env.example..."
    cp .env.example .env.local
    print_warning "Please update .env.local with your actual API keys before deploying!"
fi

# Clean previous builds
print_status "Cleaning previous builds..."
npm run clean

# Install dependencies
print_status "Installing dependencies..."
npm ci

# Run linting
print_status "Running ESLint..."
npm run lint

# Run type checking
print_status "Running TypeScript type check..."
npm run type-check

# Build the application
print_status "Building application for production..."
npm run build

# Start the application in background for testing
print_status "Starting application for health checks..."
npm start &
SERVER_PID=$!

# Wait for server to start
print_status "Waiting for server to start..."
sleep 10

# Health check function
health_check() {
    local endpoint=$1
    local expected_status=$2
    
    print_status "Testing endpoint: $endpoint"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000$endpoint" || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        print_success "✅ $endpoint returned $response"
        return 0
    else
        print_error "❌ $endpoint returned $response (expected $expected_status)"
        return 1
    fi
}

# Wait a bit more for full startup
sleep 5

# Run health checks
print_status "Running health checks..."

# Basic health checks
health_check "/api/health" "200"
health_check "/api/healthcheck" "200"  
health_check "/api/analytics" "200"

# Check main pages
health_check "/" "200"
health_check "/analytics" "200"

# Test non-existent endpoint
health_check "/non-existent" "404"

# Stop the server
print_status "Stopping test server..."
kill $SERVER_PID 2>/dev/null || true

print_success "🎉 All health checks passed! Application is ready for deployment."

echo ""
echo "Next steps:"
echo "1. Update .env.local with your API keys"
echo "2. Deploy to Vercel: npm run deploy"
echo "3. Configure environment variables in Vercel dashboard"
echo "4. Set up custom domain (optional)"
echo ""

print_success "Build and test completed successfully! 🚀"
