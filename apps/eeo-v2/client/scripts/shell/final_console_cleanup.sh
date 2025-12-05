#!/bin/bash

echo "🧹 Finální čištění všech zbývajících console volání..."

# Najít všechny JS soubory s console voláními
FILES_WITH_CONSOLE=$(grep -r -l "console\." src/ || true)

if [ -z "$FILES_WITH_CONSOLE" ]; then
    echo "✅ Žádné console logy nenalezeny!"
    exit 0
fi

# Pro každý soubor odstraň všechny typy console volání
for file in $FILES_WITH_CONSOLE; do
    echo "Čistím: $file"
    
    # Vymaž všechny řádky obsahující console.
    sed -i '/console\./d' "$file"
    
    # Vymaž všechny řádky obsahující console[
    sed -i '/console\[/d' "$file"
    
    # Odstraň prázdné řádky vzniklé mazáním
    sed -i '/^[[:space:]]*$/N;/^\n$/d' "$file"
done

echo "✅ Finální čištění dokončeno!"

# Zkontroluj výsledek
REMAINING=$(grep -r "console\." src/ | wc -l)
echo "📊 Zbývající console volání: $REMAINING"