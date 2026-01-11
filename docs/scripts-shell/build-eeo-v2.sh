#!/bin/bash
# ERDMS EEO v2 Build Script with DEV/PROD separation
# Usage: ./build-eeo-v2.sh [--prod|--dev] [--frontend|--backend|--all] [--deploy|--no-deploy]

set -e

ENVIRONMENT="dev"
COMPONENT="all"
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
        --frontend|--fe)
            COMPONENT="frontend"
            shift
            ;;
        --backend|--be)
            COMPONENT="backend"
            shift
            ;;
        --all)
            COMPONENT="all"
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
            echo "Usage: $0 [--prod|--dev] [--frontend|--backend|--all] [--deploy|--no-deploy]"
            exit 1
            ;;
    esac
done

echo "════════════════════════════════════════════"
echo "📋 ERDMS EEO v2 Build"
echo "════════════════════════════════════════════"
echo "Environment: ${ENVIRONMENT}"
echo "Component: ${COMPONENT}"
echo "Deploy: ${DEPLOY}"
echo "Version: ${VERSION}"
echo ""

# Frontend build
if [ "$COMPONENT" = "frontend" ] || [ "$COMPONENT" = "all" ]; then
    echo "📱 Building EEO v2 Frontend..."
    cd /var/www/erdms-dev/apps/eeo-v2/client
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "📦 Installing frontend dependencies..."
        npm ci
    fi
    
    # Build frontend
    echo "🔨 Building React app..."
    npm run build
    
    if [ "$ENVIRONMENT" = "dev" ]; then
        echo "🔄 DEV: Frontend build stays in dev environment"
        echo "   Location: /var/www/erdms-dev/apps/eeo-v2/client/build"
        
    elif [ "$ENVIRONMENT" = "prod" ] && [ "$DEPLOY" = "true" ]; then
        echo "🚀 PROD: Deploying frontend to production..."
        
        # Backup current production
        if [ -d "/var/www/erdms-platform/apps/eeo-v2/client" ]; then
            echo "💾 Creating frontend backup..."
            cp -r /var/www/erdms-platform/apps/eeo-v2 /var/www/erdms-platform/backups/eeo-v2-backup-${VERSION}
        fi
        
        # Deploy frontend
        echo "📁 Copying frontend build to production..."
        mkdir -p /var/www/erdms-platform/apps/eeo-v2/client
        rm -rf /var/www/erdms-platform/apps/eeo-v2/client/*
        cp -r build/* /var/www/erdms-platform/apps/eeo-v2/client/
        
        # Set permissions
        chown -R www-data:www-data /var/www/erdms-platform/apps/eeo-v2/client/
        
        echo "✅ EEO v2 Frontend deployed to production"
    fi
fi

# Backend deployment
if [ "$COMPONENT" = "backend" ] || [ "$COMPONENT" = "all" ]; then
    echo ""
    echo "📡 Processing EEO v2 Backend..."
    
    if [ "$ENVIRONMENT" = "prod" ] && [ "$DEPLOY" = "true" ]; then
        echo "🚀 PROD: Deploying backend to production..."
        
        # Stop EEO API service
        echo "🛑 Stopping EEO API service..."
        systemctl stop erdms-eeo-api.service 2>/dev/null || echo "⚠️ EEO API service not running"
        
        # Deploy backend
        echo "📁 Copying backend to production..."
        mkdir -p /var/www/erdms-platform/apps/eeo-v2/api
        cp -r /var/www/erdms-dev/apps/eeo-v2/api/src /var/www/erdms-platform/apps/eeo-v2/api/
        cp /var/www/erdms-dev/apps/eeo-v2/api/package*.json /var/www/erdms-platform/apps/eeo-v2/api/
        
        # Copy production environment
        if [ -f "/var/www/erdms-dev/apps/eeo-v2/api/.env.production" ]; then
            cp /var/www/erdms-dev/apps/eeo-v2/api/.env.production /var/www/erdms-platform/apps/eeo-v2/api/.env
        else
            cp /var/www/erdms-dev/auth-api/.env /var/www/erdms-platform/apps/eeo-v2/api/.env
        fi
        
        # Update production environment variables
        cd /var/www/erdms-platform/apps/eeo-v2/api
        sed -i 's/NODE_ENV=development/NODE_ENV=production/' .env
        sed -i 's/PORT=5000/PORT=4001/' .env
        sed -i 's|http://localhost|https://erdms.zachranka.cz|g' .env
        
        # Install production dependencies
        echo "📦 Installing backend production dependencies..."
        npm ci --production
        
        # Set permissions
        chown -R root:www-data /var/www/erdms-platform/apps/eeo-v2/api/
        
        # Start EEO API service
        echo "▶️ Starting EEO API service..."
        systemctl start erdms-eeo-api.service 2>/dev/null || echo "⚠️ EEO API service not configured"
        
        echo "✅ EEO v2 Backend deployed to production"
        
    elif [ "$ENVIRONMENT" = "dev" ]; then
        echo "🔄 DEV: Backend stays in dev environment"
        echo "   Location: /var/www/erdms-dev/apps/eeo-v2/api"
    fi
fi

# Reload Apache if frontend was deployed
if [ "$ENVIRONMENT" = "prod" ] && [ "$DEPLOY" = "true" ] && ([ "$COMPONENT" = "frontend" ] || [ "$COMPONENT" = "all" ]); then
    echo ""
    echo "🔄 Reloading Apache..."
    systemctl reload apache2
fi

echo ""
echo "════════════════════════════════════════════"
echo "✅ EEO v2 build finished!"
echo "════════════════════════════════════════════"
if [ "$ENVIRONMENT" = "dev" ]; then
    echo "Dev Frontend: /var/www/erdms-dev/apps/eeo-v2/client/build"
    echo "Dev Backend: /var/www/erdms-dev/apps/eeo-v2/api"
fi
if [ "$ENVIRONMENT" = "prod" ] && [ "$DEPLOY" = "true" ]; then
    echo "Prod Frontend: /var/www/erdms-platform/apps/eeo-v2/client"
    echo "Prod Backend: /var/www/erdms-platform/apps/eeo-v2/api"
    echo "🌐 URL: https://erdms.zachranka.cz/eeo-v2/"
fi
echo ""