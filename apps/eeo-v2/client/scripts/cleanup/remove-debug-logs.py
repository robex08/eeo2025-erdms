#!/usr/bin/env python3
"""
Remove debug console logs from JavaScript files
Keeps console.error for critical errors
"""

import os
import re
import sys
from pathlib import Path

def remove_console_logs(content):
    """Remove console.log, console.warn, console.debug statements"""
    
    # Pattern for console statements (single and multi-line)
    patterns = [
        # console.log(...);
        r'console\.log\([^;]*\);?\s*\n?',
        # console.warn(...);
        r'console\.warn\([^;]*\);?\s*\n?',
        # console.debug(...);
        r'console\.debug\([^;]*\);?\s*\n?',
        # Multi-line console.log with nested parentheses
        r'console\.(log|warn|debug)\s*\([^)]*(?:\([^)]*\)[^)]*)*\);?\s*\n?',
        # Try-catch with only console inside
        r'try\s*\{\s*console\.(log|warn|debug)\([^}]*\}\s*catch[^}]*\}\s*\n?',
    ]
    
    for pattern in patterns:
        content = re.sub(pattern, '', content, flags=re.MULTILINE | re.DOTALL)
    
    # Remove lines that are only whitespace after removal
    lines = content.split('\n')
    cleaned_lines = []
    prev_empty = False
    
    for line in lines:
        stripped = line.strip()
        # Remove excessive empty lines
        if not stripped:
            if not prev_empty:
                cleaned_lines.append(line)
                prev_empty = True
        else:
            cleaned_lines.append(line)
            prev_empty = False
    
    return '\n'.join(cleaned_lines)

def process_file(file_path):
    """Process a single JavaScript file"""
    print(f"📝 Processing: {file_path}")
    
    try:
        # Read file
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_lines = len(content.split('\n'))
        
        # Count console statements before
        log_count = len(re.findall(r'console\.log\(', content))
        warn_count = len(re.findall(r'console\.warn\(', content))
        debug_count = len(re.findall(r'console\.debug\(', content))
        error_count = len(re.findall(r'console\.error\(', content))
        
        if log_count + warn_count + debug_count == 0:
            print(f"   ✓ No debug logs found")
            return
        
        # Create backup
        backup_path = f"{file_path}.bak"
        with open(backup_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        # Remove console logs
        cleaned = remove_console_logs(content)
        
        # Write cleaned content
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(cleaned)
        
        final_lines = len(cleaned.split('\n'))
        removed = original_lines - final_lines
        
        print(f"   ✓ Removed: {log_count} logs, {warn_count} warns, {debug_count} debugs")
        print(f"   ✓ Kept: {error_count} errors")
        print(f"   ✓ Lines reduced: {removed}")
        
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")

def main():
    """Main function"""
    src_path = Path('src')
    
    if not src_path.exists():
        print("❌ Error: 'src' directory not found")
        sys.exit(1)
    
    print("🧹 Removing debug console logs from project...")
    print("")
    
    # Find all .js files
    js_files = list(src_path.rglob('*.js'))
    
    # Filter out test files
    js_files = [f for f in js_files if not (f.name.endswith('.test.js') or f.name.endswith('.spec.js'))]
    
    print(f"Found {len(js_files)} JavaScript files to process")
    print("")
    
    processed = 0
    for file_path in js_files:
        process_file(file_path)
        processed += 1
    
    print("")
    print(f"✅ Processed {processed} files!")
    print("")
    print("ℹ️  Backups created with .bak extension")
    print("ℹ️  Review changes and remove backups when satisfied:")
    print("   find src -name '*.bak' -delete")

if __name__ == '__main__':
    main()
