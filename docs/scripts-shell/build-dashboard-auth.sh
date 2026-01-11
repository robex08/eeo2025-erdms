#!/bin/bash
# ERDMS Master Build Script - Dashboard + Auth API deployment
# Usage: ./build-dashboard-auth.sh [--prod|--dev] [--deploy|--no-deploy]

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
echo "🚀 ERDMS Dashboard + Auth API Build"
echo "════════════════════════════════════════════"
echo "Environment: ${ENVIRONMENT}"
echo "Deploy: ${DEPLOY}"
echo "Version: ${VERSION}"
echo ""

# Build Dashboard first
echo "🏠 Building Dashboard..."
./build-dashboard.sh --${ENVIRONMENT} $([ "$DEPLOY" = "true" ] && echo "--deploy" || echo "--no-deploy")

echo ""
echo "🔐 Processing Auth API..."
./build-auth-api.sh --${ENVIRONMENT} $([ "$DEPLOY" = "true" ] && echo "--deploy" || echo "--no-deploy")

echo ""
echo "════════════════════════════════════════════"
echo "✅ Dashboard + Auth API build complete!"
echo "════════════════════════════════════════════"
if [ "$ENVIRONMENT" = "prod" ] && [ "$DEPLOY" = "true" ]; then
    echo "🌐 Dashboard: https://erdms.zachranka.cz"
    echo "🔐 Auth API: https://erdms.zachranka.cz/api/auth"
fi
echo ""