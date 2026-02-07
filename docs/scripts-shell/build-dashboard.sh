#!/bin/bash
# ERDMS Dashboard Build & Deploy Script
# Usage: ./build-dashboard.sh [--prod|--dev] [--deploy|--no-deploy]

set -e

ENVIRONMENT="dev"
DEPLOY="false"
VERSION=$(date +%Y%m%d-%H%M%S)

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --prod)
            ENVIRONMENT="prod"
            shift
            ;;
        --dev)
            ENVIRONMENT="dev"
            shift
            ;;
        --deploy)
            DEPLOY="true"
            shift
            ;;
        --no-deploy)
            DEPLOY="false"
            shift
            ;;
        *)
            echo "Unknown option $1"
            echo "Usage: $0 [--prod|--dev] [--deploy|--no-deploy]"
            exit 1
            ;;
    esac
done

echo "════════════════════════════════════════════"
echo "🏠 ERDMS Dashboard Build"
echo "════════════════════════════════════════════"
echo "Environment: ${ENVIRONMENT}"
echo "Deploy: ${DEPLOY}"
echo "Version: ${VERSION}"
echo ""

# Build Dashboard
echo "📱 Building Dashboard..."
cd /var/www/erdms-dev/dashboard

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm ci
fi

# Build
echo "🔨 Building React app..."
npm run build

if [ "$DEPLOY" = "true" ] && [ "$ENVIRONMENT" = "prod" ]; then
    echo ""
    echo "🚀 Deploying to Production..."
    
    # Backup current production
    if [ -d "/var/www/erdms-platform/apps/dashboard" ]; then
        echo "💾 Creating backup..."
        cp -r /var/www/erdms-platform/apps/dashboard /var/www/erdms-platform/backups/dashboard-backup-${VERSION}
    fi
    
    # Deploy new build
    echo "📁 Copying build to production..."
    rm -rf /var/www/erdms-platform/apps/dashboard/*
    cp -r build/* /var/www/erdms-platform/apps/dashboard/
    
    # Set permissions
    chown -R www-data:www-data /var/www/erdms-platform/apps/dashboard/
    
    # Reload Apache
    echo "🔄 Reloading Apache..."
    systemctl reload apache2
    
    echo ""
    echo "✅ Dashboard deployed to Production!"
    echo "🌐 URL: https://erdms.zachranka.cz"
    
elif [ "$DEPLOY" = "true" ] && [ "$ENVIRONMENT" = "dev" ]; then
    echo ""
    echo "ℹ️  Dashboard dev build completed (no deployment needed for dev)"
    
else
    echo ""
    echo "ℹ️  Build completed without deployment"
fi

echo ""
echo "════════════════════════════════════════════"
echo "✅ Dashboard build finished!"
echo "════════════════════════════════════════════"
echo "Build location: /var/www/erdms-dev/dashboard/build"
if [ "$DEPLOY" = "true" ] && [ "$ENVIRONMENT" = "prod" ]; then
    echo "Production location: /var/www/erdms-platform/apps/dashboard"
fi
echo ""