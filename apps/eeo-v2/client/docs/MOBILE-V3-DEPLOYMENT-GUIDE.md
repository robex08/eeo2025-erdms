# 🚀 Mobile App V3 - Deployment Guide

**Datum:** 11. března 2026  
**Status:** 📋 DEPLOYMENT PLÁN  
**Environment:** Production + Staging

---

## 🎯 Deployment Architecture

### Server struktura
```
Production Server (akd-www-web01)
├── /var/www/eeo-v2/
│   ├── desktop/              # Desktop aplikace (port 5173)
│   │   └── build/
│   ├── mobile/               # Mobile aplikace (port 5174)
│   │   └── build/
│   └── api/                  # Backend API
│
├── Apache/Nginx konfigurace
│   ├── eeo-desktop.conf
│   ├── eeo-mobile.conf
│   └── eeo-api.conf
│
└── PM2 processes
    ├── eeo-desktop-dev (port 5173)
    ├── eeo-mobile-dev (port 5174)
    └── eeo-api (port 3000)
```

---

## 📋 Pre-deployment Checklist

### Development
- [ ] Všechny testy projdou (unit + integration + e2e)
- [ ] Build projde bez chyb
- [ ] Bundle size < 500KB (gzipped)
- [ ] Lighthouse score > 90
- [ ] Security audit bez critical issues
- [ ] Code review schválen

### Staging
- [ ] Deploy na staging environment
- [ ] Smoke tests
- [ ] UAT testing (minimálně 2 dny)
- [ ] Performance testing
- [ ] Mobile device testing (iOS + Android)
- [ ] Regression testing

### Production
- [ ] Backup databáze
- [ ] Backup současné verze
- [ ] Rollback plán připraven
- [ ] Monitoring nastaveno
- [ ] Alerting configured
- [ ] Dokumentace aktualizována
- [ ] Team notifikován o deployment window

---

## 🔧 Apache Configuration

### /etc/apache2/sites-available/eeo-mobile.conf

```apache
<VirtualHost *:80>
    ServerName eeo.zzssk.cz
    ServerAlias www.eeo.zzssk.cz
    
    # Redirect HTTP to HTTPS
    Redirect permanent / https://eeo.zzssk.cz/
</VirtualHost>

<VirtualHost *:443>
    ServerName eeo.zzssk.cz
    ServerAlias www.eeo.zzssk.cz
    
    # SSL Configuration
    SSLEngine on
    SSLCertificateFile /etc/ssl/certs/eeo.zzssk.cz.crt
    SSLCertificateKeyFile /etc/ssl/private/eeo.zzssk.cz.key
    SSLCertificateChainFile /etc/ssl/certs/ca-bundle.crt
    
    # Security Headers
    Header always set X-Frame-Options "SAMEORIGIN"
    Header always set X-Content-Type-Options "nosniff"
    Header always set X-XSS-Protection "1; mode=block"
    Header always set Referrer-Policy "strict-origin-when-cross-origin"
    Header always set Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
    
    # Compression
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
    </IfModule>
    
    # Desktop App (default)
    <Location />
        ProxyPass http://localhost:5173/
        ProxyPassReverse http://localhost:5173/
        ProxyPreserveHost On
        
        # Websocket support (HMR for dev)
        RewriteEngine On
        RewriteCond %{HTTP:Upgrade} =websocket [NC]
        RewriteRule /(.*)           ws://localhost:5173/$1 [P,L]
    </Location>
    
    # Mobile App
    <Location /mobile>
        ProxyPass http://localhost:5174/mobile/
        ProxyPassReverse http://localhost:5174/mobile/
        ProxyPreserveHost On
        
        # Cache static assets
        <FilesMatch "\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$">
            Header set Cache-Control "public, max-age=31536000, immutable"
        </FilesMatch>
        
        # Don't cache HTML
        <FilesMatch "\.(html)$">
            Header set Cache-Control "no-cache, no-store, must-revalidate"
        </FilesMatch>
    </Location>
    
    # Tablet App (optional)
    <Location /tablet>
        ProxyPass http://localhost:5175/tablet/
        ProxyPassReverse http://localhost:5175/tablet/
        ProxyPreserveHost On
    </Location>
    
    # API V3
    <Location /api/v3>
        ProxyPass http://localhost:3000/api/v3
        ProxyPassReverse http://localhost:3000/api/v3
        ProxyPreserveHost On
        
        # API Rate limiting (optional - via mod_evasive or external service)
        # RequestHeader set X-Forwarded-For %{REMOTE_ADDR}s
    </Location>
    
    # Health check endpoint
    <Location /health>
        ProxyPass http://localhost:3000/health
        ProxyPassReverse http://localhost:3000/health
    </Location>
    
    # Error Pages
    ErrorDocument 500 /error/500.html
    ErrorDocument 502 /error/502.html
    ErrorDocument 503 /error/503.html
    
    # Logging
    ErrorLog ${APACHE_LOG_DIR}/eeo-error.log
    CustomLog ${APACHE_LOG_DIR}/eeo-access.log combined
    
    # Log format with response time
    LogFormat "%h %l %u %t \"%r\" %>s %b \"%{Referer}i\" \"%{User-Agent}i\" %D" combined_with_time
    CustomLog ${APACHE_LOG_DIR}/eeo-access-time.log combined_with_time
</VirtualHost>
```

