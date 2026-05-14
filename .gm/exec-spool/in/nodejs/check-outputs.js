const fs = require('fs');
const path = require('path');
const os = require('os');

try {
  const spoolDir = path.join(os.homedir(), '.claude', 'exec-spool');
  const outDir = path.join(spoolDir, 'out');

  console.log('[check-outputs] Checking spool outputs...');
  console.log('[check-outputs] Spool directory:', spoolDir);
  console.log('[check-outputs] Out directory:', outDir);

  if (!fs.existsSync(outDir)) {
    console.log('[check-outputs] Out directory does not exist yet');
  } else {
    const files = fs.readdirSync(outDir);
    console.log('[check-outputs] Files in out/:');
    files.forEach(f => {
      const fullPath = path.join(outDir, f);
      const stat = fs.statSync(fullPath);
      console.log('  ' + f + ' (' + stat.size + ' bytes)');
    });

    // Try to read some outputs
    const jsonFiles = files.filter(f => f.endsWith('.json')).slice(0, 5);
    console.log('[check-outputs] Recent completions:');
    jsonFiles.forEach(f => {
      try {
        const content = JSON.parse(fs.readFileSync(path.join(outDir, f), 'utf8'));
        console.log('  ' + f + ': exitCode=' + content.exitCode);
      } catch (e) {
        console.log('  ' + f + ': parse error');
      }
    });
  }

  // Check input queue
  const inDir = path.join(spoolDir, 'in');
  console.log('[check-outputs] Checking input queue...');
  if (fs.existsSync(inDir)) {
    const langs = fs.readdirSync(inDir);
    langs.forEach(lang => {
      const count = fs.readdirSync(path.join(inDir, lang)).length;
      console.log('  ' + lang + ': ' + count + ' pending');
    });
  }

  console.log('[check-outputs] Status check complete');
} catch (e) {
  console.error('[check-outputs] Error:', e.message);
  process.exit(1);
}
