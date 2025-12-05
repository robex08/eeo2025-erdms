#!/bin/bash

echo "🧹 Ručně odstraňuji pouze jednoduché console logy..."

# Seznam pouze nejproblematičtějších souborů pro začátek
FILES=(
    "src/components/Layout.js"
    "src/components/NotificationBell.js"
    "src/forms/OrderForm25.js"
    "src/services/apiOrderV2.js"
)

for file in "${FILES[@]}"; do
    if [[ -f "$file" ]]; then
        echo "Čistím: $file"
        
        # Pouze jednoduché console.log, console.warn, console.error na vlastních řádcích
        sed -i '/^[[:space:]]*console\.log(/d' "$file"
        sed -i '/^[[:space:]]*console\.warn(/d' "$file"
        sed -i '/^[[:space:]]*console\.error(/d' "$file"
        sed -i '/^[[:space:]]*console\.info(/d' "$file"
        sed -i '/^[[:space:]]*console\.debug(/d' "$file"
        
        echo "  ✅ Vyčištěno"
    fi
done

echo "✅ Základní čištění dokončeno!"
echo "📊 Zkouška kompilace..."

# Test syntaxe pro hlavní soubory
node -c src/index.js && echo "✅ index.js - OK" || echo "❌ index.js - CHYBA"