**Enable configuration:**
```bash
sudo a2ensite eeo-mobile
sudo a2enmod proxy proxy_http proxy_wstunnel rewrite headers ssl deflate
sudo systemctl reload apache2
```

---

## 📦 Build Scripts

### build-mobile.sh
```bash
#!/bin/bash
set -e

echo "🏗️  Building Mobile App V3..."

# Environment
ENVIRONMENT=${1:-production}
BUILD_DIR="apps/eeo-v2-mobile"
DIST_DIR="$BUILD_DIR/dist"
DEPLOY_DIR="/var/www/eeo-v2/mobile"

cd $BUILD_DIR

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist/
rm -rf node_modules/.vite/

# Install dependencies (if needed)
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm ci --production=false
fi

# Build
echo "🔨 Building for $ENVIRONMENT..."
if [ "$ENVIRONMENT" = "production" ]; then
    npm run build
else
    npm run build:staging
fi

# Verify build
if [ ! -d "$DIST_DIR" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

# Check bundle size
echo "📊 Checking bundle size..."
BUNDLE_SIZE=$(du -sk $DIST_DIR | cut -f1)
if [ $BUNDLE_SIZE -gt 2048 ]; then
    echo "⚠️  Warning: Bundle size is $BUNDLE_SIZE KB (> 2MB)"
fi

# Generate build manifest
echo "📝 Generating build manifest..."
cat > $DIST_DIR/build-manifest.json << EOF
{
  "version": "$(npm run version --silent)",
  "build_date": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "git_commit": "$(git rev-parse HEAD)",
  "git_branch": "$(git rev-parse --abbrev-ref HEAD)",
  "environment": "$ENVIRONMENT",
  "bundle_size_kb": $BUNDLE_SIZE
}
EOF

echo "✅ Build complete!"
echo "📦 Bundle size: $BUNDLE_SIZE KB"
echo "📁 Output: $DIST_DIR"
```

