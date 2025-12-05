#!/bin/bash

echo "🧹 Inteligentní čištění console logů (bezpečná verze)..."

# Seznam souborů k vyčištění
FILES=$(find src/ -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx")

for file in $FILES; do
    if [[ -f "$file" ]]; then
        echo "Čistím: $file"
        
        # Zálohuj původní soubor
        cp "$file" "$file.backup"
        
        # Odstraň pouze celé řádky obsahující console, ale zachovej strukturu
        # Neodstraňuj řádky, které jsou součástí víceřádkových struktur
        
        # 1. Odstraň jednoduché console.* volání na celém řádku
        sed -i '/^[[:space:]]*console\.[a-zA-Z]*([^)]*);[[:space:]]*$/d' "$file"
        
        # 2. Odstraň console.* volání s komentáři
        sed -i '/^[[:space:]]*console\.[a-zA-Z]*([^)]*);[[:space:]]*\/\/.*$/d' "$file"
        
        # 3. Odstraň console.* volání bez středníků na konci řádku
        sed -i '/^[[:space:]]*console\.[a-zA-Z]*([^)]*)[[:space:]]*$/d' "$file"
        
        # 4. Odstraň víceřádkové console volání (opatrně)
        sed -i '/^[[:space:]]*console\.[a-zA-Z]*([[:space:]]*$/,/^[[:space:]]*);[[:space:]]*$/d' "$file"
        
        # 5. Nahraď catch(console.warn) prázdným catch blokem
        sed -i 's/\.catch(console\.warn)/\.catch(() => {})/g' "$file"
        
        # 6. Odstraň komentáře referující console.log
        sed -i '/\/\/ to log results.*console\.log/d' "$file"
        
        # Zkontroluj, zda je soubor stále validní JavaScript
        if node -c "$file" 2>/dev/null; then
            echo "  ✅ Úspěšně vyčištěno"
            rm "$file.backup"
        else
            echo "  ❌ Chyba syntaxe - obnovuji původní soubor"
            mv "$file.backup" "$file"
        fi
    fi
done

echo "✅ Čištění dokončeno!"

# Zkontroluj výsledek
REMAINING=$(find src/ -name "*.js" -o -name "*.jsx" | xargs grep -l "console\." | wc -l)
echo "📊 Souborů s console voláními: $REMAINING"

if [ $REMAINING -gt 0 ]; then
    echo "🔍 Zbývající console volání:"
    find src/ -name "*.js" -o -name "*.jsx" | xargs grep -n "console\." | head -10
fi