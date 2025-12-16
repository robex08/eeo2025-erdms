#!/usr/bin/env node
/**
 * Pre-build script for EEO application
 * 
 * This script runs before the build process and:
 * 1. Renames current build directory to .build-backup
 * 2. Creates maintenance page that will be visible during build
 * 3. After build completes (postbuild), removes backup
 */

const fs = require('fs');
const path = require('path');

const BUILD_DIR = path.join(__dirname, '..', 'build');
const BUILD_BACKUP = path.join(__dirname, '..', '.build-backup');
const MAINTENANCE_SOURCE = path.join(__dirname, '..', 'public', 'maintenance.html');

console.log('🔧 Pre-build: Setting up maintenance mode...');

// If build directory exists, rename it to backup
if (fs.existsSync(BUILD_DIR)) {
    // Remove old backup if exists
    if (fs.existsSync(BUILD_BACKUP)) {
        fs.rmSync(BUILD_BACKUP, { recursive: true, force: true });
    }
    // Rename current build to backup
    fs.renameSync(BUILD_DIR, BUILD_BACKUP);
    console.log('✅ Current build backed up');
}

// Create new build directory with maintenance page
fs.mkdirSync(BUILD_DIR, { recursive: true });

// Copy maintenance page to build directory
try {
    if (fs.existsSync(MAINTENANCE_SOURCE)) {
        fs.copyFileSync(MAINTENANCE_SOURCE, path.join(BUILD_DIR, 'index.html'));
        console.log('✅ Maintenance page activated');
        console.log(`   Visitors will see maintenance page during build`);
    } else {
        console.warn('⚠️  Warning: maintenance.html not found in public directory');
        // Create a simple fallback maintenance page
        const fallbackHTML = `
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="refresh" content="30">
    <title>Probíhá aktualizace | ERDMS</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
        }
        .container {
            background: white;
            color: #333;
            padding: 60px 40px;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 500px;
        }
        h1 { color: #667eea; margin-bottom: 20px; }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #667eea;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin: 30px auto;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Probíhá aktualizace</h1>
        <p>Aplikace bude během chvíle opět dostupná.</p>
        <div class="spinner"></div>
        <p><small>Stránka se automaticky obnoví za 30 sekund</small></p>
    </div>
</body>
</html>`;
        fs.writeFileSync(path.join(BUILD_DIR, 'index.html'), fallbackHTML);
        console.log('✅ Fallback maintenance page created');
    }
} catch (error) {
    console.error('❌ Error setting up maintenance page:', error.message);
    process.exit(1);
}

console.log('🎯 Pre-build complete. React build will now replace maintenance page...\n');
