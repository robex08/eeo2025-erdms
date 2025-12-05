#!/usr/bin/env python3
import re

# Načteme soubor
with open('/home/holovsky/dokumenty/Jazyky/react/wObj/r-app-zzs-eeo-25/src/services/apiv2Dictionaries.js', 'r') as f:
    content = f.read()

# Pattern pro náhradu response kontrol
patterns = [
    # Základní pattern s Array.isArray
    (
        r'if \(response\.data\?\.status === \'ok\' && Array\.isArray\(response\.data\?\.data\)\) \{\s*return response\.data\.data;\s*\}\s*throw new Error\(\'Invalid response format\'\);',
        'const data = checkResponse(response, operation);\n    return Array.isArray(data.data) ? data.data : [];'
    ),
    # Pattern bez Array.isArray
    (
        r'if \(response\.data\?\.status === \'ok\' && response\.data\?\.data\) \{\s*return response\.data\.data;\s*\}\s*throw new Error\(\'Invalid response format\'\);',
        'const data = checkResponse(response, operation);\n    return data.data || null;'
    ),
    # Pattern pouze s status ok
    (
        r'if \(response\.data\?\.status === \'ok\'\) \{\s*return response\.data\.data;\s*\}\s*throw new Error\(\'Invalid response format\'\);',
        'const data = checkResponse(response, operation);\n    return data.data || null;'
    ),
    # Pattern returning whole response.data
    (
        r'if \(response\.data\?\.status === \'ok\'\) \{\s*return response\.data;\s*\}\s*throw new Error\(\'Invalid response format\'\);',
        'const data = checkResponse(response, operation);\n    return data;'
    )
]

# Aplikujeme náhrady
for pattern, replacement in patterns:
    content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)

# Uložíme zpět
with open('/home/holovsky/dokumenty/Jazyky/react/wObj/r-app-zzs-eeo-25/src/services/apiv2Dictionaries.js', 'w') as f:
    f.write(content)

print("✅ Dokončeno: Nahrazeny response kontroly za checkResponse() funkci")