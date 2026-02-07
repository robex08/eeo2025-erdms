#!/usr/bin/env node
/**
 * Post-build script for EEO application
 * 
 * Cleanup after successful build:
 * - Removes backup directory
 */

const fs = require('fs');
const path = require('path');

const BUILD_BACKUP = path.join(__dirname, '..', '.build-backup');

console.log('\n🧹 Post-build: Cleaning up...');

// Remove backup directory
if (fs.existsSync(BUILD_BACKUP)) {
    try {
        fs.rmSync(BUILD_BACKUP, { recursive: true, force: true });
        console.log('✅ Backup cleaned up');
    } catch (error) {
        console.warn('⚠️  Warning: Could not remove backup:', error.message);
    }
}

console.log('✨ Build complete and ready to serve!\n');
