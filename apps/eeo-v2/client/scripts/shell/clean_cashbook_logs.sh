#!/bin/bash
# Skript pro odstranění debug console.log výpisů z CashBookPage.js

FILE="src/pages/CashBookPage.js"

# Odstranit jednotlivé console.log řádky (opatrně, po jednom)
sed -i "/console\.log('📍 Lokalita uživatele:/d" "$FILE"
sed -i "/console\.log('=== LOADING MONTH DATA ===/d" "$FILE"
sed -i "/console\.log('Storage Key:', STORAGE_KEY);/d" "$FILE"
sed -i "/console\.log('Has saved data:', !!savedData);/d" "$FILE"
sed -i "/console\.log('Current Month\/Year:', currentMonth, currentYear);/d" "$FILE"
sed -i "/console\.log('🔍 Checking previous month:/d" "$FILE"
sed -i "/console\.log('📊 Previous month calculation:/d" "$FILE"
sed -i "/console\.log('⚠️ No previous month data found');/d" "$FILE"
sed -i "/console\.log('✅ Loaded existing month data:/d" "$FILE"
sed -i "/console\.log('🔄 Updating stored carryOver:/d" "$FILE"
sed -i "/console\.log('📂 No data for current month, creating new with carryOver:/d" "$FILE"
sed -i "/console\.log('=== END LOADING ===/d" "$FILE"
sed -i "/console\.log('🔄 Načítání LP kódů při mount stránky');/d" "$FILE"
sed -i "/console\.log('🔍 Auth stav:/d" "$FILE"
sed -i "/console\.log('⚠️ Čekám na přihlášení uživatele.../d" "$FILE"
sed -i "/console\.log('📡 Volám fetchLimitovanePrisliby.../d" "$FILE"
sed -i "/console\.log('📦 Raw data z API:/d" "$FILE"
sed -i "/console\.log('🔍 Struktura první LP položky:/d" "$FILE"
sed -i "/console\.log('🔍 Všechny klíče:/d" "$FILE"
sed -i "/console\.log('🔄 LP transformace:/d" "$FILE"
sed -i "/console\.log('✅ LP kódy načteny a uloženy:/d" "$FILE"
sed -i "/console\.log('📊 LP kódy state změna:/d" "$FILE"
sed -i "/console\.log('📝 AddRow button:/d" "$FILE"
sed -i "/console\.log('💾 AddRow button:/d" "$FILE"
sed -i "/console\.log('➕ AddRow button:/d" "$FILE"
sed -i "/console\.log('💾 Shift+Insert:/d" "$FILE"
sed -i "/console\.log('➕ Shift+Insert:/d" "$FILE"

# Speciální případ - víceřádkový console.log blok (musíme odstranit celý blok)
# Použijeme perl pro pokročilejší regex
perl -i -0pe 's/console\.log\([^)]+\{\s*[^}]*\}\s*\);//gs' "$FILE"

echo "✅ Console.log výpisy byly odstraněny z $FILE"
