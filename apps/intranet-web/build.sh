#!/bin/bash

##############################################
# Intranet Web - Build & Deploy Script
# Development Environment
##############################################

set -e

PROJECT_ROOT="/var/www/erdms-dev/apps/intranet-web"
CLIENT_DIR="$PROJECT_ROOT/client"
API_DIR="$PROJECT_ROOT/api"

echo "🚀 Intranet Web - Build & Deploy"
echo "=================================="
echo ""

# Check if we're in the right directory
if [ ! -d "$CLIENT_DIR" ]; then
    echo "❌ Error: Client directory not found!"
    echo "Expected: $CLIENT_DIR"
    exit 1
fi

# Function: Build Frontend
build_frontend() {
    echo "📦 Building Frontend..."
    cd "$CLIENT_DIR"
    
    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "📥 Installing dependencies..."
        npm install
    fi
    
    echo "🔨 Building with Vite..."
    npm run build
    
    if [ $? -eq 0 ]; then
        echo "✅ Frontend build successful!"
    else
        echo "❌ Frontend build failed!"
        exit 1
    fi
}

# Function: Setup API
setup_api() {
    echo ""
    echo "🔧 Setting up API..."
    cd "$API_DIR"
    
    # Check if .env exists
    if [ ! -f ".env" ]; then
        echo "⚠️  .env file not found, copying from .env.example"
        cp .env.example .env
        echo "📝 Please edit $API_DIR/.env with your configuration"
    else
        echo "✅ .env file exists"
    fi
}

# Function: Create Symlinks
create_symlinks() {
    echo ""
    echo "ℹ️  Symlinky nejsou potřeba - aplikace běží přímo z erdms-dev/apps/"
    echo "   Apache Alias je nakonfigurovaný v: /etc/apache2/sites-available/erdms-proxy-dev.inc"
}

# Function: Reload Apache
reload_apache() {
    echo ""
    echo "🔄 Reloading Apache..."
    
    if [ "$EUID" -ne 0 ]; then
        echo "⚠️  Apache reload requires root. Run manually:"
        echo "   sudo systemctl reload apache2"
        return
    fi
    
    systemctl reload apache2
    echo "✅ Apache reloaded"
}

# Main execution
main() {
    echo "Starting build process..."
    echo ""
    
    # Build frontend
    build_frontend
    
    # Setup API
    setup_api
    
    # Create symlinks (if root)
    create_symlinks
    
    # Reload Apache (if root)
    reload_apache
    
    echo "======================================"
    echo "✅ Build Complete!"
    echo "======================================"
    echo ""
    echo "🌐 Application URLs:"
    echo "   Frontend: https://erdms.zachranka.cz/dev/intranet-web"
    echo "   API:      https://erdms.zachranka.cz/dev/api-intranet-web"
    echo ""
    echo "🔍 API Health Check:"
    echo "   curl https://erdms.zachranka.cz/dev/api-intranet-web/health"
    echo ""
    echo "📝 Next steps:"
    echo "   1. Configure EntraID in $CLIENT_DIR/.env.development"
    echo "   2. Configure API in $API_DIR/.env"
    echo "   3. Reload Apache: systemctl reload apache2"
    echo "   4. Test the application"
    echo ""
}

# Run main
main
