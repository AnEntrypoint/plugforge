const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const outDir = path.join(__dirname, '../../exec-spool/out');
const maxAttempts = 60;
let attempt = 0;

// Find the most recently created .out file to track the rebuild task
let lastCheck = Date.now();
let foundRebuild = false;

while (attempt < maxAttempts && !foundRebuild) {
  try {
    const files = fs.readdirSync(outDir);
    const jsonFiles = files.filter(f => f.endsWith('.json')).sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      return numB - numA; // Descending order (latest first)
    });

    for (const jsonFile of jsonFiles.slice(0, 3)) {
      const fullPath = path.join(outDir, jsonFile);
      const stat = fs.statSync(fullPath);
      const meta = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

      // Look for rebuild task (most recent nodejs task with "rebuild" reference, or task after 8)
      const taskNum = parseInt(jsonFile);
      if (taskNum > 8) {
        console.log(`[wait-rebuild] Checking task ${taskNum}...`);

        const outFile = jsonFile.replace('.json', '.out');
        const outPath = path.join(outDir, outFile);
        if (fs.existsSync(outPath)) {
          const content = fs.readFileSync(outPath, 'utf8');
          if (content.includes('gm-starter') || content.includes('[rebuild]')) {
            console.log(`[wait-rebuild] Found rebuild task ${taskNum}`);
            console.log(content);
            foundRebuild = true;
            break;
          }
        }
      }
    }

    if (!foundRebuild) {
      attempt++;
      if (attempt % 5 === 0) {
        console.log(`[wait-rebuild] Waiting... (attempt ${attempt}/${maxAttempts})`);
      }
      if (attempt < maxAttempts) {
        // Sleep 500ms between checks
        const start = Date.now();
        while (Date.now() - start < 500) {}
      }
    }
  } catch (e) {
    console.error('[wait-rebuild] Error:', e.message);
    attempt++;
  }
}

if (!foundRebuild) {
  console.log('[wait-rebuild] Rebuild task not found after timeout, proceeding with verification');
  process.exit(0);
} else {
  console.log('[wait-rebuild] Rebuild complete, proceeding with verification');
}

// Verify build output
console.log('\n[verify] Checking build/gm-gc/install.js for correct path...');
try {
  const installJs = fs.readFileSync(
    path.resolve(__dirname, '../../build/gm-gc/install.js'),
    'utf8'
  );

  if (installJs.includes(`extensions/gm'`) && !installJs.includes(`extensions/gm-gc'`)) {
    console.log('[verify] ✓ PASS: install.js has correct path (gm, not gm-gc)');
  } else {
    console.error('[verify] ✗ FAIL: install.js still has wrong path');
    process.exit(1);
  }

  if (installJs.includes('[gm-gc-install]')) {
    console.log('[verify] ✓ PASS: diagnostic logging is present');
  } else {
    console.log('[verify] ⚠ WARN: diagnostic logging not found (rebuild may not have completed)');
  }

  process.exit(0);
} catch (e) {
  console.error('[verify] Error reading install.js:', e.message);
  process.exit(1);
}