### deploy-mobile.sh
```bash
#!/bin/bash
set -e

echo "🚀 Deploying Mobile App V3..."

# Config
ENVIRONMENT=${1:-production}
BUILD_DIR="apps/eeo-v2-mobile/dist"
DEPLOY_DIR="/var/www/eeo-v2/mobile"
BACKUP_DIR="/var/www/eeo-v2/backups/mobile"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Check if build exists
if [ ! -d "$BUILD_DIR" ]; then
    echo "❌ Build not found. Run build-mobile.sh first."
    exit 1
fi

# Create backup
echo "💾 Creating backup..."
mkdir -p $BACKUP_DIR
if [ -d "$DEPLOY_DIR" ]; then
    tar -czf "$BACKUP_DIR/mobile-$TIMESTAMP.tar.gz" -C $DEPLOY_DIR .
    echo "✅ Backup created: $BACKUP_DIR/mobile-$TIMESTAMP.tar.gz"
fi

# Deploy
echo "📤 Deploying to $DEPLOY_DIR..."
mkdir -p $DEPLOY_DIR
rsync -av --delete $BUILD_DIR/ $DEPLOY_DIR/

# Set permissions
echo "🔒 Setting permissions..."
chown -R www-data:www-data $DEPLOY_DIR
chmod -R 755 $DEPLOY_DIR

# Verify deployment
echo "🔍 Verifying deployment..."
if [ ! -f "$DEPLOY_DIR/index.html" ]; then
    echo "❌ Deployment failed - index.html not found"
    exit 1
fi

# Reload Apache/Nginx
echo "🔄 Reloading web server..."
systemctl reload apache2

# Health check
echo "🏥 Health check..."
sleep 2
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" https://eeo.zzssk.cz/mobile/)
if [ "$HEALTH_CHECK" = "200" ]; then
    echo "✅ Deployment successful!"
    echo "🌐 Mobile app: https://eeo.zzssk.cz/mobile/"
else
    echo "⚠️  Warning: Health check returned $HEALTH_CHECK"
fi

# Cleanup old backups (keep last 10)
echo "🧹 Cleaning old backups..."
cd $BACKUP_DIR
ls -t mobile-*.tar.gz | tail -n +11 | xargs -r rm

echo "🎉 Deployment complete!"
```

---

## 🔄 PM2 Configuration (Dev/Staging)

### ecosystem.config.js
```javascript
module.exports = {
  apps: [
    {
      name: 'eeo-desktop-dev',
      script: 'npm',
      args: 'run dev',
      cwd: '/var/www/erdms-dev/apps/eeo-v2/client',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'development',
        PORT: 5173
      }
    },
    {
      name: 'eeo-mobile-dev',
      script: 'npm',
      args: 'run dev',
      cwd: '/var/www/erdms-dev/apps/eeo-v2-mobile',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
        PORT: 5174
      }
    },
    {
      name: 'eeo-api',
      script: 'server.js',
      cwd: '/var/www/erdms-dev/apps/eeo-v2/api',
      instances: 2,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
```

**PM2 Commands:**
```bash
# Start all
pm2 start ecosystem.config.js

# Restart mobile only
pm2 restart eeo-mobile-dev

# View logs
pm2 logs eeo-mobile-dev

# Monitor
pm2 monit

# Status
pm2 status
```

---

## 🧪 Testing Deployment

### Smoke tests script
```bash
#!/bin/bash
# smoke-test.sh

BASE_URL="${1:-https://eeo.zzssk.cz}"

echo "🧪 Running smoke tests on $BASE_URL..."

# Test 1: Mobile app loads
echo "Test 1: Mobile app accessibility"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/mobile/)
if [ "$STATUS" = "200" ]; then
    echo "✅ Mobile app loads"
else
    echo "❌ Mobile app failed (HTTP $STATUS)"
    exit 1
fi

# Test 2: API health
echo "Test 2: API health check"
API_HEALTH=$(curl -s $BASE_URL/api/v3/health | jq -r '.status')
if [ "$API_HEALTH" = "ok" ]; then
    echo "✅ API is healthy"
else
    echo "❌ API health check failed"
    exit 1
fi

# Test 3: Static assets
echo "Test 3: Static assets"
JS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/mobile/assets/index.js)
CSS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/mobile/assets/index.css)
if [ "$JS_STATUS" = "200" ] && [ "$CSS_STATUS" = "200" ]; then
    echo "✅ Static assets accessible"
else
    echo "❌ Static assets failed"
    exit 1
fi

# Test 4: Authentication endpoint
echo "Test 4: Auth endpoint"
AUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/v3/auth/verify)
if [ "$AUTH_STATUS" = "401" ] || [ "$AUTH_STATUS" = "200" ]; then
    echo "✅ Auth endpoint responding"
else
    echo "❌ Auth endpoint failed"
    exit 1
fi

echo "🎉 All smoke tests passed!"
```

---

## 📊 Monitoring Setup

