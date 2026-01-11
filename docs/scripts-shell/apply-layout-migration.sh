#!/bin/bash
# Aplikace ALTER TABLE pro uložení layoutu do profilů

echo "🔧 Applying ALTER TABLE for hierarchy layout storage..."

# Spustit SQL soubor
php -r "
require_once '/var/www/erdms-dev/apps/eeo-v2/api-legacy/api.eeo/config/db.php';

try {
    \$pdo = getPDO();
    
    echo \"📊 Adding layout_data column to 25_hierarchie_profily...\\n\";
    
    \$sql = \"
        ALTER TABLE 25_hierarchie_profily
        ADD COLUMN IF NOT EXISTS layout_data JSON DEFAULT NULL COMMENT 'JSON data s pozicemi nodů'
    \";
    
    \$pdo->exec(\$sql);
    echo \"✅ Column added successfully\\n\";
    
    echo \"📊 Creating index...\\n\";
    \$pdo->exec(\"CREATE INDEX IF NOT EXISTS idx_layout ON 25_hierarchie_profily(id, aktivni)\");
    echo \"✅ Index created successfully\\n\";
    
    echo \"\\n🎉 Migration completed!\\n\";
    
} catch (PDOException \$e) {
    echo \"❌ Error: \" . \$e->getMessage() . \"\\n\";
    exit(1);
}
"

echo "✅ Done!"
