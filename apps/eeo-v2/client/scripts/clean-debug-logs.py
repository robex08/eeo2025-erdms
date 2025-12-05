#!/usr/bin/env python3
"""
Skript pro opatrné odstranění debug console.log z OrderForm25.js
"""

import re

file_path = 'src/forms/OrderForm25.js'

# Načíst soubor
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Odstranit debug console.log s emoji (ale ponechat console.error a důležité logy)
# Pattern 1: Víceřádkové console.log s 🔍
pattern1 = r"^\s*//\s*[🚨�]*\s*DEBUG:.*\n\s*console\.log\('🔍[^']*',\s*\{[^}]*?\}\);\n\n"
content = re.sub(pattern1, '', content, flags=re.MULTILINE)

# Pattern 2: console.log s emojis (bez console.error/warn)
patterns_to_remove = [
    r"^\s*console\.log\('🔍[^']*',\s*\{[\s\S]*?\}\);\s*\n",  # Multi-line object
    r"^\s*console\.log\('✅[^']*\);\s*\n",  # Single line with ✅
    r"^\s*console\.log\('🚀[^']*\);\s*\n",  # Single line with 🚀
    r"^\s*console\.log\(`🔍[^`]*`[^\)]*\);\s*\n",  # Template literals
    r"^\s*console\.log\('--------[^']*'\);\s*\n",  # Debug separators
]

for pattern in patterns_to_remove:
    content = re.sub(pattern, '', content, flags=re.MULTILINE)

# Zapsat zpět
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Debug logy vyčištěny!")
