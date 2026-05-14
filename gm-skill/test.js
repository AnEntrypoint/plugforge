const fs = require('fs');
const path = require('path');
const os = require('os');
const assert = require('assert');
const { spool } = require('./index.js');

const testDir = path.join(os.tmpdir(), 'gm-skill-test');

function cleanup() {
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
}

async function runTests() {
  cleanup();
  fs.mkdirSync(testDir, { recursive: true });
  process.chdir(testDir);

  console.log('Testing spool.writeSpool...');
  const writeResult = spool.writeSpool('console.log("test output")', 'nodejs');
  assert(writeResult.id, 'writeSpool returns id');
  assert(writeResult.path, 'writeSpool returns path');
  assert(writeResult.lang === 'nodejs', 'writeSpool returns correct lang');
  assert(writeResult.ext === 'js', 'writeSpool returns correct ext');
  assert(fs.existsSync(writeResult.path), 'spool file created on disk');
  const fileContent = fs.readFileSync(writeResult.path, 'utf-8');
  assert(fileContent.includes('console.log("test output")'), 'spool file contains body');
  console.log('✓ writeSpool works');

  console.log('\nTesting spool.readSpoolOutput (empty case)...');
  const nonExistentId = 'does-not-exist';
  const emptyRead = spool.readSpoolOutput(nonExistentId);
  assert.strictEqual(emptyRead.id, nonExistentId, 'readSpoolOutput returns id');
  assert.strictEqual(emptyRead.stdout, '', 'readSpoolOutput returns empty stdout when no output');
  assert.strictEqual(emptyRead.stderr, '', 'readSpoolOutput returns empty stderr when no output');
  assert(emptyRead.metadata, 'readSpoolOutput returns metadata object');
  console.log('✓ readSpoolOutput handles missing files gracefully');

  console.log('\nTesting spool.getAllOutputs...');
  const baseDir = spool.getSpoolBaseDir();
  const outDir = path.join(baseDir, 'out');
  fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, 'task1.out'), 'output1');
  fs.writeFileSync(path.join(outDir, 'task1.json'), JSON.stringify({ exitCode: 0 }));
  fs.writeFileSync(path.join(outDir, 'task2.err'), 'error2');
  fs.writeFileSync(path.join(outDir, 'task2.json'), JSON.stringify({ exitCode: 1 }));

  const allOutputs = spool.getAllOutputs();
  assert(allOutputs.length === 2, 'getAllOutputs returns 2 tasks');
  const ids = allOutputs.map(o => o.id).sort();
  assert(ids.includes('task1') && ids.includes('task2'), 'getAllOutputs returns correct task ids');
  const task1 = allOutputs.find(o => o.id === 'task1');
  assert(task1.stdout === 'output1', 'getAllOutputs includes stdout');
  const task2 = allOutputs.find(o => o.id === 'task2');
  assert(task2.stderr === 'error2', 'getAllOutputs includes stderr');
  console.log('✓ getAllOutputs enumerates completed tasks');

  console.log('\nTesting spool.waitForCompletion (timeout)...');
  const timeoutResult = await spool.waitForCompletion('instant-timeout', 100);
  assert(timeoutResult.timedOut === true, 'waitForCompletion times out gracefully');
  assert(timeoutResult.ok === false, 'waitForCompletion returns ok:false on timeout');
  console.log('✓ waitForCompletion respects timeout');

  console.log('\nTesting spool helpers with different languages...');
  const pyResult = spool.writeSpool('print("hello")', 'python');
  assert(pyResult.ext === 'py', 'writeSpool maps python to .py');
  const tsResult = spool.writeSpool('console.log()', 'typescript');
  assert(tsResult.ext === 'ts', 'writeSpool maps typescript to .ts');
  const bashResult = spool.writeSpool('echo hello', 'bash');
  assert(bashResult.ext === 'sh', 'writeSpool maps bash to .sh');
  console.log('✓ writeSpool handles language variants');

  console.log('\nTesting platform-aware paths...');
  const baseDir2 = spool.getSpoolBaseDir();
  assert(baseDir2, 'getSpoolBaseDir returns a path');
  assert(baseDir2.includes('.gm'), 'spool path contains .gm directory');
  console.log('✓ Platform paths are set correctly');

  process.chdir(__dirname);
  cleanup();
  console.log('\n✓✓✓ All tests passed ✓✓✓');
}

runTests().catch(e => {
  process.chdir(__dirname);
  console.error('Test failed:', e.message);
  cleanup();
  process.exit(1);
});
