const fs = require('fs');
const path = require('path');

const outDir = 'C:\\dev\\gm\\.gm\\exec-spool\\out';

try {
  console.log('=== CHECKING WITNESS OUTPUTS ===\n');

  const files = fs.readdirSync(outDir).filter(f => !f.startsWith('.')).sort();

  console.log(`Found ${files.length} files in .gm/exec-spool/out/:\n`);

  files.slice(-15).forEach(f => {
    const fullPath = path.join(outDir, f);
    const stat = fs.statSync(fullPath);
    const sizeKb = (stat.size / 1024).toFixed(2);
    console.log(`  ${f} (${sizeKb} KB)`);
  });

  console.log('\nChecking for witness probe outputs:');

  const probe9Out = path.join(outDir, '9-witness-e2e-infrastructure.out');
  const probe10Out = path.join(outDir, '10-witness-docs-ready.out');

  console.log(`  9-witness-e2e-infrastructure.out: ${fs.existsSync(probe9Out) ? 'READY' : 'PENDING'}`);
  console.log(`  10-witness-docs-ready.out: ${fs.existsSync(probe10Out) ? 'READY' : 'PENDING'}`);

  if (fs.existsSync(probe9Out)) {
    const content = fs.readFileSync(probe9Out, 'utf8');
    console.log('\n--- Probe 9 output (last 500 chars) ---');
    console.log(content.slice(-500));
  }

  if (fs.existsSync(probe10Out)) {
    const content = fs.readFileSync(probe10Out, 'utf8');
    console.log('\n--- Probe 10 output (last 500 chars) ---');
    console.log(content.slice(-500));
  }
} catch (err) {
  console.error(`Error: ${err.message}`);
}
