const fs = require('fs');
const path = require('path');
const os = require('os');

try {
  const spoolDir = path.join(os.homedir(), '.claude', 'exec-spool');
  const outDir = path.join(spoolDir, 'out');

  const files = fs.readdirSync(outDir);
  const jsonFiles = files.filter(f => f.endsWith('.json')).map(f => parseInt(f.split('.')[0])).sort((a, b) => b - a);

  console.log('[list-outputs] Recent task IDs (newest first):');
  jsonFiles.slice(0, 30).forEach(id => {
    const jsonPath = path.join(outDir, `${id}.json`);
    const outPath = path.join(outDir, `${id}.out`);

    try {
      const json = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      const outExists = fs.existsSync(outPath);
      const outSize = outExists ? fs.statSync(outPath).size : 0;

      // Read first line of output to identify task
      let taskName = '?';
      if (outExists) {
        const firstLine = fs.readFileSync(outPath, 'utf8').split('\n')[0];
        if (firstLine.includes('[')) {
          const match = firstLine.match(/\[(.*?)\]/);
          if (match) taskName = match[1];
        }
      }

      console.log(`  ${id}: ${taskName} (exit=${json.exitCode}, ${outSize} bytes, lang=${json.lang})`);
    } catch (e) {
      console.log(`  ${id}: error reading metadata`);
    }
  });
} catch (e) {
  console.error('[list-outputs] Error:', e.message);
  process.exit(1);
}
