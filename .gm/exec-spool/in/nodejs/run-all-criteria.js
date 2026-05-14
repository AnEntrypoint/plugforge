const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const { spawn } = require('child_process');

const cwd = process.cwd();
const resultsFile = path.join(cwd, '.gm', 'exec-spool', 'validation-results.json');

const criteria = [
  'criterion-1-mutables-count.js',
  'criterion-2-evidence.js',
  'criterion-3-agents.js',
  'criterion-4-hooks.js',
  'criterion-5-spool.js',
  'criterion-6-daemon.js'
];

console.log('Starting parallel criterion validation...\n');

let completed = 0;
const results = {};

criteria.forEach(criterion => {
  const scriptPath = path.join(cwd, '.gm', 'exec-spool', 'in', 'nodejs', criterion);

  const proc = spawn('node', [scriptPath], { cwd });
  let output = '';
  let errorOutput = '';

  proc.stdout.on('data', (data) => {
    output += data.toString();
    console.log(data.toString());
  });

  proc.stderr.on('data', (data) => {
    errorOutput += data.toString();
    console.error(data.toString());
  });

  proc.on('close', (code) => {
    completed++;
    results[criterion] = {
      exitCode: code,
      output: output,
      error: errorOutput
    };

    if (completed === criteria.length) {
      console.log('\n\n=== VALIDATION COMPLETE ===\n');

      const c1Pass = results['criterion-1-mutables-count.js'].output.includes('CRITERION 1 PASS: true');
      const c2Pass = results['criterion-2-evidence.js'].output.includes('CRITERION 2 PASS: true');
      const c3Pass = results['criterion-3-agents.js'].output.includes('CRITERION 3 PASS: true');
      const c4Pass = results['criterion-4-hooks.js'].output.includes('CRITERION 4 PASS: true');
      const c5Pass = results['criterion-5-spool.js'].output.includes('CRITERION 5 PASS: true');
      const c6Pass = results['criterion-6-daemon.js'].output.includes('CRITERION 6 PASS: true');

      console.log(`Criterion 1 (mutables count): ${c1Pass ? 'PASS' : 'FAIL'}`);
      console.log(`Criterion 2 (evidence): ${c2Pass ? 'PASS' : 'FAIL'}`);
      console.log(`Criterion 3 (agents): ${c3Pass ? 'PASS' : 'FAIL'}`);
      console.log(`Criterion 4 (hooks): ${c4Pass ? 'PASS' : 'FAIL'}`);
      console.log(`Criterion 5 (spool): ${c5Pass ? 'PASS' : 'FAIL'}`);
      console.log(`Criterion 6 (daemon): ${c6Pass ? 'PASS' : 'FAIL'}`);

      const allPass = c1Pass && c2Pass && c3Pass && c4Pass && c5Pass && c6Pass;
      console.log(`\n=== ALL CRITERIA: ${allPass ? 'PASS ✓' : 'FAIL ✗'} ===`);

      fs.writeFileSync(resultsFile, JSON.stringify({
        allPass,
        criteria: { c1: c1Pass, c2: c2Pass, c3: c3Pass, c4: c4Pass, c5: c5Pass, c6: c6Pass },
        timestamp: new Date().toISOString()
      }, null, 2));

      process.exit(allPass ? 0 : 1);
    }
  });
});
