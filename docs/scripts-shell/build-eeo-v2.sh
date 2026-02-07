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
    if [ "$ENVIRONMENT" = "dev" ]; then
        # ⚠️ KRITICKÉ: DEV build MUSÍ používat build:dev:explicit!!!
        # build:dev:explicit = REACT_APP_DB_NAME=eeo2025-dev + REACT_APP_API2_BASE_URL=/dev/api.eeo/
        # NIKDY NEPOUŽÍVEJ build:dev pro DEV (používá ostrou DB eeo2025)!
        echo "⚠️  Using build:dev:explicit (DB: eeo2025-dev, API: /dev/api.eeo/)"
        npm run build:dev:explicit
        BUILD_DIR="build"
    else
        npm run build:prod
        BUILD_DIR="build-prod"
    fi
    
    # ✅ AUTOMATICKÁ KONTROLA BUILD HASHŮ
    echo ""
    echo "🔍 Kontroluji synchronizaci build hashů..."
    HASH_HTML=$(grep -o 'build-hash" content="[^"]*"' "$BUILD_DIR/index.html" 2>/dev/null | cut -d'"' -f3)
    HASH_JSON=$(cat "$BUILD_DIR/version.json" 2>/dev/null | grep -o '"buildHash": "[^"]*"' | cut -d'"' -f4)
    
    if [ -z "$HASH_HTML" ]; then
        echo "❌ ERROR: Build hash nenalezen v index.html!"
        exit 1
    elif [ -z "$HASH_JSON" ]; then
        echo "❌ ERROR: Build hash nenalezen v version.json!"
        exit 1
    elif [ "$HASH_HTML" = "$HASH_JSON" ]; then
        echo "✅ Build hashe synchronizované: $HASH_HTML"
        BUILD_TIME=$(cat "$BUILD_DIR/version.json" 2>/dev/null | grep -o '"buildTime": "[^"]*"' | cut -d'"' -f4)
        echo "⏰ Build time: $BUILD_TIME"
    else
        echo "❌ CRITICAL ERROR: Build hashe se NESHODUJÍ!"
        echo "   index.html:  $HASH_HTML"
        echo "   version.json: $HASH_JSON"
        echo ""
        echo "⚠️  Build byl NEÚSPĚŠNÝ - nelze deployovat!"
        exit 1
    fi
    
    if [ "$ENVIRONMENT" = "dev" ]; then
        echo ""
        echo "🔄 DEV: Frontend build stays in dev environment"
        echo "   Location: /var/www/erdms-dev/apps/eeo-v2/client/build"
        echo "   Build hash: $HASH_HTML"
        echo ""
        echo "ℹ️  Pro ověření v prohlížeči:"
        echo "   curl http://localhost/dev/eeo-v2/version.json"
        
    elif [ "$ENVIRONMENT" = "prod" ] && [ "$DEPLOY" = "true" ]; then
        echo ""
        echo "🚀 PROD: Deploying frontend to production..."
        echo "   Build hash: $HASH_HTML"
        
        # Final confirmation for production
        echo ""
        echo "⚠️  PRODUCTION DEPLOYMENT CONFIRMATION REQUIRED"
        echo "   Build hash: $HASH_HTML"
        echo "   Build time: $BUILD_TIME"
        read -p "   Deploy to PRODUCTION? (yes/no): " CONFIRM
        
        if [ "$CONFIRM" != "yes" ]; then
            echo "❌ Production deployment cancelled by user"
            exit 0
        fi
        
        # Backup current production
        if [ -d "/var/www/erdms-platform/apps/eeo-v2" ]; then
            echo "💾 Creating frontend backup..."
            mkdir -p /var/www/erdms-platform/backups
            cp -r /var/www/erdms-platform/apps/eeo-v2 /var/www/erdms-platform/backups/eeo-v2-backup-${VERSION}
        fi
        
        # Deploy frontend - IMPORTANT: Frontend files go to ROOT, not client/ subdirectory!
        echo "📁 Copying frontend build to production ROOT (not client/)..."
        echo "   Using rsync to preserve api/ and api-legacy/ folders..."
        
        # Use rsync to deploy only frontend files, excluding API folders
        rsync -av --delete \
            --exclude='api/' \
            --exclude='api-legacy/' \
            --exclude='client/' \
            build-prod/ /var/www/erdms-platform/apps/eeo-v2/
        
        # Set permissions
        chown -R www-data:www-data /var/www/erdms-platform/apps/eeo-v2/
        
        echo "✅ EEO v2 Frontend deployed to production ROOT"
        echo ""
        echo "ℹ️  Ověř v prohlížeči:"
        echo "   curl https://erdms.zachranka.cz/eeo-v2/version.json"
        echo "   Očekávaný hash: $HASH_HTML"
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
        
        # Deploy backend (Node.js API)
        echo "📁 Copying Node.js backend to production..."
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
        
        # Deploy API Legacy (PHP API)
        echo ""
        echo "🔧 Deploying API Legacy (PHP) to production..."
        mkdir -p /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo
        
        # Copy PHP files (excluding data folders)
        echo "📁 Copying PHP API files (excluding data folders)..."
        rsync -av --delete \
            --exclude='cache/' \
            --exclude='logs/' \
            --exclude='uploads/' \
            --exclude='temp/' \
            --exclude='.env' \
            /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/ \
            /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/
        
        # Copy production .env for API Legacy
        echo "🔐 Copying production .env for API Legacy..."
        cp /var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/.env.production \
           /var/www/erdms-platform/apps/eeo-v2/api-legacy/api.eeo/.env
        
        # Set permissions for API Legacy
        chown -R www-data:www-data /var/www/erdms-platform/apps/eeo-v2/api-legacy/
        
        echo "✅ API Legacy deployed (DB: eeo2025, Version: 2.13)"
        
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
    echo "Prod Frontend: /var/www/erdms-platform/apps/eeo-v2/ (ROOT, not client/)"
    echo "Prod Backend: /var/www/erdms-platform/apps/eeo-v2/api"
    echo "🌐 URL: https://erdms.zachranka.cz/eeo-v2/"
fi
echo ""