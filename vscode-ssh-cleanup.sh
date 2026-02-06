#!/bin/bash

# ============================================
# VS Code SSH Cleanup Script
# ============================================
# Bezpečně ukončí všechny VS Code procesy
# a vyčistí dočasné soubory
# ============================================

echo "🔍 Kontroluji VS Code procesy..."
VSCODE_PROCESSES=$(ps aux | grep -i vscode-server | grep -v grep | awk '{print $2}')
PROCESS_COUNT=$(echo "$VSCODE_PROCESSES" | grep -c '^[0-9]')

if [ "$PROCESS_COUNT" -eq 0 ]; then
    echo "✅ Žádné VS Code procesy neběží"
else
    echo "⚠️  Nalezeno $PROCESS_COUNT VS Code procesů"
    echo ""
    echo "📋 Seznam procesů:"
    ps aux | grep -i vscode-server | grep -v grep | awk '{printf "   PID: %s  %s\n", $2, $11}'
    echo ""
    
    read -p "Chcete ukončit tyto procesy? (ano/ne): " CONFIRM
    
    if [ "$CONFIRM" = "ano" ] || [ "$CONFIRM" = "a" ]; then
        echo "🛑 Ukončuji VS Code procesy..."
        
        # Nejdřív zkusit graceful shutdown
        echo "$VSCODE_PROCESSES" | while read -r PID; do
            if [ ! -z "$PID" ]; then
                echo "   Ukončuji PID $PID (SIGTERM)..."
                kill -15 "$PID" 2>/dev/null
            fi
        done
        
        # Počkat 3 sekundy
        sleep 3
        
        # Zkontrolovat, jestli ještě běží
        REMAINING=$(ps aux | grep -i vscode-server | grep -v grep | wc -l)
        
        if [ "$REMAINING" -gt 0 ]; then
            echo "   ⚠️  Některé procesy stále běží, force kill..."
            ps aux | grep -i vscode-server | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null
            sleep 1
        fi
        
        echo "✅ Procesy ukončeny"
    else
        echo "❌ Zrušeno uživatelem"
        exit 0
    fi
fi

echo ""
echo "🧹 Čištění dočasných souborů..."

# Vyčistit .vscode-server logs (ale ne celý server)
if [ -d "$HOME/.vscode-server/data/logs" ]; then
    LOG_SIZE=$(du -sh "$HOME/.vscode-server/data/logs" 2>/dev/null | awk '{print $1}')
    echo "   Velikost logů: $LOG_SIZE"
    find "$HOME/.vscode-server/data/logs" -type f -mtime +7 -delete 2>/dev/null
    echo "   ✅ Staré logy vyčištěny"
fi

# Vyčistit VS Code cache
if [ -d "$HOME/.vscode-server/data/CachedData" ]; then
    CACHE_SIZE=$(du -sh "$HOME/.vscode-server/data/CachedData" 2>/dev/null | awk '{print $1}')
    echo "   Velikost cache: $CACHE_SIZE"
fi

echo ""
echo "✅ Cleanup dokončen!"
echo ""
echo "💡 Doporučené další kroky:"
echo "   1. V VS Code: Odpojte se ze serveru (Ctrl+Shift+P -> Remote-SSH: Close Remote Connection)"
echo "   2. Znovu se připojte k serveru"
echo "   3. VS Code nyní načte novou konfiguraci z .vscode/settings.json"
echo ""
echo "📊 Aktuální stav:"
ps aux | grep -i vscode-server | grep -v grep | wc -l | xargs echo "   VS Code procesů:"
