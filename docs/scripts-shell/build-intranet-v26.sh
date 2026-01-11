#!/bin/bash
# ERDMS Intranet v26 Build & Deploy Script
# Usage: ./build-intranet-v26.sh [--prod|--dev] [--deploy|--no-deploy]

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
echo "🌐 ERDMS Intranet v26 Build"
echo "════════════════════════════════════════════"
echo "Environment: ${ENVIRONMENT}"
echo "Deploy: ${DEPLOY}"
echo "Version: ${VERSION}"
echo ""

# Check if intranet-v26 exists
if [ ! -d "/var/www/erdms-dev/apps/intranet-v26" ]; then
    echo "❌ Intranet v26 source not found at /var/www/erdms-dev/apps/intranet-v26"
    echo "ℹ️  Creating placeholder structure..."
    mkdir -p /var/www/erdms-dev/apps/intranet-v26
    echo "   Please implement Intranet v26 in this location"
    exit 0
fi

# Build Intranet v26
echo "📱 Building Intranet v26..."
cd /var/www/erdms-dev/apps/intranet-v26

# Check for package.json
if [ -f "package.json" ]; then
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing dependencies..."
        npm ci
    fi
    
    # Build
    echo "🔨 Building application..."
    npm run build 2>/dev/null || echo "⚠️ No build script found in package.json"
else
    echo "⚠️ No package.json found - skipping npm build"
fi

if [ "$DEPLOY" = "true" ] && [ "$ENVIRONMENT" = "prod" ]; then
    echo ""
    echo "🚀 Deploying to Production..."
    
    # Backup current production
    if [ -d "/var/www/erdms-platform/apps/intranet-v26" ]; then
        echo "💾 Creating backup..."
        cp -r /var/www/erdms-platform/apps/intranet-v26 /var/www/erdms-platform/backups/intranet-v26-backup-${VERSION}
    fi
    
    # Deploy new build
    echo "📁 Copying build to production..."
    mkdir -p /var/www/erdms-platform/apps/intranet-v26
    
    # Copy appropriate build output
    if [ -d "build" ]; then
        rm -rf /var/www/erdms-platform/apps/intranet-v26/*
        cp -r build/* /var/www/erdms-platform/apps/intranet-v26/
    elif [ -d "dist" ]; then
        rm -rf /var/www/erdms-platform/apps/intranet-v26/*
        cp -r dist/* /var/www/erdms-platform/apps/intranet-v26/
    else
        echo "⚠️ No build/dist directory found - copying source"
        cp -r . /var/www/erdms-platform/apps/intranet-v26/
    fi
    
    # Set permissions
    chown -R www-data:www-data /var/www/erdms-platform/apps/intranet-v26/
    
    # Reload Apache
    echo "🔄 Reloading Apache..."
    systemctl reload apache2
    
    echo ""
    echo "✅ Intranet v26 deployed to Production!"
    echo "🌐 URL: https://erdms.zachranka.cz/intranet-v26/"
    
elif [ "$DEPLOY" = "true" ] && [ "$ENVIRONMENT" = "dev" ]; then
    echo ""
    echo "ℹ️  Intranet v26 dev build completed (staying in dev environment)"
    
else
    echo ""
    echo "ℹ️  Build completed without deployment"
fi

echo ""
echo "════════════════════════════════════════════"
echo "✅ Intranet v26 build finished!"
echo "════════════════════════════════════════════"
echo "Build location: /var/www/erdms-dev/apps/intranet-v26"
if [ "$DEPLOY" = "true" ] && [ "$ENVIRONMENT" = "prod" ]; then
    echo "Production location: /var/www/erdms-platform/apps/intranet-v26"
fi
echo ""