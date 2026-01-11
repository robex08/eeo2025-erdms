#!/bin/bash
# ERDMS Auth API Deploy Script
# Usage: ./build-auth-api.sh [--prod|--dev] [--deploy|--no-deploy]

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
echo "🔐 ERDMS Auth API Deploy"
echo "════════════════════════════════════════════"
echo "Environment: ${ENVIRONMENT}"
echo "Deploy: ${DEPLOY}"
echo "Version: ${VERSION}"
echo ""

if [ "$DEPLOY" = "true" ] && [ "$ENVIRONMENT" = "prod" ]; then
    echo "🚀 Deploying Auth API to Production..."
    
    # Stop service
    echo "🛑 Stopping Auth API service..."
    systemctl stop erdms-auth-api.service
    
    # Backup current production
    if [ -d "/var/www/erdms-platform/auth-api/src" ]; then
        echo "💾 Creating backup..."
        tar -czf /var/www/erdms-platform/backups/auth-api-backup-${VERSION}.tar.gz -C /var/www/erdms-platform auth-api
    fi
    
    # Deploy new code
    echo "📁 Copying Auth API source..."
    cp -r /var/www/erdms-dev/auth-api/src/* /var/www/erdms-platform/auth-api/src/
    cp /var/www/erdms-dev/auth-api/package*.json /var/www/erdms-platform/auth-api/
    
    # Copy production environment
    if [ -f "/var/www/erdms-dev/auth-api/.env.production" ]; then
        cp /var/www/erdms-dev/auth-api/.env.production /var/www/erdms-platform/auth-api/.env
    else
        cp /var/www/erdms-dev/auth-api/.env /var/www/erdms-platform/auth-api/.env
    fi
    
    # Update production environment variables
    cd /var/www/erdms-platform/auth-api
    sed -i 's/NODE_ENV=development/NODE_ENV=production/' .env
    sed -i 's/PORT=3000/PORT=4000/' .env
    sed -i 's|http://localhost:3000|https://erdms.zachranka.cz|g' .env
    sed -i 's|http://localhost:5173|https://erdms.zachranka.cz|g' .env
    
    # Install production dependencies
    echo "📦 Installing production dependencies..."
    npm ci --production
    
    # Set permissions
    chown -R root:www-data /var/www/erdms-platform/auth-api/
    
    # Start service
    echo "▶️ Starting Auth API service..."
    systemctl start erdms-auth-api.service
    
    # Check service status
    sleep 3
    if systemctl is-active --quiet erdms-auth-api.service; then
        echo "✅ Auth API service is running"
    else
        echo "❌ Auth API service failed to start"
        systemctl status erdms-auth-api.service --no-pager
        exit 1
    fi
    
    echo ""
    echo "✅ Auth API deployed to Production!"
    echo "🌐 URL: https://erdms.zachranka.cz/api/auth"
    
elif [ "$DEPLOY" = "true" ] && [ "$ENVIRONMENT" = "dev" ]; then
    echo ""
    echo "ℹ️  Auth API dev environment (no deployment needed)"
    
else
    echo ""
    echo "ℹ️  Auth API ready for deployment"
fi

echo ""
echo "════════════════════════════════════════════"
echo "✅ Auth API process finished!"
echo "════════════════════════════════════════════"
echo "Dev location: /var/www/erdms-dev/auth-api"
if [ "$DEPLOY" = "true" ] && [ "$ENVIRONMENT" = "prod" ]; then
    echo "Production location: /var/www/erdms-platform/auth-api"
fi
echo ""