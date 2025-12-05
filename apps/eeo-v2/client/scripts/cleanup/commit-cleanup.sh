#!/bin/bash

# Add all modified files
echo "📦 Staging changes..."
git add -A

# Create commit
echo "💾 Creating commit..."
git commit -m "🧹 Remove all debug console logs from production code

- Removed ~470 console.log() statements
- Removed ~180 console.warn() statements  
- Removed ~17 console.debug() statements
- Kept all console.error() for error handling
- Total: ~1,350 lines removed
- 50 files modified
- Test files and debug utilities preserved

Benefits:
✅ Cleaner production console
✅ Better performance
✅ Smaller bundle size
✅ Improved security
✅ Professional production build

See CLEANUP-DEBUG-LOGS.md for detailed report"

echo "✅ Commit created!"
echo ""
echo "📤 To push changes:"
echo "   git push origin main"
