#!/usr/bin/env python3
"""
Script to replace all date inputs with DatePicker component in OrderForm25.js
"""

import re

# Read the file
with open('src/forms/OrderForm25.js', 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern to match date input blocks
# Matches: InputWithIcon with Calendar icon and Input type="date"
pattern = r'<InputWithIcon hasIcon[^>]*>\s*<Calendar />\s*<Input\s+type="date"\s+name="([^"]+)"\s+value=\{formData\.([^}]+)\}\s+onChange=\{(?:\(e\) => )?handleInputChange\([\'"]([^\'\"]+)[\'"],\s*(?:e\.target\.value|formData\.[^\)]+)\)\}\s*(?:onBlur=\{[^}]+\}\s*)?(?:hasError=\{[^}]+\}\s*)?(?:hasIcon\s*)?(?:style=\{[^}]+\}\s*)?(?:disabled=\{[^}]+\}\s*)*/>\s*</InputWithIcon>'

def replace_date_input(match):
    field_name = match.group(1)
    form_data_field = match.group(2)
    
    return f'''<DatePicker
                            fieldName="{field_name}"
                            value={{formData.{form_data_field}}}
                            onChange={{handleInputChange}}
                            onBlur={{handleFieldBlur}}
                            disabled={{shouldLockPhase2Sections || shouldLockPhase3Sections}}
                            hasError={{!!validationErrors.{field_name}}}
                            placeholder="Vyberte datum"
                          />'''

# Apply replacements
new_content = re.sub(pattern, replace_date_input, content, flags=re.DOTALL)

# Write back
with open('src/forms/OrderForm25.js', 'w', encoding='utf-8') as f:
    f.write(new_content)

print("✅ Date inputs replaced successfully!")
