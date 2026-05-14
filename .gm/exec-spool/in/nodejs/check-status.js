const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '../../exec-spool/out');
try {
  const files = fs.readdirSync(outDir).sort();
  console.log('[status] Files in .gm/exec-spool/out/:');
  files.forEach(f => console.log(`  ${f}`));

  // Check for rebuild output
  const rebuildOut = files.find(f => f.includes('rebuild') && f.endsWith('.json'));
  if (rebuildOut) {
    const meta = JSON.parse(fs.readFileSync(path.join(outDir, rebuildOut), 'utf8'));
    console.log('[rebuild] Task metadata:', JSON.stringify(meta, null, 2));

    const outFile = rebuildOut.replace('.json', '.out');
    if (fs.existsSync(path.join(outDir, outFile))) {
      const content = fs.readFileSync(path.join(outDir, outFile), 'utf8');
      console.log('[rebuild] Output (last 1000 chars):', content.slice(-1000));
    }
  } else {
    console.log('[status] No rebuild task found yet; spool may still be processing');
  }
} catch (e) {
  console.error('[status] Error:', e.message);
  process.exit(1);
}
