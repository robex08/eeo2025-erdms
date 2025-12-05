#!/bin/bash

# Script to remove debug console logs from the project
# Keeps console.error for critical errors

echo "🧹 Removing debug console logs from project..."
echo ""

# Function to remove console.log lines
remove_debug_logs() {
    local file="$1"
    echo "Processing: $file"
    
    # Create a backup
    cp "$file" "$file.bak"
    
    # Remove console.log, console.warn, console.debug lines
    # Keep console.error
    sed -i '/^\s*console\.log(/d' "$file"
    sed -i '/^\s*console\.warn(/d' "$file"
    sed -i '/^\s*console\.debug(/d' "$file"
    
    # Remove multi-line console.log statements (basic pattern)
    perl -i -0pe 's/\s*console\.log\([^)]*\);\s*//gs' "$file"
    perl -i -0pe 's/\s*console\.warn\([^)]*\);\s*//gs' "$file"
    perl -i -0pe 's/\s*console\.debug\([^)]*\);\s*//gs' "$file"
    
    # Clean up try-catch with console statements
    sed -i '/try.*console\.(log|warn|debug)/d' "$file"
    sed -i '/catch.*console\.(log|warn|debug)/d' "$file"
}

# Find all JS files in src directory
find src -name "*.js" -type f | while read -r file; do
    # Skip test files
    if [[ $file == *".test.js" ]] || [[ $file == *".spec.js" ]]; then
        continue
    fi
    
    remove_debug_logs "$file"
done

echo ""
echo "✅ Debug logs removed!"
echo ""
echo "ℹ️  Backups created with .bak extension"
echo "ℹ️  Review changes and remove backups when satisfied:"
echo "   find src -name '*.bak' -delete"
