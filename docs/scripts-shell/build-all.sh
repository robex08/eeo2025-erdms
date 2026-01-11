#!/bin/bash
# ERDMS Master Build Script - All Applications
# Usage: ./build-all.sh [--prod|--dev] [--deploy|--no-deploy] [--app=dashboard,eeo-v2,intranet-v26]

set -e

ENVIRONMENT="dev"
DEPLOY="false"
APPS="dashboard,eeo-v2"
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
        --app=*)
            APPS="${1#*=}"
            shift
            ;;
        *)
            echo "Unknown option $1"
            echo "Usage: $0 [--prod|--dev] [--deploy|--no-deploy] [--app=dashboard,eeo-v2,intranet-v26]"
            exit 1
            ;;
    esac
done

echo "════════════════════════════════════════════"
echo "🚀 ERDMS Master Build - All Applications"
echo "════════════════════════════════════════════"
echo "Environment: ${ENVIRONMENT}"
echo "Deploy: ${DEPLOY}"
echo "Apps: ${APPS}"
echo "Version: ${VERSION}"
echo ""

cd /var/www/erdms-dev/_docs/scripts-shell

# Make scripts executable
chmod +x build-*.sh

# Convert apps string to array
IFS=',' read -ra APP_ARRAY <<< "$APPS"

# Build each application
for app in "${APP_ARRAY[@]}"; do
    case $app in
        dashboard)
            echo "🏠 Building Dashboard + Auth API..."
            ./build-dashboard-auth.sh --${ENVIRONMENT} $([ "$DEPLOY" = "true" ] && echo "--deploy" || echo "--no-deploy")
            ;;
        eeo-v2)
            echo ""
            echo "📋 Building EEO v2..."
            ./build-eeo-v2.sh --${ENVIRONMENT} --all $([ "$DEPLOY" = "true" ] && echo "--deploy" || echo "--no-deploy")
            ;;
        intranet-v26)
            echo ""
            echo "🌐 Building Intranet v26..."
            ./build-intranet-v26.sh --${ENVIRONMENT} $([ "$DEPLOY" = "true" ] && echo "--deploy" || echo "--no-deploy")
            ;;
        *)
            echo "⚠️ Unknown application: $app"
            ;;
    esac
done

echo ""
echo "════════════════════════════════════════════"
echo "✅ Master Build Complete!"
echo "════════════════════════════════════════════"
echo "Environment: ${ENVIRONMENT}"
echo "Applications: ${APPS}"
if [ "$ENVIRONMENT" = "prod" ] && [ "$DEPLOY" = "true" ]; then
    echo ""
    echo "🌐 Production URLs:"
    if [[ "$APPS" == *"dashboard"* ]]; then
        echo "   Dashboard: https://erdms.zachranka.cz"
        echo "   Auth API: https://erdms.zachranka.cz/api/auth"
    fi
    if [[ "$APPS" == *"eeo-v2"* ]]; then
        echo "   EEO v2: https://erdms.zachranka.cz/eeo-v2/"
    fi
    if [[ "$APPS" == *"intranet-v26"* ]]; then
        echo "   Intranet v26: https://erdms.zachranka.cz/intranet-v26/"
    fi
fi
echo ""