#!/bin/bash

# Seznam souborů k čištění
files=(
  "src/forms/OrderForm25.js"
  "src/forms/OrderForm25/hooks/useFormController.js"
  "src/forms/OrderForm25/hooks/useFormLifecycle.js"
  "src/forms/OrderForm25/hooks/useOrderDataLoader.js"
  "src/forms/OrderForm25/hooks/useDictionaries.js"
  "src/services/apiOrderV2.js"
  "src/services/api25orders.js"
  "src/services/DraftManager.js"
  "src/services/api2auth.js"
  "src/components/Layout.js"
  "src/pages/Orders25List.js"
  "src/utils/logoutCleanup.js"
  "src/utils/encryptionUtils.js"
  "src/utils/secureStorage.js"
  "src/components/panels/NotesPanel.js"
  "src/index.js"
)

echo "🧹 Čištění console logů z ${#files[@]} souborů..."

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  Čistím: $file"
    # Odstranění celých řádků s console.* voláními
    sed -i '/^\s*console\.\(log\|warn\|error\|info\|debug\)/d' "$file"
    # Odstranění console volání uvnitř řádků kódu  
    sed -i 's/console\.\(log\|warn\|error\|info\|debug\)([^)]*);*//g' "$file"
    # Odstranění prázdných řádků po console logách
    sed -i '/^\s*$/N;/^\s*\n\s*$/d' "$file"
  else
    echo "  ⚠️ Soubor nenalezen: $file"
  fi
done

echo "✅ Console logy vyčištěny!"
