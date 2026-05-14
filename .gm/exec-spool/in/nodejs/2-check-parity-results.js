const fs = require('fs');
const path = require('path');
const os = require('os');

try {
  const spoolOut = 'C:\\dev\\gm\\.gm\\exec-spool\\out';
  const files = fs.readdirSync(spoolOut);

  console.log(`\nFiles in spool/out: ${files.length} items`);

  const jsonFiles = files.filter(f => f.endsWith('.json')).sort();
  console.log(`\nJSON metadata files:`);
  jsonFiles.forEach(f => console.log(`  ${f}`));

  const outFiles = files.filter(f => f.endsWith('.out')).sort();
  console.log(`\nOutput files:`);
  outFiles.forEach(f => console.log(`  ${f}`));

  if (jsonFiles.length > 0) {
    const lastJson = jsonFiles[jsonFiles.length - 1];
    const metadata = JSON.parse(fs.readFileSync(path.join(spoolOut, lastJson), 'utf8'));
    console.log(`\nMost recent task (${lastJson}):`);
    console.log(`  exitCode: ${metadata.exitCode}`);
    console.log(`  durationMs: ${metadata.durationMs}`);
    console.log(`  ok: ${metadata.ok}`);

    const correspondingOut = lastJson.replace('.json', '.out');
    if (fs.existsSync(path.join(spoolOut, correspondingOut))) {
      const output = fs.readFileSync(path.join(spoolOut, correspondingOut), 'utf8');
      console.log(`\nOutput (first 1000 chars):`);
      console.log(output.slice(0, 1000));
    }
  }

  console.log(`\n\nSearching for parity test results...`);
  const tmpRoot = path.dirname(os.tmpdir());
  const globPattern = path.join(os.tmpdir(), 'gm-parity-test-*');

  const tmpDir = os.tmpdir();
  const entries = fs.readdirSync(tmpDir);
  const parityDirs = entries.filter(e => e.startsWith('gm-parity-test-'));

  if (parityDirs.length > 0) {
    console.log(`Found ${parityDirs.length} parity test directories`);
    const newest = parityDirs.sort().reverse()[0];
    const resultsPath = path.join(tmpDir, newest, 'parity-results.json');

    if (fs.existsSync(resultsPath)) {
      const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
      console.log(`\nParity test results (${newest}):`);
      console.log(JSON.stringify(results.comparison.summary, null, 2));

      if (results.comparison.divergences.length > 0) {
        console.log(`\nDivergences found: ${results.comparison.divergences.length}`);
        results.comparison.divergences.forEach(d => console.log(`  - ${d}`));
      }
    }
  } else {
    console.log('No parity test directories found in tmpdir');
  }

} catch (err) {
  console.error(`Error: ${err.message}`);
  process.exit(1);
}
