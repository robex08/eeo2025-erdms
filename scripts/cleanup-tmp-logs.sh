#!/bin/bash
# Skript pro čištění starých logů v /tmp/ a přesun stávajících
# Spustit: sudo /var/www/erdms-dev/scripts/cleanup-tmp-logs.sh

set -e

LOG_DIR="/var/www/erdms-dev/logs"
PHP_LOG_DIR="/var/www/erdms-dev/logs/php"

echo "🧹 ERDMS Log Cleanup - Cleaning /tmp/ logs..."

# Vytvoř adresáře pokud neexistují
mkdir -p "$LOG_DIR"
mkdir -p "$PHP_LOG_DIR"

# Nastav práva
chown -R www-data:www-data "$LOG_DIR"
chmod -R 755 "$LOG_DIR"

echo "📁 Created and secured log directories"

# Přesuň stávající logy z /tmp/
if [ -f "/tmp/php_errors.log" ]; then
    echo "📦 Moving /tmp/php_errors.log to project..."
    mv "/tmp/php_errors.log" "$PHP_LOG_DIR/prod-error.log.backup-$(date +%Y%m%d-%H%M%S)"
    echo "   ✅ Moved PHP errors log"
fi

if [ -f "/tmp/dual-notification-debug.log" ]; then
    echo "📦 Moving /tmp/dual-notification-debug.log to project..."
    mv "/tmp/dual-notification-debug.log" "$LOG_DIR/dual-notification-debug.log.backup-$(date +%Y%m%d-%H%M%S)"
    echo "   ✅ Moved dual notification log"
fi

if [ -f "/tmp/php_spisovka_errors.log" ]; then
    echo "📦 Moving /tmp/php_spisovka_errors.log to project..."
    mv "/tmp/php_spisovka_errors.log" "$PHP_LOG_DIR/spisovka-error.log.backup-$(date +%Y%m%d-%H%M%S)"
    echo "   ✅ Moved spisovka error log"
fi

# Vyčisti ostatní ERDMS debug logy z /tmp/
for log_file in /tmp/*debug*.log /tmp/*debug*.txt /tmp/*debug*.json; do
    if [ -f "$log_file" ]; then
        echo "🗑️  Removing temp debug file: $(basename $log_file)"
        rm -f "$log_file"
    fi
done

echo ""
echo "📊 Log directory sizes after cleanup:"
du -sh "$LOG_DIR"/* 2>/dev/null || echo "   No logs yet"

echo ""
echo "💾 /tmp/ space after cleanup:"
df -h /tmp | grep tmpfs

echo ""
echo "✅ Log cleanup completed!"
echo ""
echo "Next steps:"
echo "1. Install logrotate config: sudo cp /var/www/erdms-dev/docs/deployment/logrotate-erdms.conf /etc/logrotate.d/erdms"
echo "2. Test logrotate: sudo logrotate -d /etc/logrotate.d/erdms"
echo "3. Monitor logs: tail -f $LOG_DIR/php/prod-error.log"