### Prometheus metrics (optional)
```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'eeo-mobile-api'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/api/v3/metrics'
```

### Key metrics to monitor:
- **Response time** (p50, p95, p99)
- **Error rate** (5xx responses)
- **Request rate** (requests per minute)
- **CPU usage**
- **Memory usage**
- **Disk usage**
- **Active users**

### Alerting rules:
```yaml
groups:
  - name: eeo-mobile
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate on mobile API"
      
      - alert: HighResponseTime
        expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
        for: 5m
        annotations:
          summary: "95th percentile response time > 1s"
      
      - alert: HighMemoryUsage
        expr: process_resident_memory_bytes > 1073741824
        for: 5m
        annotations:
          summary: "Memory usage > 1GB"
```

---

## 🔙 Rollback Procedure

### Automatic rollback script
```bash
#!/bin/bash
# rollback-mobile.sh

echo "⏮️  Rolling back Mobile App..."

BACKUP_DIR="/var/www/eeo-v2/backups/mobile"
DEPLOY_DIR="/var/www/eeo-v2/mobile"

# Find latest backup
LATEST_BACKUP=$(ls -t $BACKUP_DIR/mobile-*.tar.gz | head -n 1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ No backup found!"
    exit 1
fi

echo "📦 Latest backup: $LATEST_BACKUP"
read -p "Continue with rollback? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Clear current deployment
    rm -rf $DEPLOY_DIR/*
    
    # Restore backup
    tar -xzf $LATEST_BACKUP -C $DEPLOY_DIR
    
    # Reload Apache
    systemctl reload apache2
    
    echo "✅ Rollback complete!"
else
    echo "❌ Rollback cancelled"
fi
```

---

## 📋 Deployment Runbook

### Pre-deployment (1 hour before)
1. Notify team in Slack/Teams
2. Check server health
3. Verify backup systems
4. Review deployment checklist

### Deployment Window
1. **T-10min**: Final build on staging
2. **T-5min**: Backup current production
3. **T-0**: Deploy new version
4. **T+2min**: Verify health checks
5. **T+5min**: Run smoke tests
6. **T+10min**: Monitor metrics
7. **T+30min**: All-clear or rollback

### Post-deployment
1. Monitor for 1 hour
2. Check error logs
3. Verify user feedback
4. Update documentation
5. Notify team of completion

---

## 🆘 Troubleshooting

### Issue: Mobile app not loading

**Symptoms:** White screen, 404 errors  
**Check:**
```bash
# Check Apache/Nginx running
systemctl status apache2

# Check proxy configuration
curl -I http://localhost:5174/mobile/

# Check build files exist
ls -la /var/www/eeo-v2/mobile/

# Check Apache error logs
tail -f /var/log/apache2/eeo-error.log
```

**Solution:**
```bash
# Reload Apache
systemctl reload apache2

# Restart PM2 process (dev)
pm2 restart eeo-mobile-dev
```

---

### Issue: API requests failing

**Symptoms:** Network errors, 502/503 responses  
**Check:**
```bash
# Check API health
curl http://localhost:3000/api/v3/health

# Check PM2 API process
pm2 status eeo-api

# Check API logs
pm2 logs eeo-api --lines 50
```

**Solution:**
```bash
# Restart API
pm2 restart eeo-api

# Check database connection
mysql -u eeo -p eeo_db -e "SELECT 1"
```

---

### Issue: High memory usage

**Check:**
```bash
# Check memory usage
free -h
pm2 monit

# Check process memory
ps aux | grep node | sort -rnk 4 | head
```

**Solution:**
```bash
# Restart high-memory process
pm2 restart eeo-mobile-dev

# Clear caches
pm2 flush
redis-cli FLUSHALL
```

---

## 📝 Deployment Changelog

### Version 3.0.0 - Initial Mobile V3
- [ ] New mobile app structure
- [ ] V3 API integration
- [ ] Tile configuration system
- [ ] Permissions integration

---

**Status:** 📋 DEPLOYMENT GUIDE PŘIPRAVEN  
**Last Updated:** 11. března 2026  
**Maintainer:** DevOps Team
