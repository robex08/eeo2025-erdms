#!/bin/bash

echo "🧹 Pokročilé čištění všech console volání..."

# Čištění všech console.* volání v celém projektu
find src/ -name "*.js" -exec sed -i -E '
  # Smazání celých řádků s console voláními
  /^\s*console\.[a-zA-Z]+\s*\(/d
  # Smazání inline console volání s původní funkcionalitou
  s/console\.[a-zA-Z]+\([^)]*\);//g
  s/console\.[a-zA-Z]+\([^)]*\),*//g
  # Smazání console volání v catch blocích
  s/\.catch\(console\.[a-zA-Z]+\)/\.catch(() => {})/g
  # Smazání komentářů o console
  s|// to log results \(for example: reportWebVitals\(console\.log\)\)||g
' {} \;

# Vyčištění prázdných řádků
find src/ -name "*.js" -exec sed -i '/^\s*$/N;/^\s*\n\s*$/d' {} \;

echo "✅ Všechna console volání odstraněna!"
